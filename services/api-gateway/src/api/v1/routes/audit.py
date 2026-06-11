"""Audit-Protokoll einsehen — nur Mandanten-Admins (kv-admin)."""

from fastapi import APIRouter, HTTPException, Request

from ....db import tenant_connection

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/")
async def list_audit(request: Request, limit: int = 200):
    if "kv-admin" not in request.state.roles:
        raise HTTPException(
            status_code=403, detail="Rolle 'kv-admin' erforderlich."
        )
    async with tenant_connection(request.state.tenant_id) as conn:
        rows = await conn.fetch(
            """
            SELECT actor, action, object_type, object_id, info, created_at
            FROM audit_log ORDER BY created_at DESC LIMIT $1
            """,
            min(limit, 1000),
        )
    return [dict(r) for r in rows]
