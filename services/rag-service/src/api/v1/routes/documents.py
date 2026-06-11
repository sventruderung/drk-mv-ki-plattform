"""Dokumenten-Verwaltung: Upload, Liste, Löschen.

Identität kommt vom API-Gateway über interne Header (X-Tenant-ID, X-User-ID,
X-User-Roles) — der rag-service ist nicht direkt von außen erreichbar.
"""

import uuid

from fastapi import APIRouter, Form, Header, HTTPException, UploadFile
from pydantic import BaseModel

from drk_shared.logging import get_logger

from ....config import Settings
from ....core.chunking import split_into_chunks
from ....core.embeddings import embed_texts
from ....core.extract import SUPPORTED_TYPES, extract_text
from ....db import tenant_connection
from .... import storage

logger = get_logger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])

settings = Settings()


@router.post("/")
async def upload_document(
    file: UploadFile,
    acl_groups: str = Form("kv-alle"),  # kommasepariert, z.B. "kv-vorstand,kv-pflege"
    x_tenant_id: str = Header(...),
    x_user_id: str = Header(...),
):
    content_type = file.content_type or ""
    if content_type not in SUPPORTED_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Format nicht unterstützt: {content_type}. "
            "Erlaubt: PDF, DOCX, XLSX, TXT.",
        )

    data = await file.read()
    groups = [g.strip() for g in acl_groups.split(",") if g.strip()]
    doc_id = uuid.uuid4()
    storage_key = f"{x_tenant_id}/{doc_id}/{file.filename}"

    # COMPLIANCE: Kein Logging von Dokumentinhalten — nur Metadaten
    logger.info(
        "document.upload",
        tenant_id=x_tenant_id,
        document_id=str(doc_id),
        size_bytes=len(data),
    )

    pages = extract_text(data, content_type)
    if not pages:
        raise HTTPException(status_code=422, detail="Kein Text im Dokument gefunden.")

    chunks = split_into_chunks(pages, settings.chunk_size, settings.chunk_overlap)
    embeddings = await embed_texts(
        [c.text for c in chunks], settings.ollama_base_url, settings.embedding_model
    )

    storage.put_object(storage_key, data, content_type)

    async with tenant_connection(x_tenant_id) as conn:
        await conn.execute(
            """
            INSERT INTO documents
              (id, tenant_id, name, storage_key, content_type, size_bytes,
               acl_groups, uploaded_by, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ready')
            """,
            doc_id, x_tenant_id, file.filename, storage_key,
            content_type, len(data), groups, x_user_id,
        )
        await conn.executemany(
            """
            INSERT INTO document_chunks
              (document_id, tenant_id, chunk_index, chunk_text, page,
               acl_groups, embedding)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            """,
            [
                (doc_id, x_tenant_id, c.index, c.text, c.page, groups, str(emb))
                for c, emb in zip(chunks, embeddings)
            ],
        )
        # AUDIT (§6.2): Upload protokollieren — Metadaten, keine Inhalte
        await conn.execute(
            """
            INSERT INTO audit_log (tenant_id, actor, action, object_type, object_id, info)
            VALUES ($1, $2, 'document.upload', 'document', $3, $4)
            """,
            x_tenant_id, x_user_id, str(doc_id),
            f"{file.filename} | ACL: {', '.join(groups)}",
        )

    return {
        "id": str(doc_id),
        "name": file.filename,
        "chunks": len(chunks),
        "acl_groups": groups,
        "status": "ready",
    }


@router.get("/")
async def list_documents(x_tenant_id: str = Header(...)):
    async with tenant_connection(x_tenant_id) as conn:
        rows = await conn.fetch(
            """
            SELECT id, name, content_type, size_bytes, acl_groups, status, created_at
            FROM documents ORDER BY created_at DESC
            """
        )
    return [dict(r) for r in rows]


class AclUpdateRequest(BaseModel):
    acl_groups: list[str]


@router.patch("/{document_id}/acl")
async def update_acl(
    document_id: uuid.UUID,
    body: AclUpdateRequest,
    x_tenant_id: str = Header(...),
    x_user_id: str = Header(...),
):
    groups = [g.strip() for g in body.acl_groups if g.strip()]
    if not groups:
        raise HTTPException(
            status_code=422, detail="Mindestens eine ACL-Gruppe erforderlich."
        )
    async with tenant_connection(x_tenant_id) as conn:
        row = await conn.fetchrow(
            """
            UPDATE documents SET acl_groups = $2 WHERE id = $1
            RETURNING name, acl_groups
            """,
            document_id, groups,
        )
        if row is None:
            raise HTTPException(status_code=404, detail="Dokument nicht gefunden.")
        # ACL ist in den Chunks denormalisiert — synchron mitziehen
        await conn.execute(
            "UPDATE document_chunks SET acl_groups = $2 WHERE document_id = $1",
            document_id, groups,
        )
        await conn.execute(
            """
            INSERT INTO audit_log (tenant_id, actor, action, object_type, object_id, info)
            VALUES ($1, $2, 'document.acl', 'document', $3, $4)
            """,
            x_tenant_id, x_user_id, str(document_id),
            f"{row['name']} | neue ACL: {', '.join(groups)}",
        )
    logger.info("document.acl", tenant_id=x_tenant_id, document_id=str(document_id))
    return {"id": str(document_id), "acl_groups": groups}


@router.delete("/{document_id}")
async def delete_document(
    document_id: uuid.UUID,
    x_tenant_id: str = Header(...),
    x_user_id: str = Header(...),
):
    async with tenant_connection(x_tenant_id) as conn:
        row = await conn.fetchrow(
            "DELETE FROM documents WHERE id = $1 RETURNING storage_key, name",
            document_id,
        )
        if row is not None:
            await conn.execute(
                """
                INSERT INTO audit_log (tenant_id, actor, action, object_type, object_id, info)
                VALUES ($1, $2, 'document.delete', 'document', $3, $4)
                """,
                x_tenant_id, x_user_id, str(document_id), row["name"],
            )
    if row is None:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden.")
    storage.delete_object(row["storage_key"])
    logger.info("document.delete", tenant_id=x_tenant_id, document_id=str(document_id))
    return {"deleted": str(document_id)}
