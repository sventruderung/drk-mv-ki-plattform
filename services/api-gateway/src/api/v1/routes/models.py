"""Modell-Katalog und Nutzer-Freigaben.

- GET  /models          → Modelle, die der angemeldete Nutzer verwenden darf
- GET  /models/public   → aktivierte Modelle (nur IDs/Namen, für Open-WebUI-Pipe)
- GET  /models/admin    → kompletter Katalog (kv-admin)
- PUT  /models/{id}     → aktivieren + für-alle-Schalter (kv-admin, auditiert)
- PUT  /users/{uid}/models → individuelle Freigaben (kv-admin, auditiert)

COMPLIANCE: Externe Modelle übertragen Eingaben an Drittanbieter — die
Aktivierung setzt die DSB-Freigabe voraus (Warnhinweis im UI).
"""

import asyncio
import json
import re

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from drk_shared.logging import get_logger

from ....db import plain_connection, tenant_connection

logger = get_logger(__name__)
router = APIRouter(tags=["models"])

# Fortschritt des laufenden Ollama-Downloads. api-gateway läuft als einzelner
# Prozess (ein uvicorn-Worker), daher genügt ein Modul-globaler Zustand.
_PULL: dict = {"model": None, "status": "", "percent": 0, "done": True, "error": None}
# Ollama-Modellnamen: Buchstaben/Ziffern plus . _ : / - (z.B. qwen3:14b)
_NAME_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,99}$")


def require_kv_admin(request: Request) -> None:
    if "kv-admin" not in request.state.roles:
        raise HTTPException(status_code=403, detail="Rolle 'kv-admin' erforderlich.")


async def user_may_use(user_id: str, model_id: str) -> bool:
    async with plain_connection() as conn:
        row = await conn.fetchrow(
            """
            SELECT 1 FROM ai_models m
            WHERE m.id = $1 AND m.enabled
              AND (m.default_allowed
                   OR EXISTS (SELECT 1 FROM user_model_access a
                              WHERE a.model_id = m.id AND a.user_id = $2))
            """,
            model_id, user_id,
        )
    return row is not None


@router.get("/models")
async def list_my_models(request: Request):
    async with plain_connection() as conn:
        rows = await conn.fetch(
            """
            SELECT m.id, m.provider, m.display_name
            FROM ai_models m
            WHERE m.enabled
              AND (m.default_allowed
                   OR EXISTS (SELECT 1 FROM user_model_access a
                              WHERE a.model_id = m.id AND a.user_id = $1))
            ORDER BY m.provider = 'local' DESC, m.display_name
            """,
            request.state.user_id,
        )
    return [dict(r) for r in rows]


@router.get("/models/public")
async def list_enabled_models():
    """Nur aktivierte Modelle (IDs + Namen) — für die Pipe-Registrierung.
    Keine Auth: enthält keine sensiblen Daten; Nutzung wird pro Anfrage geprüft."""
    async with plain_connection() as conn:
        rows = await conn.fetch(
            "SELECT id, provider, display_name FROM ai_models WHERE enabled ORDER BY display_name"
        )
    return [dict(r) for r in rows]


