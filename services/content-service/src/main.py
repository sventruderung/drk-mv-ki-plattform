from contextlib import asynccontextmanager

from fastapi import FastAPI

from drk_shared.logging import configure_logging, get_logger

from .config import Settings
from . import db
from .api.v1.routes import drafts

settings = Settings()
configure_logging(level=settings.log_level, service_name="content-service")
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.init_pool(settings)
    logger.info("content-service.startup")
    yield
    await db.close_pool()
    logger.info("content-service.shutdown")


app = FastAPI(
    title="DRK MV KI-Plattform — Content Service (P02)",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(drafts.router, prefix="/api/v1")


@app.get("/api/v1/health")
async def health():
    return {"status": "ok", "service": "content-service"}
