"""DB-Zugriff des elo-connectors: liest die ELO-Verbindung aus system_settings.

Die ELO-Zugangsdaten werden in der Admin-Console gepflegt und im Secret-Store
(Tabelle system_settings) gehalten (Gesamtkonzept §3.2, ADR-003). Der Adapter
liest sie zur Laufzeit — kein Secret im Image, kein Neustart bei Änderung.
"""

import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import asyncpg

_pool: asyncpg.Pool | None = None


async def init_pool() -> None:
    global _pool
    _pool = await asyncpg.create_pool(
        host=os.environ["POSTGRES_HOST"],
        port=int(os.environ.get("POSTGRES_PORT", "5432")),
        database=os.environ["POSTGRES_DB"],
        user=os.environ["POSTGRES_USER"],
        password=os.environ["POSTGRES_PASSWORD"],
        min_size=1,
        max_size=3,
    )


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


@asynccontextmanager
async def connection() -> AsyncIterator[asyncpg.Connection]:
    if _pool is None:
        raise RuntimeError("DB-Pool nicht initialisiert")
    async with _pool.acquire() as conn:
        yield conn


async def read_elo_settings() -> dict[str, str]:
    """Alle elo_*-Schlüssel aus system_settings lesen."""
    async with connection() as conn:
        rows = await conn.fetch("SELECT key, value FROM system_settings WHERE key LIKE 'elo_%'")
    return {r["key"]: r["value"] for r in rows}
