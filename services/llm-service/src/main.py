from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx

from drk_shared.logging import configure_logging, get_logger
from .config import Settings

settings = Settings()
configure_logging(level=settings.log_level, service_name="llm-service")
logger = get_logger(__name__)

app = FastAPI(title="DRK MV KI-Plattform — LLM Service", version="0.1.0")


class GenerateRequest(BaseModel):
    message: str
    tenant_id: str
    conversation_id: str | None = None
    model: str | None = None


@app.get("/api/v1/health")
async def health():
    return {"status": "ok", "service": "llm-service"}


@app.post("/api/v1/generate")
async def generate(body: GenerateRequest) -> StreamingResponse:
    # COMPLIANCE: Kein Logging von body.message — nur Metadaten
    logger.info("llm.generate", tenant_id=body.tenant_id, model=body.model or settings.ollama_default_model)

    model = body.model or settings.ollama_default_model

    async def stream():
        async with httpx.AsyncClient(timeout=300) as client:
            async with client.stream(
                "POST",
                f"{settings.ollama_base_url}/api/generate",
                json={"model": model, "prompt": body.message, "stream": True},
            ) as resp:
                async for chunk in resp.aiter_bytes():
                    yield chunk

    return StreamingResponse(stream(), media_type="text/event-stream")
