from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from drk_shared.logging import configure_logging, get_logger

from .config import Settings
from . import db, providers

settings = Settings()
configure_logging(level=settings.log_level, service_name="llm-service")
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.init_pool(settings)
    logger.info("llm-service.startup")
    yield
    await db.close_pool()
    logger.info("llm-service.shutdown")


app = FastAPI(
    title="DRK MV KI-Plattform — LLM Service", version="0.1.0", lifespan=lifespan
)


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
    model_id = body.model or settings.ollama_default_model
    model = await db.get_model(model_id)
    if model is None or not model["enabled"]:
        raise HTTPException(
            status_code=422, detail=f"Modell '{model_id}' nicht verfügbar."
        )

    # COMPLIANCE: Kein Logging von body.message — nur Metadaten.
    # Bei externen Providern wird der Provider protokolliert (Nachvollziehbarkeit).
    logger.info(
        "llm.generate",
        tenant_id=body.tenant_id,
        model=model_id,
        provider=model["provider"],
    )

    match model["provider"]:
        case "local":
            stream = providers.stream_local(
                body.message, model_id, settings.ollama_base_url
            )
        case "anthropic" | "openai" as provider:
            api_key = await db.get_api_key(provider)
            if not api_key:
                raise HTTPException(
                    status_code=503,
                    detail=f"Kein API-Key für {provider} hinterlegt "
                    "(Verwaltungs-UI → Einstellungen).",
                )
            if provider == "anthropic":
                stream = providers.stream_anthropic(body.message, model_id, api_key)
            else:
                stream = providers.stream_openai(body.message, model_id, api_key)
        case _:
            raise HTTPException(status_code=500, detail="Unbekannter Provider.")

    return StreamingResponse(stream, media_type="text/event-stream")
