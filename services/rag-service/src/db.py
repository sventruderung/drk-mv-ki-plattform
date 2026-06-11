"""Datenbankzugriff mit Tenant-gebundenen Transaktionen.

TENANT-ISOLATION: Jede Transaktion setzt app.tenant_id per SET LOCAL,
damit die RLS-Policies greifen. Verbindungen laufen als drk_app (kein Owner).
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

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
        min_size=2,
        max_size=10,
    )


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


@asynccontextmanager
async def tenant_connection(tenant_id: str) -> AsyncIterator[asyncpg.Connection]:
    """Verbindung mit aktiver RLS-Policy für den gegebenen Tenant."""
    if _pool is None:
        raise RuntimeError("DB-Pool nicht initialisiert")
    async with _pool.acquire() as conn:
        async with conn.transaction():
            # set_config statt String-Interpolation — kein SQL-Injection-Vektor
            await conn.execute(
                "SELECT set_config('app.tenant_id', $1, true)", tenant_id
            )
            yield conn
