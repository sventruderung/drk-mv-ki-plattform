"""Datenmodelle der Connector-Registry.

Capability-Schemata als JSON-Schema. Connector-Metadaten enthalten KEINE Secrets
— Zugangsdaten liegen im Secret-Store des Adapters (Gesamtkonzept §7 #3 / ADR-003).
"""

from typing import Any, Literal

from pydantic import BaseModel, Field


class Capability(BaseModel):
    name: str = Field(..., examples=["dokument.suchen"])
    description: str = ""
    params_schema: dict[str, Any] = Field(default_factory=dict, description="JSON-Schema")


class ConnectorIn(BaseModel):
    id: str | None = Field(default=None, examples=["dms-elo-01"])
    name: str
    type: str = Field(..., examples=["dms", "fachverfahren", "sql-readonly"])
    adapter: Literal["rest", "mcp"] = "rest"
    invoke_base_url: str = Field(..., description="Adapter-Basis, z.B. http://elo-connector:8005")
    health_path: str = "/healthz"
    capabilities: list[Capability] = Field(default_factory=list)


class Connector(ConnectorIn):
    id: str
    status: Literal["registered", "configured", "active"] = "registered"
    tenants: list[str] = Field(default_factory=list, description="freigegebene Tenant-IDs")


class AvailableCapability(BaseModel):
    connector_id: str
    name: str
    description: str
    params_schema: dict[str, Any]


class InvokeRequest(BaseModel):
    capability: str
    params: dict[str, Any] = Field(default_factory=dict)
