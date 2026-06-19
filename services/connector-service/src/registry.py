"""In-Memory-Registry (Mono-Pilot).

NAHT ZUR DB: Produktiv wird dieser Store durch PostgreSQL mit Row-Level-Security
ersetzt; Tenant-Freigaben und Connector-Metadaten sind dann mandantengetrennt
persistiert. Die Methoden-Signaturen bleiben gleich.
"""

from __future__ import annotations

import threading
import uuid

from .models import AvailableCapability, Connector, ConnectorIn


class ConnectorNotFound(KeyError):
    """Connector-ID unbekannt."""


class Registry:
    """Thread-sichere Verwaltung der Connectoren (Lebenszyklus + Freigaben)."""

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._items: dict[str, Connector] = {}

    def register(self, data: ConnectorIn) -> Connector:
        with self._lock:
            cid = data.id or f"{data.type}-{uuid.uuid4().hex[:8]}"
            connector = Connector(**{**data.model_dump(), "id": cid, "status": "registered"})
            self._items[cid] = connector
            return connector

    def configure(self, cid: str, data: ConnectorIn) -> Connector:
        with self._lock:
            existing = self._get(cid)
            updated = Connector(
                **{**data.model_dump(), "id": cid, "status": "configured", "tenants": existing.tenants}
            )
            self._items[cid] = updated
            return updated

    def get(self, cid: str) -> Connector:
        with self._lock:
            return self._get(cid)

    def list_connectors(self, tenant_id: str | None = None) -> list[Connector]:
        with self._lock:
            items = list(self._items.values())
        if tenant_id is None:
            return items
        return [c for c in items if tenant_id in c.tenants]

    def activate(self, cid: str, tenant_id: str) -> Connector:
        with self._lock:
            c = self._get(cid)
            if tenant_id not in c.tenants:
                c.tenants.append(tenant_id)
            c.status = "active"
            return c

    def deactivate(self, cid: str, tenant_id: str) -> Connector:
        with self._lock:
            c = self._get(cid)
            if tenant_id in c.tenants:
                c.tenants.remove(tenant_id)
            return c

    def available(self, tenant_id: str) -> list[AvailableCapability]:
        """Freigegebene Capabilities für einen Tenant (Sicht des Tool-Layers).

        TENANT-ISOLATION: ein Connector ohne Freigabe für diesen Tenant erscheint
        hier nicht und ist damit im Chat unsichtbar.
        """
        out: list[AvailableCapability] = []
        for c in self.list_connectors(tenant_id):
            for cap in c.capabilities:
                out.append(
                    AvailableCapability(
                        connector_id=c.id,
                        name=cap.name,
                        description=cap.description,
                        params_schema=cap.params_schema,
                    )
                )
        return out

    def _get(self, cid: str) -> Connector:
        try:
            return self._items[cid]
        except KeyError as exc:
            raise ConnectorNotFound(cid) from exc


registry = Registry()
