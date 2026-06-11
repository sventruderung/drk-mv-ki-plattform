"""Systemstatus für das Verwaltungs-UI — Setup- und Betriebs-Checks (kv-admin)."""

import asyncio

from fastapi import APIRouter, HTTPException, Request
import httpx

from ....keycloak_admin import KeycloakAdmin, KeycloakAdminError

router = APIRouter(prefix="/system", tags=["system"])

REQUIRED_MODELS = ["qwen3:72b", "nomic-embed-text"]


async def _check_http(name: str, url: str, hint: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(url)
        ok = resp.status_code == 200
        return {"name": name, "ok": ok,
                "detail": "" if ok else f"HTTP {resp.status_code} — {hint}"}
    except httpx.HTTPError as e:
        return {"name": name, "ok": False, "detail": f"{type(e).__name__} — {hint}"}


@router.get("/status")
async def system_status(request: Request):
    if "kv-admin" not in request.state.roles:
        raise HTTPException(status_code=403, detail="Rolle 'kv-admin' erforderlich.")
    s = request.app.state.settings

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

    return {"ok": all(c["ok"] for c in checks), "checks": checks}
