"""FastAPI-App des ELO-DMS-Connectors (Adapter, read-only).

Ausführungsteil der Connector-Registry (Gesamtkonzept §3.3):
POST /api/v1/connectors/{connector_id}/invoke

Die ELO-Verbindung kommt aus dem Secret-Store (system_settings), gepflegt in der
Admin-Console. TENANT-ISOLATION (Prototyp): tenant_id kommt aus dem Header
X-Tenant-ID; produktiv aus validiertem JWT.
"""

import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, HTTPException, Path

from . import db
from .capabilities import (
    dokument_suchen,
    dokument_zusammenfassen,
    statistik_dokumente_zaehlen,
)
from .config import CONNECTOR_ID, REQUEST_TIMEOUT_S, EloNotConfigured, get_elo_connection
from .elo_client import EloClient, EloError
from .logging_conf import configure_logging
from .schemas import (
    InvokeRequest,
    InvokeResponse,
    Meta,
    SearchParams,
    StatsParams,
    SummarizeParams,
)

configure_logging()
logger = logging.getLogger("elo-connector")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.init_pool()
    logger.info("elo-connector.startup")
    yield
    await db.close_pool()


app = FastAPI(title="ELO-DMS-Connector", version="0.1.0", lifespan=lifespan)


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    """Liveness-Probe ohne ELO-Abhängigkeit."""
    return {"status": "ok"}


@app.get("/system/masks")
async def system_masks(raw: int = 0):
    """Diagnose (nur Metadaten): Masken + Indexfeld-Namen der ELO-Instanz.

    Damit erheben wir die echten Feldnamen für die Suche/Statistik (Konzept §8).
    ?raw=1 liefert die unveränderte ELO-Antwort.
    """
    conn = await get_elo_connection()
    async with EloClient(conn.base_url, conn.user, conn.password, REQUEST_TIMEOUT_S) as client:
        data = await client.masks()
    if raw:
        return data

    masks = data.get("masks", data) if isinstance(data, dict) else data
    summary = []
    if isinstance(masks, list):
        for m in masks:
            if not isinstance(m, dict):
                continue
            fields = m.get("keywords") or m.get("fields") or m.get("index") or []
            keys = [
                f.get("key") or f.get("name") or f.get("group")
                for f in fields if isinstance(f, dict)
            ]
            summary.append({"id": m.get("id"), "name": m.get("name"), "fields": keys})
    return {"count": len(summary), "summary": summary}


@app.post("/api/v1/connectors/{connector_id}/invoke", response_model=InvokeResponse)
async def invoke(
    req: InvokeRequest,
    connector_id: str = Path(...),
    x_tenant_id: str = Header(..., alias="X-Tenant-ID"),
) -> InvokeResponse:
    """Eine Capability ausführen und normalisiert zurückgeben."""
    if connector_id != CONNECTOR_ID:
        raise HTTPException(status_code=404, detail="Unbekannter Connector")

    request_id = str(uuid.uuid4())
    started = time.monotonic()
    status = "ok"
    try:
        conn = await get_elo_connection()
        async with EloClient(conn.base_url, conn.user, conn.password, REQUEST_TIMEOUT_S) as client:
            if req.capability == "dokument.suchen":
                data = await dokument_suchen(client, SearchParams(**req.params), CONNECTOR_ID)
            elif req.capability == "dokument.zusammenfassen":
                data = await dokument_zusammenfassen(
                    client, SummarizeParams(**req.params), CONNECTOR_ID
                )
            else:  # statistik.dokumente_zaehlen
                data = await statistik_dokumente_zaehlen(
                    client, StatsParams(**req.params), CONNECTOR_ID
                )
    except EloNotConfigured:
        status = "not_configured"
        raise HTTPException(status_code=503, detail="ELO-Verbindung nicht konfiguriert")
    except EloError:
        status = "elo_error"
        raise HTTPException(status_code=502, detail="DMS derzeit nicht verfügbar")
    except HTTPException:
        status = "client_error"
        raise
    finally:
        # COMPLIANCE: nur Metadaten, kein Inhalt.
        logger.info(
            "invoke",
            extra={
                "tenant_id": x_tenant_id,
                "request_id": request_id,
                "capability": req.capability,
                "duration_ms": round((time.monotonic() - started) * 1000),
                "status": status,
            },
        )

    if not data.get("sources"):
        # Zitierpflicht: ohne Quelle keine Rückgabe.
        raise HTTPException(status_code=500, detail="Keine Quellen ermittelbar")

    return InvokeResponse(
        data=data,
        meta=Meta(tenant_id=x_tenant_id, connector_id=CONNECTOR_ID, request_id=request_id),
    )
