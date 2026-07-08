"""Seed des Mono-Pilots: registriert den ELO-Connector und schaltet ihn für den
Pilot-Tenant frei. Im Mono-Pilot ist genau ein Tenant aktiv; die Tenant-Prüfung
bleibt aktiv, arbeitet aber mit einer Kennung (aus TENANT_ID).

Produktiv ersetzt die DB-gestützte Registry diesen In-Memory-Seed.
"""

import os

from .models import Capability, ConnectorIn
from .registry import registry

# Adapter-Adresse im Docker-Netz (kein Secret; die ELO-Zugangsdaten liegen im
# Secret-Store, den der elo-connector selbst liest).
ELO_ADAPTER_URL = os.environ.get("ELO_CONNECTOR_URL", "http://elo-connector:8005")
PILOT_TENANT = os.environ.get("TENANT_ID", "kv-bad-doberan")

_ELO_CONNECTOR = ConnectorIn(
    id="dms-elo-01",
    name="ELO DMS",
    type="dms",
    adapter="rest",
    invoke_base_url=ELO_ADAPTER_URL,
    health_path="/healthz",
    capabilities=[
        Capability(
            name="dokument.suchen",
            description="Dokumente per Stichwort/Volltext im ELO-Archiv finden.",
            params_schema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "minLength": 1, "maxLength": 500},
                    "where": {"type": "string", "enum": ["TITLE", "DOCUMENT", "KEYWORDING", "ANYWHERE"]},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 100},
                },
                "required": ["query"],
            },
        ),
        Capability(
            name="dokument.zusammenfassen",
            description="Inhalt eines ELO-Dokuments laden (Modell fasst zusammen).",
            params_schema={
                "type": "object",
                "properties": {"dokument_id": {"type": "integer", "minimum": 0}},
                "required": ["dokument_id"],
            },
        ),
        Capability(
            name="statistik.dokumente_zaehlen",
            description=(
                "Zählt/filtert Rechnungen. belegdatum (JJJJMM oder JJJJ) sucht nach "
                "Rechnungs-/Belegdatum in BEIDEN Rechnungsarten; felder filtert über "
                "echte Indexfelder; datum_von/datum_bis filtert über das Ablagedatum."
            ),
            params_schema={
                "type": "object",
                "properties": {
                    "belegdatum": {
                        "type": "string",
                        "description": "Belegdatum-Präfix JJJJMM (Monat) oder JJJJ (Jahr), "
                                       "z.B. '202606' oder '2021' — sucht Ein- und Ausgang.",
                    },
                    "felder": {
                        "type": "object",
                        "additionalProperties": {"type": "string"},
                        "description": 'Indexfeld -> Wert, z.B. {"VENDOR_NAME":"Firma X"} '
                                       'oder {"E4S_KUNDEN_NAME":"Kunde Y"}',
                    },
                    "aelter_als_tage": {"type": "integer", "minimum": 0, "maximum": 3650},
                    "datum_von": {
                        "type": "string",
                        "description": "Ablagedatum untere Grenze, ISO YYYY-MM-DD",
                    },
                    "datum_bis": {
                        "type": "string",
                        "description": "Ablagedatum obere Grenze, ISO YYYY-MM-DD",
                    },
                },
            },
        ),
    ],
)


def seed_registry() -> None:
    """ELO-Connector registrieren und für den Pilot-Tenant aktivieren."""
    registry.register(_ELO_CONNECTOR)
    registry.activate("dms-elo-01", PILOT_TENANT)
