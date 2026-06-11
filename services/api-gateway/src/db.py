"""Lesender DB-Zugriff des Gateways (Audit-Log) mit Tenant-RLS."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import asyncpg

_pool: asyncpg.Pool | None = None


async def init_pool(settings) -> None:
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


@asynccontextmanager
async def plain_connection() -> AsyncIterator[asyncpg.Connection]:
    """Für globale Tabellen ohne tenant_id (system_settings)."""
    if _pool is None:
        raise RuntimeError("DB-Pool nicht initialisiert")
    async with _pool.acquire() as conn:
        yield conn


@asynccontextmanager
async def tenant_connection(tenant_id: str) -> AsyncIterator[asyncpg.Connection]:
    if _pool is None:
        raise RuntimeError("DB-Pool nicht initialisiert")
    async with _pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                "SELECT set_config('app.tenant_id', $1, true)", tenant_id
            )
            yield conn
