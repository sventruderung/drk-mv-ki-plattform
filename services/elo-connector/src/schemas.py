"""Pydantic-Schemata für Connector-Ein- und Ausgaben (ELO REST Service).

Jede Capability validiert ihre Parameter serverseitig.
"""

from typing import Any, Literal

from pydantic import BaseModel, Field

# ELO REST Service: GET /api/search?where=TITLE|DOCUMENT|KEYWORDING|ANYWHERE
WhereValue = Literal["TITLE", "DOCUMENT", "KEYWORDING", "ANYWHERE"]


class SearchParams(BaseModel):
    """Parameter für `dokument.suchen`."""

    query: str = Field(..., min_length=1, max_length=500)
    where: WhereValue | None = Field(default=None, description="Suchbereich; None = überall")
    limit: int = Field(default=20, ge=1, le=100)


class SummarizeParams(BaseModel):
    """Parameter für `dokument.zusammenfassen`."""

    dokument_id: int = Field(..., ge=0)
    max_chars: int = Field(default=20_000, ge=500, le=100_000)


class StatsParams(BaseModel):
    """Parameter für `statistik.dokumente_zaehlen`.

    `felder` ist ein Indexfeld-Filter (Keywording), z.B. {"INVOICE_STATUS": "offen"}.
    """

    felder: dict[str, str] = Field(default_factory=dict, description="Indexfeld -> Wert")
    # Belegdatum-Präfix JJJJMM (Monat) oder JJJJ (Jahr): sucht das Rechnungs-/
    # Belegdatum serverseitig (INVOICE_DATE und/oder E4S_BELEG_DATE, je rechnungsart).
    belegdatum: str | None = Field(default=None, description="Belegdatum-Präfix JJJJMM oder JJJJ")
    # Rechnungsart steuert Maske/Feld: eingang=Incoming Invoice (INVOICE_*),
    # ausgang=Sage Verkaufsbeleg (E4S_*), beide/leer=beide.
    rechnungsart: str | None = Field(default=None, description="eingang | ausgang | beide")
    aelter_als_tage: int | None = Field(default=None, ge=0, le=3650)
    # Optionaler Zeitraumfilter (ISO YYYY-MM-DD) auf das ABLAGE-/Importdatum
    datum_von: str | None = Field(default=None, description="Ablagedatum untere Grenze, ISO YYYY-MM-DD")
    datum_bis: str | None = Field(default=None, description="Ablagedatum obere Grenze, ISO YYYY-MM-DD")


class InvokeRequest(BaseModel):
    """Generischer Ausführungs-Request an den Connector."""

    capability: Literal[
        "dokument.suchen", "dokument.zusammenfassen", "statistik.dokumente_zaehlen"
    ]
    params: dict[str, Any] = Field(default_factory=dict)


class Meta(BaseModel):
    tenant_id: str
    connector_id: str
    request_id: str


class InvokeResponse(BaseModel):
    """Normalisierte Connector-Antwort. `sources` ist Pflicht."""

    data: dict[str, Any]
    meta: Meta
