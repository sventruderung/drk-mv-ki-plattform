"""Systemstatus für das Verwaltungs-UI — Setup- und Betriebs-Checks (kv-admin).

collect_checks() wird auch vom Hintergrund-Monitor (monitor.py) genutzt.
"""

import asyncio
import shutil

from fastapi import APIRouter, HTTPException, Request
import httpx

from ....db import plain_connection
from ....keycloak_admin import KeycloakAdmin, KeycloakAdminError

router = APIRouter(prefix="/system", tags=["system"])

REQUIRED_MODELS = ["qwen3:32b", "nomic-embed-text"]
DISK_WARN_FREE_GB = 50  # Warnen, wenn weniger frei (Modelle + DB brauchen Luft)


async def _check_http(name: str, url: str, hint: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(url)
        ok = resp.status_code == 200
        return {"name": name, "ok": ok,
                "detail": "" if ok else f"HTTP {resp.status_code} — {hint}"}
    except httpx.HTTPError as e:
        return {"name": name, "ok": False, "detail": f"{type(e).__name__} — {hint}"}


async def collect_checks(s) -> list[dict]:
    """Alle Betriebs-Checks ausführen (Status-Endpoint + Hintergrund-Monitor)."""
    checks = list(await asyncio.gather(
        _check_http("Wissensbasis (rag-service)", f"{s.rag_service_url}/api/v1/health",
                    "Container prüfen: docker compose ps rag-service"),
        _check_http("Sprachmodell-Dienst (llm-service)", f"{s.llm_service_url}/api/v1/health",
                    "Container prüfen: docker compose ps llm-service"),
        _check_http("Social Media (content-service)", f"{s.content_service_url}/api/v1/health",
                    "Container prüfen: docker compose ps content-service"),
        _check_http("Anmeldung (Keycloak)",
                    f"{s.keycloak_url}/realms/{s.keycloak_realm}/.well-known/openid-configuration",
                    "Keycloak-Container und Realm-Import prüfen"),
        _check_http("Dokumentenspeicher (MinIO)", f"{s.minio_health_url}",
                    "Container prüfen: docker compose ps minio"),
    ))

    # Ollama + Modelle
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{s.ollama_base_url}/api/tags")
        resp.raise_for_status()
        present = [m["name"] for m in resp.json().get("models", [])]
        checks.append({"name": "KI-Laufzeit (Ollama)", "ok": True, "detail": ""})
        for model in REQUIRED_MODELS:
            base = model.split(":")[0]
            ok = any(p.startswith(base) for p in present)
            checks.append({
                "name": f"Modell {model}", "ok": ok,
                "detail": "" if ok else
                f"Fehlt — auf dem Server: docker compose exec ollama ollama pull {model}",
            })
    except httpx.HTTPError:
        checks.append({"name": "KI-Laufzeit (Ollama)", "ok": False,
                       "detail": "Nicht erreichbar — docker compose ps ollama"})

    # Nutzerverwaltung (Service-Account-Rechte)
    try:
        admin = KeycloakAdmin(s)
        await admin._request("GET", "/users?max=1")
        checks.append({"name": "Nutzerverwaltung (Service-Account)", "ok": True, "detail": ""})
    except (KeycloakAdminError, httpx.HTTPError) as e:
        detail = getattr(e, "detail", str(e))
        checks.append({"name": "Nutzerverwaltung (Service-Account)", "ok": False,
                       "detail": f"{detail} — scripts/setup_keycloak.py ausführen"})

    # Festplattenplatz (Overlay-FS zeigt den freien Platz des Hosts)
    usage = shutil.disk_usage("/")
    free_gb = usage.free // (1024 ** 3)
    checks.append({
        "name": "Festplattenplatz",
        "ok": free_gb >= DISK_WARN_FREE_GB,
        "detail": f"{free_gb} GB frei"
        + ("" if free_gb >= DISK_WARN_FREE_GB
           else f" — unter {DISK_WARN_FREE_GB} GB! Alte Backups/Modelle aufräumen"),
    })

    return checks


@router.get("/status")
async def system_status(request: Request):
    if "kv-admin" not in request.state.roles:
        raise HTTPException(status_code=403, detail="Rolle 'kv-admin' erforderlich.")
    checks = await collect_checks(request.app.state.settings)
    return {"ok": all(c["ok"] for c in checks), "checks": checks}


async def _audit_system(request: Request, action: str, info: str) -> None:
    from ....db import tenant_connection

    async with tenant_connection(request.state.tenant_id) as conn:
        await conn.execute(
            """
            INSERT INTO audit_log (tenant_id, actor, action, object_type, object_id, info)
            VALUES ($1, $2, $3, 'system', 'host', $4)
            """,
            request.state.tenant_id, request.state.user_id or "", action, info,
        )


@router.post("/restart-services")
async def restart_services(request: Request):
    """Alle Container des Stacks neu starten (Gateway zuletzt)."""
    if "kv-admin" not in request.state.roles:
        raise HTTPException(status_code=403, detail="Rolle 'kv-admin' erforderlich.")
    from .... import docker_ctl

    await _audit_system(request, "system.restart-services", "Alle Dienste neu gestartet")
    docker_ctl.schedule(docker_ctl.restart_stack)
    return {"ok": True, "hint": "Dienste starten neu — Seite in ca. 1 Minute neu laden."}


@router.post("/reboot")
async def reboot_host(request: Request):
    if "kv-admin" not in request.state.roles:
        raise HTTPException(status_code=403, detail="Rolle 'kv-admin' erforderlich.")
    from .... import docker_ctl

    await _audit_system(request, "system.reboot", "Server-Neustart ausgelöst")
    docker_ctl.schedule(docker_ctl.host_power, "reboot", delay=3.0)
    return {"ok": True, "hint": "Server startet neu — Plattform in ca. 3–5 Minuten wieder erreichbar."}


@router.post("/shutdown")
async def shutdown_host(request: Request):
    if "kv-admin" not in request.state.roles:
        raise HTTPException(status_code=403, detail="Rolle 'kv-admin' erforderlich.")
    from .... import docker_ctl

    await _audit_system(request, "system.shutdown", "Server-Herunterfahren ausgelöst")
    docker_ctl.schedule(docker_ctl.host_power, "poweroff", delay=3.0)
    return {"ok": True, "hint": "Server fährt herunter — Einschalten danach nur am Gerät möglich."}


@router.get("/events")
async def monitor_events(request: Request, limit: int = 50):
    """Letzte Statuswechsel (ausgefallen/wiederhergestellt) — kv-admin."""
    if "kv-admin" not in request.state.roles:
        raise HTTPException(status_code=403, detail="Rolle 'kv-admin' erforderlich.")
    async with plain_connection() as conn:
        rows = await conn.fetch(
            "SELECT check_name, ok, detail, created_at FROM monitor_events "
            "ORDER BY created_at DESC LIMIT $1",
            min(limit, 500),
        )
    return [dict(r) for r in rows]
