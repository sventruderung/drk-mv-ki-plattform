from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx

from drk_shared.tenant import get_tenant_id
from drk_shared.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None


@router.post("/")
async def chat(body: ChatRequest, request: Request) -> StreamingResponse:
    tenant_id = get_tenant_id()
    # COMPLIANCE: message wird nicht geloggt — nur Metadaten
    logger.info("chat.request", tenant_id=tenant_id, conversation_id=body.conversation_id)

    llm_url = request.app.state.settings.llm_service_url if hasattr(request.app.state, "settings") else "http://llm-service:8002"

    async def stream():
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream(
                "POST",
                f"{llm_url}/api/v1/generate",
                json={
                    "message": body.message,
                    "tenant_id": tenant_id,
                    "conversation_id": body.conversation_id,
                },
                headers={"X-Tenant-ID": tenant_id},
            ) as resp:
                if resp.status_code != 200:
                    raise HTTPException(status_code=resp.status_code)
                async for chunk in resp.aiter_bytes():
                    yield chunk

    return StreamingResponse(stream(), media_type="text/event-stream")