async def _ollama_names(base: str) -> set[str]:
    """Namen der in Ollama installierten Modelle (leer bei Nichterreichbarkeit)."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{base}/api/tags")
        resp.raise_for_status()
        return {m["name"] for m in resp.json().get("models", [])}
    except httpx.HTTPError:
        return set()


@router.get("/models/admin")
async def list_all_models(request: Request):
    require_kv_admin(request)
    async with plain_connection() as conn:
        rows = await conn.fetch(
            "SELECT id, provider, display_name, enabled, default_allowed "
            "FROM ai_models ORDER BY provider = 'local' DESC, display_name"
        )
    installed = await _ollama_names(request.app.state.settings.ollama_base_url)
    out = []
    for r in rows:
        d = dict(r)
        if d["provider"] == "local":
            # Katalog-ID vs. Ollama-Tag: 'llama3.3' passt auf 'llama3.3:latest',
            # 'qwen3:32b' passt exakt.
            d["installed"] = d["id"] in installed or f"{d['id']}:latest" in installed
        else:
            d["installed"] = None  # extern: nicht zutreffend
        out.append(d)
    return out


class ModelUpdateRequest(BaseModel):
    enabled: bool
    default_allowed: bool


@router.put("/models/{model_id}")
async def update_model(model_id: str, body: ModelUpdateRequest, request: Request):
    require_kv_admin(request)
    async with plain_connection() as conn:
        row = await conn.fetchrow(
            """
            UPDATE ai_models SET enabled = $2, default_allowed = $3
            WHERE id = $1 RETURNING provider, display_name
            """,
            model_id, body.enabled, body.default_allowed,
        )
    if row is None:
        raise HTTPException(status_code=404, detail="Modell nicht gefunden.")
    async with tenant_connection(request.state.tenant_id) as conn:
        await conn.execute(
            """
            INSERT INTO audit_log (tenant_id, actor, action, object_type, object_id, info)
            VALUES ($1, $2, 'model.config', 'model', $3, $4)
            """,
            request.state.tenant_id, request.state.user_id or "", model_id,
            f"{row['display_name']} | aktiv: {body.enabled} | für alle: {body.default_allowed}"
            + (" | EXTERNER PROVIDER" if row["provider"] != "local" else ""),
        )
    return {"id": model_id, "enabled": body.enabled, "default_allowed": body.default_allowed}


# ── Lokale Modelle herunterladen (Ollama) ───────────────────────────────────
# COMPLIANCE: betrifft nur LOKALE Modelle (provider='local'); Dokumenteninhalte
# verlassen das System nie. Externe Modelle werden hier nicht angelegt.

@router.get("/models/ollama/installed")
async def ollama_installed(request: Request):
    """Auf dem Server installierte Ollama-Modelle + ob sie schon im Katalog sind."""
    require_kv_admin(request)
    base = request.app.state.settings.ollama_base_url
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{base}/api/tags")
        resp.raise_for_status()
        installed = [m["name"] for m in resp.json().get("models", [])]
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Ollama nicht erreichbar: {type(e).__name__}")
    async with plain_connection() as conn:
        rows = await conn.fetch("SELECT id FROM ai_models WHERE provider = 'local'")
    in_catalog = {r["id"] for r in rows}
    return [{"name": n, "in_catalog": n in in_catalog} for n in sorted(installed)]


class PullRequest(BaseModel):
    name: str


async def _do_pull(base: str, name: str, tenant_id: str, user_id: str) -> None:
    """Lädt ein Modell über die Ollama-Pull-API (NDJSON-Stream) und nimmt es
    danach in den Katalog auf (deaktiviert — Aktivierung bewusst durch Admin)."""
    global _PULL
    _PULL = {"model": name, "status": "Lade Manifest …", "percent": 0,
             "done": False, "error": None}
    try:
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream(
                "POST", f"{base}/api/pull", json={"model": name, "stream": True}
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        d = json.loads(line)
                    except ValueError:
                        continue
                    if d.get("error"):
                        _PULL.update(error=d["error"], done=True, status="Fehler")
                        logger.info("model.pull.error", model=name, error=d["error"])
                        return
                    if d.get("total"):
                        _PULL["percent"] = round((d.get("completed") or 0) / d["total"] * 100)
                    _PULL["status"] = d.get("status", "")
    except httpx.HTTPError as e:
        _PULL.update(error=type(e).__name__, done=True, status="Fehler")
        logger.info("model.pull.failed", model=name, error=type(e).__name__)
        return

    # Erfolg: in den Katalog aufnehmen (aktiv/Freigabe setzt der Admin separat)
    async with plain_connection() as conn:
        await conn.execute(
            """INSERT INTO ai_models (id, provider, display_name, enabled, default_allowed)
               VALUES ($1, 'local', $1, false, false) ON CONFLICT (id) DO NOTHING""",
            name,
        )
    _PULL.update(status="Fertig", percent=100, done=True)
    logger.info("model.pull.done", model=name)
    try:
        async with tenant_connection(tenant_id) as conn:
            await conn.execute(
                """INSERT INTO audit_log (tenant_id, actor, action, object_type, object_id, info)
                   VALUES ($1, $2, 'model.pull', 'model', $3, $4)""",
                tenant_id, user_id or "", name, f"Lokales Modell geladen: {name}",
            )
    except Exception:  # noqa: BLE001 — Audit darf den Download-Erfolg nicht kippen
        pass


@router.post("/models/ollama/pull")
async def ollama_pull(body: PullRequest, request: Request):
    """Startet den Download im Hintergrund (Fortschritt via /pull/status)."""
    require_kv_admin(request)
    name = body.name.strip()
    if not _NAME_RE.match(name):
        raise HTTPException(
            status_code=422,
            detail="Ungültiger Modellname (erlaubt: Buchstaben, Ziffern, . _ : / -).",
        )
    if not _PULL["done"]:
        raise HTTPException(status_code=409, detail=f"Es läuft bereits ein Download ({_PULL['model']}).")
    base = request.app.state.settings.ollama_base_url
    asyncio.create_task(
        _do_pull(base, name, request.state.tenant_id, request.state.user_id)
    )
    return {"started": True, "model": name}


@router.get("/models/ollama/pull/status")
async def ollama_pull_status(request: Request):
    require_kv_admin(request)
    return _PULL


class UserModelsRequest(BaseModel):
    models: list[str]


@router.get("/users/{user_id}/models")
async def get_user_models(user_id: str, request: Request):
    require_kv_admin(request)
    async with plain_connection() as conn:
        rows = await conn.fetch(
            "SELECT model_id FROM user_model_access WHERE user_id = $1", user_id
        )
    return [r["model_id"] for r in rows]


@router.put("/users/{user_id}/models")
async def set_user_models(user_id: str, body: UserModelsRequest, request: Request):
    require_kv_admin(request)
    async with plain_connection() as conn:
        valid = {
            r["id"] for r in await conn.fetch("SELECT id FROM ai_models WHERE enabled")
        }
        models = sorted(set(body.models) & valid)
        async with conn.transaction():
            await conn.execute(
                "DELETE FROM user_model_access WHERE user_id = $1", user_id
            )
            for m in models:
                await conn.execute(
                    "INSERT INTO user_model_access (user_id, model_id) VALUES ($1, $2)",
                    user_id, m,
                )
    async with tenant_connection(request.state.tenant_id) as conn:
        await conn.execute(
            """
            INSERT INTO audit_log (tenant_id, actor, action, object_type, object_id, info)
            VALUES ($1, $2, 'user.models', 'user', $3, $4)
            """,
            request.state.tenant_id, request.state.user_id or "", user_id,
            f"Freigegebene Modelle: {', '.join(models) or '(nur Standard)'}",
        )
    return {"user_id": user_id, "models": models}
