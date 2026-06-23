from fastapi import FastAPI
from drk_shared.logging import configure_logging
from .config import Settings

settings = Settings()
configure_logging(level=settings.log_level, service_name="admin-service")

app = FastAPI(title="KI-Plattform — Admin Service", version="0.1.0")


@app.get("/api/v1/health")
async def health():
    return {"status": "ok", "service": "admin-service"}
