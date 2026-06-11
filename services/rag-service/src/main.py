from contextlib import asynccontextmanager

from fastapi import FastAPI

from drk_shared.logging import configure_logging, get_logger

from .config import Settings
from . import db, storage
from .api.v1.routes import documents, query

settings = Settings()
configure_logging(level=settings.log_level, service_name="rag-service")
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.init_pool(settings)
    storage.init_storage(settings)
    logger.info("rag-service.startup")
    yield
    await db.close_pool()
    logger.info("rag-service.shutdown")


app = FastAPI(
    title="DRK MV KI-Plattform — RAG Service", version="0.1.0", lifespan=lifespan
)

app.include_router(documents.router, prefix="/api/v1")
app.include_router(query.router, prefix="/api/v1")


@app.get("/api/v1/health")
async def health():
    return {"status": "ok", "service": "rag-service"}
