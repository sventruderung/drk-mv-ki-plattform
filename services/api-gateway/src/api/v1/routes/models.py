"""Modell-Katalog und Nutzer-Freigaben.

- GET  /models          → Modelle, die der angemeldete Nutzer verwenden darf
- GET  /models/public   → aktivierte Modelle (nur IDs/Namen, für Open-WebUI-Pipe)
- GET  /models/admin    → kompletter Katalog (kv-admin)
- PUT  /models/{id}     → aktivieren + für-alle-Schalter (kv-admin, auditiert)
- PUT  /users/{uid}/models → individuelle Freigaben (kv-admin, auditiert)

COMPLIANCE: Externe Modelle übertragen Eingaben an Drittanbieter — die
Aktivierung setzt die DSB-Freigabe voraus (Warnhinweis im UI).
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from ....db import plain_connection, tenant_connection

router = APIRouter(tags=["models"])


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


@router.get("/models/admin")
async def list_all_models(request: Request):
    require_kv_admin(request)
    async with plain_connection() as conn:
        rows = await conn.fetch(
            "SELECT id, provider, display_name, enabled, default_allowed "
            "FROM ai_models ORDER BY provider = 'local' DESC, display_name"
        )
    return [dict(r) for r in rows]


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
