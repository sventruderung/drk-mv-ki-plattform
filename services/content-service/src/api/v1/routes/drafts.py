"""Content-Drafts: KI-Generierung + Freigabe-Workflow (P02 Phase 1–3).

Identität via interne Header vom Gateway (X-Tenant-ID, X-User-ID, X-User-Roles).
COMPLIANCE: Phase 4 (automatisches Publizieren über Social-Media-APIs) ist
bewusst NICHT implementiert — erfordert DSB-Freigabe. 'publiziert' markiert
nur, dass der Beitrag manuell veröffentlicht wurde.
"""

import json
import uuid

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
import httpx

from drk_shared.logging import get_logger

from ....config import Settings
from ....core.channels import CHANNEL_PROMPTS, build_prompt
from ....core.workflow import TransitionError, check_transition
from ....db import tenant_connection

logger = get_logger(__name__)
router = APIRouter(prefix="/drafts", tags=["drafts"])

settings = Settings()


def _roles(x_user_roles: str) -> list[str]:
    return [r.strip() for r in x_user_roles.split(",") if r.strip()]


async def _generate_text(prompt: str, tenant_id: str) -> str:
    """Ruft den llm-service (Ollama-NDJSON-Stream) auf und sammelt den Volltext."""
    parts: list[str] = []
    async with httpx.AsyncClient(timeout=300) as client:
        async with client.stream(
            "POST",
            f"{settings.llm_service_url}/api/v1/generate",
            json={"message": prompt, "tenant_id": tenant_id},
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line.strip():
                    continue
                try:
                    parts.append(json.loads(line).get("response", ""))
                except json.JSONDecodeError:
                    continue
    return "".join(parts).strip()


class CreateDraftRequest(BaseModel):
    channel: str
    topic: str


class UpdateDraftRequest(BaseModel):
    draft_text: str


class TransitionRequest(BaseModel):
    target_status: str
    comment: str | None = None


@router.get("/channels")
async def list_channels():
    return sorted(CHANNEL_PROMPTS)


@router.post("/")
async def create_draft(
    body: CreateDraftRequest,
    x_tenant_id: str = Header(...),
    x_user_id: str = Header(...),
    x_user_roles: str = Header(""),
):
    if "content-editor" not in _roles(x_user_roles):
        raise HTTPException(status_code=403, detail="Rolle 'content-editor' erforderlich.")
    try:
        prompt = build_prompt(body.channel, body.topic)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # COMPLIANCE: topic/draft_text werden nicht geloggt — nur Metadaten
    logger.info("draft.create", tenant_id=x_tenant_id, channel=body.channel)
    draft_text = await _generate_text(prompt, x_tenant_id)
    draft_id = uuid.uuid4()

    async with tenant_connection(x_tenant_id) as conn:
        await conn.execute(
            """
            INSERT INTO content_drafts
              (id, tenant_id, channel, topic, draft_text, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            """,
            draft_id, x_tenant_id, body.channel, body.topic, draft_text, x_user_id,
        )
        # AUDIT (§6.2): Erstellung protokollieren — Kanal, keine Inhalte
        await conn.execute(
            """
            INSERT INTO audit_log (tenant_id, actor, action, object_type, object_id, info)
            VALUES ($1, $2, 'draft.create', 'draft', $3, $4)
            """,
            x_tenant_id, x_user_id, str(draft_id), f"Kanal: {body.channel}",
        )
    return {
        "id": str(draft_id),
        "channel": body.channel,
        "draft_text": draft_text,
        "status": "entwurf",
    }


@router.get("/")
async def list_drafts(
    status: str | None = None,
    x_tenant_id: str = Header(...),
):
    async with tenant_connection(x_tenant_id) as conn:
        if status:
            rows = await conn.fetch(
                """
                SELECT id, channel, topic, status, created_by, reviewed_by,
                       review_comment, created_at, updated_at
                FROM content_drafts WHERE status = $1 ORDER BY updated_at DESC
                """,
                status,
            )
        else:
            rows = await conn.fetch(
                """
                SELECT id, channel, topic, status, created_by, reviewed_by,
                       review_comment, created_at, updated_at
                FROM content_drafts ORDER BY updated_at DESC
                """
            )
    return [dict(r) for r in rows]


@router.get("/{draft_id}")
async def get_draft(draft_id: uuid.UUID, x_tenant_id: str = Header(...)):
    async with tenant_connection(x_tenant_id) as conn:
        row = await conn.fetchrow(
            "SELECT * FROM content_drafts WHERE id = $1", draft_id
        )
    if row is None:
        raise HTTPException(status_code=404, detail="Entwurf nicht gefunden.")
    return dict(row)


@router.put("/{draft_id}")
async def update_draft(
    draft_id: uuid.UUID,
    body: UpdateDraftRequest,
    x_tenant_id: str = Header(...),
    x_user_roles: str = Header(""),
):
    if "content-editor" not in _roles(x_user_roles):
        raise HTTPException(status_code=403, detail="Rolle 'content-editor' erforderlich.")
    async with tenant_connection(x_tenant_id) as conn:
        row = await conn.fetchrow(
            """
            UPDATE content_drafts
            SET draft_text = $2, updated_at = now()
            WHERE id = $1 AND status IN ('entwurf', 'abgelehnt')
            RETURNING id, status
            """,
            draft_id, body.draft_text,
        )
    if row is None:
        raise HTTPException(
            status_code=409,
            detail="Entwurf nicht gefunden oder nicht bearbeitbar "
            "(nur Status 'entwurf' und 'abgelehnt').",
        )
    return {"id": str(draft_id), "status": row["status"]}


@router.post("/{draft_id}/transition")
async def transition_draft(
    draft_id: uuid.UUID,
    body: TransitionRequest,
    x_tenant_id: str = Header(...),
    x_user_id: str = Header(...),
    x_user_roles: str = Header(""),
):
    roles = _roles(x_user_roles)
    async with tenant_connection(x_tenant_id) as conn:
        row = await conn.fetchrow(
            "SELECT status, created_by FROM content_drafts WHERE id = $1", draft_id
        )
        if row is None:
            raise HTTPException(status_code=404, detail="Entwurf nicht gefunden.")

        try:
            check_transition(row["status"], body.target_status, roles)
        except TransitionError as e:
            raise HTTPException(status_code=403, detail=str(e))

        # Vier-Augen auf Inhaltsebene: Ersteller darf nicht selbst freigeben
        if body.target_status in ("freigegeben", "abgelehnt") and row["created_by"] == x_user_id:
            raise HTTPException(
                status_code=403,
                detail="Eigene Entwürfe können nicht selbst freigegeben/abgelehnt werden.",
            )

        await conn.execute(
            """
            UPDATE content_drafts
            SET status = $2,
                reviewed_by = CASE WHEN $2 IN ('freigegeben', 'abgelehnt')
                                   THEN $3 ELSE reviewed_by END,
                review_comment = COALESCE($4, review_comment),
                updated_at = now()
            WHERE id = $1
            """,
            draft_id, body.target_status, x_user_id, body.comment,
        )
        # AUDIT (§6.2): Statuswechsel protokollieren
        await conn.execute(
            """
            INSERT INTO audit_log (tenant_id, actor, action, object_type, object_id, info)
            VALUES ($1, $2, $3, 'draft', $4, $5)
            """,
            x_tenant_id, x_user_id, f"draft.{body.target_status}",
            str(draft_id), f"{row['status']} → {body.target_status}",
        )

    logger.info(
        "draft.transition",
        tenant_id=x_tenant_id,
        draft_id=str(draft_id),
        from_status=row["status"],
        to_status=body.target_status,
    )
    return {"id": str(draft_id), "status": body.target_status}
