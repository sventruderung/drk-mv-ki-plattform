from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from fastapi.staticfiles import StaticFiles

from drk_shared.logging import configure_logging, get_logger
from .config import Settings
from . import db
from .middleware.auth import JWTMiddleware
from .api.v1.routes import (
    audit, chat, content, elo, health, kbs, ldap_routes, models, rag, settings_routes,
    system, users,
)

settings = Settings()
configure_logging(level=settings.log_level, service_name="api-gateway")
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    import asyncio

    from . import monitor

    await db.init_pool(settings)
    monitor_task = asyncio.create_task(monitor.run(settings))
    logger.info("api-gateway.startup", environment=settings.environment)
    yield
    monitor_task.cancel()
    await db.close_pool()
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
app.include_router(audit.router, prefix="/api/v1")
app.include_router(settings_routes.router, prefix="/api/v1")
app.include_router(ldap_routes.router, prefix="/api/v1")
app.include_router(elo.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(system.router, prefix="/api/v1")
app.include_router(models.router, prefix="/api/v1")
app.include_router(kbs.router, prefix="/api/v1")


def _build_date() -> str:
    """Wird beim Docker-Build in /app/build_date geschrieben; lokal: 'dev'."""
    try:
        return Path("/app/build_date").read_text().strip()
    except OSError:
        return "dev"


def _build_branch() -> str:
    """Verwendete Git-Branch, beim Docker-Build aus .git/HEAD gesetzt; lokal: 'dev'."""
    try:
        return Path("/app/build_branch").read_text().strip() or "dev"
    except OSError:
        return "dev"


@app.get("/admin/config.js", response_class=PlainTextResponse)
async def admin_config() -> str:
    """Laufzeit-Konfiguration fürs Admin-UI (Keycloak-Adresse aus der .env)."""
    return (
        f'window.DRK_CONFIG = {{\n'
        f'  keycloakUrl: "{settings.keycloak_public_url}",\n'
        f'  realm: "{settings.keycloak_realm}",\n'
        f'  clientId: "drk-admin-ui",\n'
        f'  version: "{app.version}",\n'
        f'  buildDate: "{_build_date()}",\n'
        f'  branch: "{_build_branch()}"\n'
        f'}};\n'
    )


app.mount(
    "/admin",
    StaticFiles(directory=Path(__file__).parent / "static" / "admin", html=True),
    name="admin-ui",
)
