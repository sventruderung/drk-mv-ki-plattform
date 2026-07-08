"""Connector-Service :8004 — Registry + Ausführungs-Proxy (Gesamtkonzept §3.3).

Verwaltungs- und Ausführungsteil der Connector-Registry. Der Tool-Layer nutzt
/available und /invoke; die Verwaltungs-Endpunkte pflegt die Admin-Console.

AUTH (Mono-Pilot): Die Verwaltungs-Endpunkte sind hier nicht eigenständig
geschützt — der Zugang läuft über das api-gateway (JWT, kv-admin). tenant_id
stammt im Pilot aus dem Header X-Tenant-ID; produktiv aus validiertem JWT.
"""

import logging
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Header, HTTPException, Path
from fastapi.responses import StreamingResponse

from .logging_conf import configure_logging
from .models import (
    AvailableCapability,
    Connector,
    ConnectorIn,
    InvokeRequest,
)
from .registry import ConnectorNotFound, registry
from .seed import seed_registry

configure_logging()
logger = logging.getLogger("connector-service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_registry()
    logger.info("connector-service.startup")
    yield


app = FastAPI(title="Connector-Service (Registry)", version="0.1.0", lifespan=lifespan)


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


# ── Verwaltung — Lebenszyklus ────────────────────────────────────────────────

@app.post("/api/v1/connectors", response_model=Connector, status_code=201)
async def register_connector(data: ConnectorIn) -> Connector:
    c = registry.register(data)
    logger.info("register", extra={"connector_id": c.id, "status": c.status})
    return c


@app.get("/api/v1/connectors", response_model=list[Connector])
async def list_connectors(
    x_tenant_id: str | None = Header(default=None, alias="X-Tenant-ID"),
) -> list[Connector]:
    return registry.list_connectors(x_tenant_id)


@app.put("/api/v1/connectors/{connector_id}", response_model=Connector)
async def configure_connector(data: ConnectorIn, connector_id: str = Path(...)) -> Connector:
    try:
        c = registry.configure(connector_id, data)
    except ConnectorNotFound:
        raise HTTPException(status_code=404, detail="Unbekannter Connector")
    logger.info("configure", extra={"connector_id": c.id, "status": c.status})
    return c


@app.post("/api/v1/connectors/{connector_id}/health")
async def health_connector(connector_id: str = Path(...)) -> dict[str, str]:
    try:
        c = registry.get(connector_id)
    except ConnectorNotFound:
        raise HTTPException(status_code=404, detail="Unbekannter Connector")
    url = c.invoke_base_url.rstrip("/") + c.health_path
    try:
        async with httpx.AsyncClient(timeout=5.0) as http:
            resp = await http.get(url)
        ok = resp.status_code == 200
    except httpx.HTTPError:
        ok = False
    status = "healthy" if ok else "unreachable"
    logger.info("health", extra={"connector_id": c.id, "status": status})
    return {"connector_id": c.id, "status": status}


@app.post("/api/v1/connectors/{connector_id}/tenants/{tenant_id}", response_model=Connector)
async def activate_for_tenant(connector_id: str = Path(...), tenant_id: str = Path(...)) -> Connector:
    try:
        c = registry.activate(connector_id, tenant_id)
    except ConnectorNotFound:
        raise HTTPException(status_code=404, detail="Unbekannter Connector")
    logger.info("activate", extra={"connector_id": c.id, "tenant_id": tenant_id})
    return c


@app.delete("/api/v1/connectors/{connector_id}/tenants/{tenant_id}", response_model=Connector)
async def deactivate_for_tenant(connector_id: str = Path(...), tenant_id: str = Path(...)) -> Connector:
    try:
        c = registry.deactivate(connector_id, tenant_id)
    except ConnectorNotFound:
        raise HTTPException(status_code=404, detail="Unbekannter Connector")
    logger.info("deactivate", extra={"connector_id": c.id, "tenant_id": tenant_id})
    return c


# ── Ausführung — Tool-Layer ──────────────────────────────────────────────────

@app.get("/api/v1/connectors/available", response_model=list[AvailableCapability])
async def available(
    x_tenant_id: str = Header(..., alias="X-Tenant-ID"),
) -> list[AvailableCapability]:
    """Für den Tenant freigegebene Capabilities (Tool-Definitionen)."""
    return registry.available(x_tenant_id)


@app.post("/api/v1/connectors/{connector_id}/invoke")
async def invoke(
    req: InvokeRequest,
    connector_id: str = Path(...),
    x_tenant_id: str = Header(..., alias="X-Tenant-ID"),
) -> dict:
    """Capability ausführen: Tenant-Prüfung, dann Proxy an den Adapter.

    TENANT-ISOLATION: nur erlaubt, wenn der Connector für diesen Tenant aktiv ist
    und die Capability anbietet.
    """
    try:
        c = registry.get(connector_id)
    except ConnectorNotFound:
        raise HTTPException(status_code=404, detail="Unbekannter Connector")

    if x_tenant_id not in c.tenants:
        raise HTTPException(status_code=404, detail="Unbekannter Connector")
    if req.capability not in {cap.name for cap in c.capabilities}:
        raise HTTPException(status_code=400, detail="Unbekannte Capability")

    url = c.invoke_base_url.rstrip("/") + f"/api/v1/connectors/{connector_id}/invoke"
    try:
        async with httpx.AsyncClient(timeout=30.0) as http:
            resp = await http.post(
                url,
                json=req.model_dump(),
                headers={"X-Tenant-ID": x_tenant_id},
            )
        resp.raise_for_status()
    except httpx.HTTPError:
        logger.info("invoke", extra={"connector_id": c.id, "tenant_id": x_tenant_id, "status": "adapter_error"})
        raise HTTPException(status_code=502, detail="Connector derzeit nicht verfügbar")

    logger.info(
        "invoke",
        extra={"connector_id": c.id, "tenant_id": x_tenant_id, "capability": req.capability, "status": "ok"},
    )
    return resp.json()


@app.get("/api/v1/connectors/{connector_id}/file/{file_id}")
async def get_file(
    connector_id: str = Path(...),
    file_id: str = Path(...),
    x_tenant_id: str = Header(..., alias="X-Tenant-ID"),
) -> StreamingResponse:
    """Dokumentinhalt tenant-geprüft vom Adapter durchreichen (read-only, Stream)."""
    try:
        c = registry.get(connector_id)
    except ConnectorNotFound:
        raise HTTPException(status_code=404, detail="Unbekannter Connector")
    if x_tenant_id not in c.tenants:
        raise HTTPException(status_code=404, detail="Unbekannter Connector")

    url = c.invoke_base_url.rstrip("/") + f"/api/v1/connectors/{connector_id}/file/{file_id}"
    client = httpx.AsyncClient(timeout=120.0)
    try:
        req = client.build_request("GET", url, headers={"X-Tenant-ID": x_tenant_id})
        resp = await client.send(req, stream=True)
    except httpx.HTTPError:
        await client.aclose()
        logger.info("file", extra={"connector_id": c.id, "tenant_id": x_tenant_id, "status": "adapter_error"})
        raise HTTPException(status_code=502, detail="Connector derzeit nicht verfügbar")
    if resp.status_code != 200:
        code = resp.status_code
        await resp.aclose()
        await client.aclose()
        raise HTTPException(status_code=code, detail="Dokument nicht abrufbar")

    async def body():
        try:
            async for chunk in resp.aiter_raw():
                yield chunk
        finally:
            await resp.aclose()
            await client.aclose()

    logger.info("file", extra={"connector_id": c.id, "tenant_id": x_tenant_id, "status": "ok"})
    return StreamingResponse(
        body(),
        media_type=resp.headers.get("content-type", "application/octet-stream"),
        headers={"Content-Disposition": resp.headers.get("content-disposition", "inline")},
    )
