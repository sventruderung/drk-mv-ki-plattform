from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from drk_shared.logging import configure_logging, get_logger
from .config import Settings
from .middleware.auth import JWTMiddleware
from .api.v1.routes import chat, content, health, rag

settings = Settings()
configure_logging(level=settings.log_level, service_name="api-gateway")
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("api-gateway.startup", environment=settings.environment)
    yield
    logger.info("api-gateway.shutdown")


app = FastAPI(
    title="DRK MV KI-Plattform — API Gateway",
    version="0.1.0",
    lifespan=lifespan,
    # OpenAPI nur in Dev exponieren
    docs_url="/docs" if settings.environment == "development" else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(JWTMiddleware, settings=settings)

app.state.settings = settings

app.include_router(health.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(rag.router, prefix="/api/v1")
app.include_router(content.router, prefix="/api/v1")
