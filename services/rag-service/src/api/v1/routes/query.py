"""Rechtegeprüfte RAG-Suche (§4.2 Lastenheft).

Nur Chunks aus Dokumenten, für die der anfragende Nutzer eine aktive
Leseberechtigung besitzt (acl_groups && user_roles), werden ins
Kontextfenster aufgenommen. Zitation: Dokumentname + Seite (§3.2).
"""

from fastapi import APIRouter, Header
from pydantic import BaseModel

from drk_shared.logging import get_logger

from ....config import Settings
from ....core.embeddings import embed_query
from ....db import tenant_connection

logger = get_logger(__name__)
router = APIRouter(prefix="/query", tags=["query"])

settings = Settings()


class QueryRequest(BaseModel):
    question: str
    top_k: int | None = None


class Citation(BaseModel):
    document_name: str
    page: int | None
    chunk_text: str
    similarity: float


class QueryResponse(BaseModel):
    citations: list[Citation]
    context: str


@router.post("/", response_model=QueryResponse)
async def query(
    body: QueryRequest,
    x_tenant_id: str = Header(...),
    x_user_roles: str = Header(""),  # kommasepariert vom Gateway
) -> QueryResponse:
    roles = [r.strip() for r in x_user_roles.split(",") if r.strip()]
    # COMPLIANCE: Frage wird nicht geloggt — nur Metadaten
    logger.info("rag.query", tenant_id=x_tenant_id, role_count=len(roles))

    query_embedding = await embed_query(
        body.question, settings.ollama_base_url, settings.embedding_model
    )
    top_k = body.top_k or settings.top_k

    async with tenant_connection(x_tenant_id) as conn:
        # ACL-Filter: && prüft Überschneidung von Chunk-Gruppen und Nutzer-Rollen.
        # RLS filtert zusätzlich auf tenant_id (Defense in Depth).
        rows = await conn.fetch(
            """
            SELECT d.name AS document_name,
                   dc.page,
                   dc.chunk_text,
                   1 - (dc.embedding <=> $1::vector) AS similarity
            FROM document_chunks dc
            JOIN documents d ON d.id = dc.document_id
            WHERE dc.acl_groups && $2::text[]
              AND d.status = 'ready'
            ORDER BY dc.embedding <=> $1::vector
            LIMIT $3
            """,
            str(query_embedding), roles, top_k,
        )

    citations = [
        Citation(
            document_name=r["document_name"],
            page=r["page"],
            chunk_text=r["chunk_text"],
            similarity=round(r["similarity"], 4),
        )
        for r in rows
    ]
    context = "\n\n".join(
        f"[Quelle: {c.document_name}"
        + (f", Seite {c.page}" if c.page else "")
        + f"]\n{c.chunk_text}"
        for c in citations
    )
    return QueryResponse(citations=citations, context=context)
