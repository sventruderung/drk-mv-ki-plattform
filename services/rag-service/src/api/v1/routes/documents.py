"""Dokumenten-Verwaltung: Upload, Liste, Löschen.

Identität kommt vom API-Gateway über interne Header (X-Tenant-ID, X-User-ID,
X-User-Roles) — der rag-service ist nicht direkt von außen erreichbar.
"""

import io
import uuid
import zipfile
from pathlib import PurePosixPath

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

# Dateiendung → Content-Type (für Dateien aus ZIP-Archiven)
EXT_TYPES = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".docm": "application/vnd.ms-word.document.macroEnabled.12",
    ".doc": "application/msword",
    ".rtf": "application/rtf",
    ".odt": "application/vnd.oasis.opendocument.text",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xlsm": "application/vnd.ms-excel.sheet.macroEnabled.12",
    ".xls": "application/vnd.ms-excel",
    ".ods": "application/vnd.oasis.opendocument.spreadsheet",
    ".csv": "text/csv",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".ppt": "application/vnd.ms-powerpoint",
    ".eml": "message/rfc822",
    ".msg": "application/vnd.ms-outlook",
    ".html": "text/html",
    ".htm": "text/html",
    ".md": "text/markdown",
    ".txt": "text/plain",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
}
ZIP_MAX_MEMBERS = 200
ZIP_MAX_MEMBER_BYTES = 100 * 1024 * 1024  # 100 MB pro Datei


async def _ingest(
    data: bytes, filename: str, content_type: str,
    groups: list[str], tenant_id: str, user_id: str,
    kb_id: uuid.UUID | None = None,
) -> dict:
    """Eine Datei verarbeiten: extrahieren, chunken, embedden, speichern, auditieren."""
    doc_id = uuid.uuid4()
    storage_key = f"{tenant_id}/{doc_id}/{filename}"

    # COMPLIANCE: Kein Logging von Dokumentinhalten — nur Metadaten
    logger.info(
        "document.upload",
        tenant_id=tenant_id,
        document_id=str(doc_id),
        size_bytes=len(data),
    )

    pages = extract_text(data, content_type)
    if not pages:
        raise HTTPException(status_code=422, detail=f"Kein Text gefunden in: {filename}")

    chunks = split_into_chunks(pages, settings.chunk_size, settings.chunk_overlap)
    embeddings = await embed_texts(
        [c.text for c in chunks], settings.ollama_base_url, settings.embedding_model
    )

    storage.put_object(storage_key, data, content_type)

    async with tenant_connection(tenant_id) as conn:
        await conn.execute(
            """
            INSERT INTO documents
              (id, tenant_id, name, storage_key, content_type, size_bytes,
               acl_groups, uploaded_by, status, kb_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ready', $9)
            """,
            doc_id, tenant_id, filename, storage_key,
            content_type, len(data), groups, user_id, kb_id,
        )
        await conn.executemany(
            """
            INSERT INTO document_chunks
              (document_id, tenant_id, chunk_index, chunk_text, page,
               acl_groups, embedding)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            """,
            [
                (doc_id, tenant_id, c.index, c.text, c.page, groups, str(emb))
                for c, emb in zip(chunks, embeddings)
            ],
        )
        # AUDIT (§6.2): Upload protokollieren — Metadaten, keine Inhalte
        await conn.execute(
            """
            INSERT INTO audit_log (tenant_id, actor, action, object_type, object_id, info)
            VALUES ($1, $2, 'document.upload', 'document', $3, $4)
            """,
            tenant_id, user_id, str(doc_id),
            f"{filename} | ACL: {', '.join(groups)}",
        )

    return {"id": str(doc_id), "name": filename, "chunks": len(chunks)}


@router.post("/")
async def upload_document(
    file: UploadFile,
    acl_groups: str = Form("kv-alle"),  # kommasepariert, z.B. "kv-vorstand,kv-pflege"
    kb_id: str = Form(""),              # Ziel-Wissensdatenbank (leer = Allgemein)
    x_tenant_id: str = Header(...),
    x_user_id: str = Header(...),
):
    kb_uuid = uuid.UUID(kb_id) if kb_id.strip() else None
    content_type = file.content_type or ""
    groups = [g.strip() for g in acl_groups.split(",") if g.strip()]
    is_zip = (file.filename or "").lower().endswith(".zip") or content_type in (
        "application/zip", "application/x-zip-compressed"
    )

    # Browser melden teils unpräzise MIME-Typen — Endung ist verlässlicher
    ext = PurePosixPath(file.filename or "").suffix.lower()
    if not is_zip and content_type not in SUPPORTED_TYPES and ext in EXT_TYPES:
        content_type = EXT_TYPES[ext]

    if not is_zip and content_type not in SUPPORTED_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Format nicht unterstützt: {content_type}. "
            "Erlaubt: Office (alt+neu), PDF, RTF, OpenOffice, E-Mail, HTML, CSV, TXT, ZIP.",
        )

    data = await file.read()

    if not is_zip:
        result = await _ingest(
            data, file.filename, content_type, groups, x_tenant_id, x_user_id, kb_uuid
        )
        return {**result, "acl_groups": groups, "status": "ready"}

    # --- ZIP: alle unterstützten Dateien daraus verarbeiten ---
    try:
        archive = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile:
        raise HTTPException(status_code=422, detail="ZIP-Datei ist beschädigt.")

    documents: list[dict] = []
    skipped: list[str] = []
    members = [m for m in archive.infolist() if not m.is_dir()]
    if len(members) > ZIP_MAX_MEMBERS:
        raise HTTPException(
            status_code=422,
            detail=f"ZIP enthält {len(members)} Dateien — Maximum: {ZIP_MAX_MEMBERS}.",
        )
    for member in members:
        name = PurePosixPath(member.filename).name  # Pfade entschärfen
        ext = PurePosixPath(name).suffix.lower()
        if name.startswith(".") or name.startswith("~"):
            continue  # Systemdateien (.DS_Store, Office-Lockfiles) still überspringen
        if ext not in EXT_TYPES:
            skipped.append(f"{name} (Format)")
            continue
        if member.file_size > ZIP_MAX_MEMBER_BYTES:
            skipped.append(f"{name} (zu groß)")
            continue
        try:
            result = await _ingest(
                archive.read(member), name, EXT_TYPES[ext],
                groups, x_tenant_id, x_user_id, kb_uuid,
            )
            documents.append(result)
        except HTTPException as e:
            skipped.append(f"{name} ({e.detail})")

    if not documents:
        raise HTTPException(
            status_code=422,
            detail="ZIP enthielt keine verarbeitbaren Dokumente "
            f"({len(skipped)} übersprungen).",
        )
    return {
        "zip": file.filename,
        "documents": documents,
        "skipped": skipped,
        "acl_groups": groups,
        "status": "ready",
    }


