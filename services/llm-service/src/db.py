"""Lesezugriff auf Modell-Katalog und API-Keys (globale Tabellen, keine Tenant-Daten)."""

import asyncpg

from .config import Settings

_pool: asyncpg.Pool | None = None


async def init_pool(settings: Settings) -> None:
    global _pool
    _pool = await asyncpg.create_pool(
        host=settings.postgres_host,
        port=settings.postgres_port,
        database=settings.postgres_db,
        user=settings.postgres_user,
        password=settings.postgres_password,
        min_size=1,
        max_size=5,
    )


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


async def get_model(model_id: str) -> dict | None:
    assert _pool is not None
    row = await _pool.fetchrow(
        "SELECT id, provider, enabled FROM ai_models WHERE id = $1", model_id
    )
    return dict(row) if row else None


async def get_api_key(provider: str) -> str:
    assert _pool is not None
    row = await _pool.fetchrow(
        "SELECT value FROM system_settings WHERE key = $1", f"{provider}_api_key"
    )
    return row["value"] if row else ""
