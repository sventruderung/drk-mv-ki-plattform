"""Wissensdatenbanken: anlegen, auflisten, löschen (leer), Pipe-Liste.

- GET  /kbs         → KBs des Tenants inkl. Dokumentanzahl (alle Nutzer)
- POST /kbs         → anlegen (kv-admin, auditiert)
- DELETE /kbs/{id}  → löschen, nur wenn leer (kv-admin, auditiert)
- GET  /kbs/public  → id+name für die Open-WebUI-Pipe (ohne Auth;
  enthält nur Namen — Inhalte bleiben rechtegeprüft pro Anfrage)
"""

import uuid

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from ....db import plain_connection, tenant_connection

router = APIRouter(prefix="/kbs", tags=["kbs"])


@router.get("/groups")
async def list_groups(request: Request):
    """Sichtbarkeits-Gruppen (ACL) für UI-Checkboxen — jeder angemeldete Nutzer."""
    from ....branding import ACL_GROUPS

    return ACL_GROUPS


@router.get("/public")
async def list_kbs_public():
    async with plain_connection() as conn:
        rows = await conn.fetch("SELECT id, name FROM knowledge_bases ORDER BY name")
    return [{"id": str(r["id"]), "name": r["name"]} for r in rows]


@router.get("/")
async def list_kbs(request: Request):
    async with tenant_connection(request.state.tenant_id) as conn:
        rows = await conn.fetch(
            """
            SELECT kb.id, kb.name, kb.acl_groups, count(d.id) AS doc_count
            FROM knowledge_bases kb
            LEFT JOIN documents d ON d.kb_id = kb.id
            GROUP BY kb.id, kb.name, kb.acl_groups ORDER BY kb.name
            """
        )
        unsorted = await conn.fetchval(
            "SELECT count(*) FROM documents WHERE kb_id IS NULL"
        )
    return {
        "kbs": [
            {"id": str(r["id"]), "name": r["name"],
             "acl_groups": list(r["acl_groups"]), "doc_count": r["doc_count"]}
            for r in rows
        ],
        "unsorted_count": unsorted,
    }


class CreateKbRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    acl_groups: list[str] = ["kv-alle"]


class KbAclRequest(BaseModel):
    acl_groups: list[str] = Field(min_length=1)


@router.post("/")
async def create_kb(body: CreateKbRequest, request: Request):
    if "kv-admin" not in request.state.roles:
        raise HTTPException(status_code=403, detail="Rolle 'kv-admin' erforderlich.")
    name = body.name.strip()
    async with tenant_connection(request.state.tenant_id) as conn:
        existing = await conn.fetchval(
            "SELECT 1 FROM knowledge_bases WHERE name = $1", name
        )
        if existing:
            raise HTTPException(status_code=409, detail=f"'{name}' existiert bereits.")
        groups = [g.strip() for g in body.acl_groups if g.strip()] or ["kv-alle"]
        kb_id = await conn.fetchval(
            """
            INSERT INTO knowledge_bases (tenant_id, name, acl_groups, created_by)
            VALUES ($1, $2, $3, $4) RETURNING id
            """,
            request.state.tenant_id, name, groups, request.state.user_id or "",
        )
        await conn.execute(
            """
            INSERT INTO audit_log (tenant_id, actor, action, object_type, object_id, info)
            VALUES ($1, $2, 'kb.create', 'kb', $3, $4)
            """,
            request.state.tenant_id, request.state.user_id or "", str(kb_id),
            f"{name} | Zugriff: {', '.join(groups)}",
        )
    return {"id": str(kb_id), "name": name, "acl_groups": groups}


@router.put("/{kb_id}/acl")
async def set_kb_acl(kb_id: uuid.UUID, body: KbAclRequest, request: Request):
    if "kv-admin" not in request.state.roles:
        raise HTTPException(status_code=403, detail="Rolle 'kv-admin' erforderlich.")
    groups = [g.strip() for g in body.acl_groups if g.strip()]
    if not groups:
        raise HTTPException(status_code=422, detail="Mindestens eine Gruppe erforderlich.")
    async with tenant_connection(request.state.tenant_id) as conn:
        row = await conn.fetchrow(
            "UPDATE knowledge_bases SET acl_groups = $2 WHERE id = $1 RETURNING name",
            kb_id, groups,
        )
        if row is None:
            raise HTTPException(status_code=404, detail="Nicht gefunden.")
        await conn.execute(
            """
            INSERT INTO audit_log (tenant_id, actor, action, object_type, object_id, info)
            VALUES ($1, $2, 'kb.acl', 'kb', $3, $4)
            """,
            request.state.tenant_id, request.state.user_id or "", str(kb_id),
            f"{row['name']} | Zugriff: {', '.join(groups)}",
        )
    return {"id": str(kb_id), "acl_groups": groups}


@router.put("/{kb_id}")
async def rename_kb(kb_id: uuid.UUID, body: CreateKbRequest, request: Request):
    if "kv-admin" not in request.state.roles:
        raise HTTPException(status_code=403, detail="Rolle 'kv-admin' erforderlich.")
    name = body.name.strip()
    async with tenant_connection(request.state.tenant_id) as conn:
        row = await conn.fetchrow(
            "UPDATE knowledge_bases SET name = $2 WHERE id = $1 RETURNING name",
            kb_id, name,
        )
        if row is None:
            raise HTTPException(status_code=404, detail="Nicht gefunden.")
        await conn.execute(
            """
            INSERT INTO audit_log (tenant_id, actor, action, object_type, object_id, info)
            VALUES ($1, $2, 'kb.rename', 'kb', $3, $4)
            """,
            request.state.tenant_id, request.state.user_id or "", str(kb_id),
            f"umbenannt in: {name}",
        )
    return {"id": str(kb_id), "name": name}


@router.delete("/{kb_id}")
async def delete_kb(kb_id: uuid.UUID, request: Request):
    if "kv-admin" not in request.state.roles:
        raise HTTPException(status_code=403, detail="Rolle 'kv-admin' erforderlich.")
    async with tenant_connection(request.state.tenant_id) as conn:
        doc_count = await conn.fetchval(
            "SELECT count(*) FROM documents WHERE kb_id = $1", kb_id
        )
        if doc_count:
            raise HTTPException(
                status_code=409,
                detail=f"Wissensdatenbank enthält noch {doc_count} Dokument(e) — "
                "erst löschen oder verschieben.",
            )
        row = await conn.fetchrow(
            "DELETE FROM knowledge_bases WHERE id = $1 RETURNING name", kb_id
        )
        if row is None:
            raise HTTPException(status_code=404, detail="Nicht gefunden.")
        await conn.execute(
            """
            INSERT INTO audit_log (tenant_id, actor, action, object_type, object_id, info)
            VALUES ($1, $2, 'kb.delete', 'kb', $3, $4)
            """,
            request.state.tenant_id, request.state.user_id or "", str(kb_id), row["name"],
        )
    return {"deleted": str(kb_id)}