@router.get("/")
async def list_documents(
    x_tenant_id: str = Header(...),
    search: str = "",
    kb: str = "",        # "" = alle | "none" = Allgemein | UUID
    group: str = "",     # ACL-Gruppe
    ext: str = "",       # Dateiendung, z.B. "pdf"
    page: int = 1,
    page_size: int = 50,
):
    where = ["TRUE"]
    params: list = []

    def p(value) -> str:
        params.append(value)
        return f"${len(params)}"

    if search.strip():
        where.append(f"d.name ILIKE {p('%' + search.strip() + '%')}")
    if kb == "none":
        where.append("d.kb_id IS NULL")
    elif kb.strip():
        where.append(f"d.kb_id = {p(uuid.UUID(kb))}")
    if group.strip():
        where.append(f"{p(group.strip())} = ANY(d.acl_groups)")
    if ext.strip():
        where.append(f"d.name ILIKE {p('%.' + ext.strip().lstrip('.'))}")

    page = max(page, 1)
    page_size = min(max(page_size, 1), 200)
    where_sql = " AND ".join(where)

    async with tenant_connection(x_tenant_id) as conn:
        total = await conn.fetchval(
            f"SELECT count(*) FROM documents d WHERE {where_sql}", *params
        )
        rows = await conn.fetch(
            f"""
            SELECT d.id, d.name, d.content_type, d.size_bytes, d.acl_groups,
                   d.status, d.created_at, d.kb_id, kb.name AS kb_name
            FROM documents d
            LEFT JOIN knowledge_bases kb ON kb.id = d.kb_id
            WHERE {where_sql}
            ORDER BY d.created_at DESC
            LIMIT {p(page_size)} OFFSET {p((page - 1) * page_size)}
            """,
            *params,
        )
    return {
        "documents": [dict(r) for r in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


class BulkRequest(BaseModel):
    ids: list[uuid.UUID]
    action: str                      # move | acl | delete
    kb_id: str | None = None         # für move ("" = Allgemein)
    acl_groups: list[str] | None = None  # für acl


@router.post("/bulk")
async def bulk_action(
    body: BulkRequest,
    x_tenant_id: str = Header(...),
    x_user_id: str = Header(...),
):
    if not body.ids:
        raise HTTPException(status_code=422, detail="Keine Dokumente ausgewählt.")
    if len(body.ids) > 500:
        raise HTTPException(status_code=422, detail="Maximal 500 Dokumente pro Aktion.")

    async with tenant_connection(x_tenant_id) as conn:
        match body.action:
            case "move":
                kb_uuid = uuid.UUID(body.kb_id) if (body.kb_id or "").strip() else None
                target = "Allgemein"
                if kb_uuid:
                    target = await conn.fetchval(
                        "SELECT name FROM knowledge_bases WHERE id = $1", kb_uuid
                    )
                    if target is None:
                        raise HTTPException(status_code=404, detail="Ziel-Wissensdatenbank nicht gefunden.")
                result = await conn.fetch(
                    "UPDATE documents SET kb_id = $2 WHERE id = ANY($1) RETURNING name",
                    body.ids, kb_uuid,
                )
                info = f"{len(result)} Dokument(e) verschoben nach: {target}"
                action = "document.move"
            case "acl":
                groups = [g.strip() for g in (body.acl_groups or []) if g.strip()]
                if not groups:
                    raise HTTPException(status_code=422, detail="Mindestens eine Gruppe erforderlich.")
                result = await conn.fetch(
                    "UPDATE documents SET acl_groups = $2 WHERE id = ANY($1) RETURNING id",
                    body.ids, groups,
                )
                await conn.execute(
                    "UPDATE document_chunks SET acl_groups = $2 WHERE document_id = ANY($1)",
                    body.ids, groups,
                )
                info = f"{len(result)} Dokument(e) | neue ACL: {', '.join(groups)}"
                action = "document.acl"
            case "delete":
                result = await conn.fetch(
                    "DELETE FROM documents WHERE id = ANY($1) RETURNING storage_key",
                    body.ids,
                )
                for r in result:
                    storage.delete_object(r["storage_key"])
                info = f"{len(result)} Dokument(e) gelöscht"
                action = "document.delete"
            case _:
                raise HTTPException(status_code=422, detail="Unbekannte Aktion.")

        await conn.execute(
            """
            INSERT INTO audit_log (tenant_id, actor, action, object_type, object_id, info)
            VALUES ($1, $2, $3, 'document', 'bulk', $4)
            """,
            x_tenant_id, x_user_id, action, info,
        )

    logger.info("document.bulk", tenant_id=x_tenant_id, action=body.action, count=len(body.ids))
    return {"affected": len(result), "action": body.action}


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
