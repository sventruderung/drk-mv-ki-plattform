"""Laufzeit-Konfiguration des elo-connectors.

Die ELO-Verbindung kommt aus system_settings (Admin-Console). Welches Auth-Paar
für die /api genutzt wird, hat der Verbindungstest ermittelt und in
`elo_auth_mode` hinterlegt (api = REST-API-Credentials, tomcat = Tomcat-Login).
"""

from dataclasses import dataclass

from .db import read_elo_settings

CONNECTOR_ID = "dms-elo-01"
REQUEST_TIMEOUT_S = 15.0
MAX_RESULTS_HARD_LIMIT = 500


class EloNotConfigured(RuntimeError):
    """In der Admin-Console ist noch keine ELO-Verbindung hinterlegt."""


@dataclass(frozen=True)
class EloConnection:
    base_url: str
    user: str
    password: str


async def get_elo_connection() -> EloConnection:
    cfg = await read_elo_settings()
    base = (cfg.get("elo_rest_base_url") or "").rstrip("/")
    if not base:
        raise EloNotConfigured("Keine ELO-Basis-URL in der Admin-Console hinterlegt.")
    if cfg.get("elo_auth_mode") == "tomcat":
        user, pwd = cfg.get("elo_tomcat_user", ""), cfg.get("elo_tomcat_password", "")
    else:  # Default: REST-API-Credentials
        user, pwd = cfg.get("elo_api_user", "0"), cfg.get("elo_api_password", "")
    return EloConnection(base_url=base, user=user, password=pwd)
