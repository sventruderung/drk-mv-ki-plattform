"""Proxy zum rag-service: Dokumente verwalten + RAG-Chat.

Das Gateway reicht Identität über interne Header weiter — der rag-service
ist von außen nicht erreichbar und vertraut diesen Headern.
"""

from fastapi import APIRouter, Request, UploadFile, Form, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx
import json

from drk_shared.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(tags=["rag"])


def _identity_headers(request: Request) -> dict[str, str]:
    return {
        "X-Tenant-ID": request.state.tenant_id,
        "X-User-ID": request.state.user_id or "",
        "X-User-Roles": ",".join(request.state.roles),
    }


def _rag_url(request: Request) -> str:
    return request.app.state.settings.rag_service_url


def _llm_url(request: Request) -> str:
    return request.app.state.settings.llm_service_url


@router.post("/documents")
async def upload_document(
    request: Request, file: UploadFile,
    acl_groups: str = Form("kv-alle"), kb_id: str = Form(""),
):
    # Antwort unverändert durchreichen: Einzeldatei = JSON, ZIP = NDJSON-
    # Fortschritts-Stream (eine Zeile pro Datei). Deshalb streamen wir die
    # Upstream-Antwort, statt sie zu puffern. Großzügiger Timeout für große ZIPs.
    content = await file.read()
    client = httpx.AsyncClient(timeout=1800)
    req = client.build_request(
        "POST",
        f"{_rag_url(request)}/api/v1/documents/",
        files={"file": (file.filename, content, file.content_type)},
        data={"acl_groups": acl_groups, "kb_id": kb_id},
        headers=_identity_headers(request),
    )
    resp = await client.send(req, stream=True)

    async def body():
        try:
            async for chunk in resp.aiter_raw():
                yield chunk
        finally:
            await resp.aclose()
            await client.aclose()

    return StreamingResponse(
        body(),
        status_code=resp.status_code,
        media_type=resp.headers.get("content-type", "application/json"),
    )


@router.get("/documents")
async def list_documents(request: Request):
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{_rag_url(request)}/api/v1/documents/",
            params=dict(request.query_params),
            headers=_identity_headers(request),
        )
    resp.raise_for_status()
    return resp.json()


class BulkRequest(BaseModel):
    ids: list[str]
    action: str
    kb_id: str | None = None
    acl_groups: list[str] | None = None


@router.post("/documents/bulk")
async def bulk_documents(request: Request, body: BulkRequest):
    async with httpx.AsyncClient(timeout=300) as client:
        resp = await client.post(
            f"{_rag_url(request)}/api/v1/documents/bulk",
            json=body.model_dump(),
            headers=_identity_headers(request),
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.json().get("detail"))
    return resp.json()


class AclUpdateRequest(BaseModel):
    acl_groups: list[str]


@router.patch("/documents/{document_id}/acl")
async def update_document_acl(
    request: Request, document_id: str, body: AclUpdateRequest
):
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.patch(
            f"{_rag_url(request)}/api/v1/documents/{document_id}/acl",
            json={"acl_groups": body.acl_groups},
            headers=_identity_headers(request),
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.json().get("detail"))
    return resp.json()


@router.delete("/documents/{document_id}")
async def delete_document(request: Request, document_id: str):
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.delete(
            f"{_rag_url(request)}/api/v1/documents/{document_id}",
            headers=_identity_headers(request),
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.json().get("detail"))
    return resp.json()


class RagChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None
    kb_id: str | None = None  # nur diese Wissensdatenbank durchsuchen


RAG_SYSTEM_PROMPT = (
    "Du bist der KI-Assistent des DRK. Beantworte die Frage ausschließlich "
    "auf Basis der folgenden Quellen. Zitiere jede verwendete Quelle im Format "
    "[Quelle: Dokumentname, Seite X]. Wenn die Quellen keine Antwort enthalten, "
    "sage das klar — erfinde nichts.\n\nQuellen:\n{context}"
)


@router.post("/rag/chat")
async def rag_chat(body: RagChatRequest, request: Request) -> StreamingResponse:
    """RAG-Pipeline: rechtegeprüfte Suche, dann Antwort mit Zitaten streamen."""
    tenant_id = request.state.tenant_id
    # COMPLIANCE: message wird nicht geloggt — nur Metadaten
    logger.info("rag_chat.request", tenant_id=tenant_id)

    headers = _identity_headers(request)
    async with httpx.AsyncClient(timeout=60) as client:
        search = await client.post(
            f"{_rag_url(request)}/api/v1/query/",
            json={"question": body.message, "kb_id": body.kb_id},
            headers=headers,
        )
    search.raise_for_status()
    result = search.json()

    if not result["citations"]:
        async def empty():
            yield (
                "Zu Ihrer Frage liegen keine freigegebenen Informationen "
                "in der Wissensbasis vor."
            ).encode()
        return StreamingResponse(empty(), media_type="text/event-stream")

    prompt = (
        RAG_SYSTEM_PROMPT.format(context=result["context"])
        + f"\n\nFrage: {body.message}"
    )

    async def stream():
        async with httpx.AsyncClient(timeout=300) as client:
            async with client.stream(
                "POST",
                f"{_llm_url(request)}/api/v1/generate",
                json={"message": prompt, "tenant_id": tenant_id},
            ) as resp:
                async for chunk in resp.aiter_bytes():
                    yield chunk

        # Quellen deterministisch anhängen (Dokumentname + Seite), damit sie
        # sicher erscheinen — unabhängig davon, ob das Modell inline zitiert.
        # Als NDJSON-'response'-Zeile, wie der Modell-Stream (Pipe extrahiert sie).
        seen: set = set()
        quellen: list[str] = []
        for c in result["citations"]:
            key = (c.get("document_name"), c.get("page"))
            if key in seen:
                continue
            seen.add(key)
            seite = f", Seite {c['page']}" if c.get("page") else ""
            quellen.append(f"- {c.get('document_name', 'Dokument')}{seite}")
        if quellen:
            footer = "\n\n---\n📚 **Quellen:**\n" + "\n".join(quellen)
            yield (json.dumps({"response": footer}) + "\n").encode()

    return StreamingResponse(stream(), media_type="text/event-stream")
