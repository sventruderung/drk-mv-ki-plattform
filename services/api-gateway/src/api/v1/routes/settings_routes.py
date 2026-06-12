"""Instanz-Einstellungen (Hostname für HTTPS) + Caddy-TLS-Check.

- GET/PUT /settings/hostname: nur kv-admin, Änderung wird auditiert
- GET /tls/check: von Caddy (Docker-intern) vor jeder Zertifikats-Ausstellung
  aufgerufen — 200 nur für den hinterlegten Hostnamen (On-Demand-TLS)
"""

import re

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel

from drk_shared.logging import get_logger

from ....db import plain_connection, tenant_connection

logger = get_logger(__name__)
router = APIRouter(tags=["settings"])

HOSTNAME_RE = re.compile(
    r"^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$"
)


async def _get_hostname() -> str:
    async with plain_connection() as conn:
        row = await conn.fetchrow(
            "SELECT value FROM system_settings WHERE key = 'public_hostname'"
        )
    return row["value"] if row else ""


class HostnameRequest(BaseModel):
    hostname: str


@router.get("/settings/hostname")
async def get_hostname(request: Request):
    if "kv-admin" not in request.state.roles:
        raise HTTPException(status_code=403, detail="Rolle 'kv-admin' erforderlich.")
    return {"hostname": await _get_hostname()}


@router.put("/settings/hostname")
async def set_hostname(body: HostnameRequest, request: Request):
    if "kv-admin" not in request.state.roles:
        raise HTTPException(status_code=403, detail="Rolle 'kv-admin' erforderlich.")

    hostname = body.hostname.strip().lower()
    if hostname and not HOSTNAME_RE.match(hostname):
        raise HTTPException(
            status_code=422,
            detail="Ungültiger Hostname. Erwartet z.B. ki.kv-name.drk.de "
            "(nur Kleinbuchstaben, Ziffern, Bindestriche, Punkte).",
        )

    async with plain_connection() as conn:
        await conn.execute(
            """
            UPDATE system_settings
            SET value = $1, updated_at = now(), updated_by = $2
            WHERE key = 'public_hostname'
            """,
            hostname, request.state.user_id or "",
        )
    # AUDIT (§6.2): Hostname-Änderung protokollieren
    async with tenant_connection(request.state.tenant_id) as conn:
        await conn.execute(
            """
            INSERT INTO audit_log (tenant_id, actor, action, object_type, object_id, info)
            VALUES ($1, $2, 'settings.hostname', 'settings', 'public_hostname', $3)
            """,
            request.state.tenant_id, request.state.user_id or "", hostname or "(leer)",
        )
    logger.info("settings.hostname.changed", hostname=hostname)
    return {"hostname": hostname}


class ApiKeysRequest(BaseModel):
    openai_api_key: str | None = None      # None = unverändert lassen
    anthropic_api_key: str | None = None


@router.get("/settings/apikeys")
async def get_apikey_status(request: Request):
    """Nur Konfigurations-Status — Keys werden NIE zurückgegeben."""
    if "kv-admin" not in request.state.roles:
        raise HTTPException(status_code=403, detail="Rolle 'kv-admin' erforderlich.")
    async with plain_connection() as conn:
        rows = await conn.fetch(
            "SELECT key, value <> '' AS configured FROM system_settings "
            "WHERE key IN ('openai_api_key', 'anthropic_api_key')"
        )
    return {r["key"]: r["configured"] for r in rows}


@router.put("/settings/apikeys")
async def set_apikeys(body: ApiKeysRequest, request: Request):
    if "kv-admin" not in request.state.roles:
        raise HTTPException(status_code=403, detail="Rolle 'kv-admin' erforderlich.")
    updated = []
    async with plain_connection() as conn:
        for key, value in (
            ("openai_api_key", body.openai_api_key),
            ("anthropic_api_key", body.anthropic_api_key),
        ):
            if value is not None:
                await conn.execute(
                    """
                    INSERT INTO system_settings (key, value, updated_at, updated_by)
                    VALUES ($1, $2, now(), $3)
                    ON CONFLICT (key) DO UPDATE
                    SET value = $2, updated_at = now(), updated_by = $3
                    """,
                    key, value.strip(), request.state.user_id or "",
                )
                updated.append(key)
    if updated:
        # AUDIT: nur DASS ein Key geändert wurde — niemals den Key selbst
        async with tenant_connection(request.state.tenant_id) as conn:
            await conn.execute(
                """
                INSERT INTO audit_log (tenant_id, actor, action, object_type, object_id, info)
                VALUES ($1, $2, 'settings.apikeys', 'settings', 'apikeys', $3)
                """,
                request.state.tenant_id, request.state.user_id or "",
                f"Geändert: {', '.join(updated)}",
            )
    return {"updated": updated}


class SmtpRequest(BaseModel):
    smtp_host: str | None = None
    smtp_port: str | None = None
    smtp_user: str | None = None
    smtp_password: str | None = None   # None = unverändert
    alert_email: str | None = None
    alerts_enabled: bool | None = None


@router.get("/settings/smtp")
async def get_smtp(request: Request):
    if "kv-admin" not in request.state.roles:
        raise HTTPException(status_code=403, detail="Rolle 'kv-admin' erforderlich.")
    async with plain_connection() as conn:
        rows = await conn.fetch(
            "SELECT key, value FROM system_settings WHERE key LIKE 'smtp_%' "
            "OR key IN ('alert_email', 'alerts_enabled')"
        )
    cfg = {r["key"]: r["value"] for r in rows}
    return {
        "smtp_host": cfg.get("smtp_host", ""),
        "smtp_port": cfg.get("smtp_port", "587"),
        "smtp_user": cfg.get("smtp_user", ""),
        "smtp_password_set": bool(cfg.get("smtp_password")),
        "alert_email": cfg.get("alert_email", ""),
        "alerts_enabled": cfg.get("alerts_enabled") == "true",
    }


@router.put("/settings/smtp")
async def set_smtp(body: SmtpRequest, request: Request):
    if "kv-admin" not in request.state.roles:
        raise HTTPException(status_code=403, detail="Rolle 'kv-admin' erforderlich.")
    values = {
        "smtp_host": body.smtp_host,
        "smtp_port": body.smtp_port,
        "smtp_user": body.smtp_user,
        "smtp_password": body.smtp_password,
        "alert_email": body.alert_email,
        "alerts_enabled": None if body.alerts_enabled is None
        else ("true" if body.alerts_enabled else "false"),
    }
    async with plain_connection() as conn:
        for key, value in values.items():
            if value is not None:
                await conn.execute(
                    """
                    INSERT INTO system_settings (key, value, updated_at, updated_by)
                    VALUES ($1, $2, now(), $3)
                    ON CONFLICT (key) DO UPDATE
                    SET value = $2, updated_at = now(), updated_by = $3
                    """,
                    key, value.strip() if isinstance(value, str) else value,
                    request.state.user_id or "",
                )
    async with tenant_connection(request.state.tenant_id) as conn:
        await conn.execute(
            """
            INSERT INTO audit_log (tenant_id, actor, action, object_type, object_id, info)
            VALUES ($1, $2, 'settings.smtp', 'settings', 'smtp', 'Alarm-Konfiguration geändert')
            """,
            request.state.tenant_id, request.state.user_id or "",
        )
    return {"saved": True}


@router.post("/settings/smtp/test")
async def smtp_test(request: Request):
    if "kv-admin" not in request.state.roles:
        raise HTTPException(status_code=403, detail="Rolle 'kv-admin' erforderlich.")
    from ....monitor import send_alert

    err = await send_alert(
        "DRK KI-Plattform: Testnachricht",
        "Diese Testnachricht bestätigt, dass der E-Mail-Alarm korrekt "
        "konfiguriert ist.\n\nVerwaltungs-UI → Einstellungen → Monitoring",
    )
    if err:
        raise HTTPException(status_code=502, detail=f"Versand fehlgeschlagen: {err}")
    return {"sent": True}


@router.get("/tls/check")
async def tls_check(domain: str = "") -> Response:
    """Caddy On-Demand-TLS 'ask': 200 = Zertifikat ausstellen, 403 = ablehnen."""
    allowed = await _get_hostname()
    if allowed and domain.lower() == allowed:
        return Response(status_code=200)
    logger.info("tls.check.denied", domain=domain)
    return Response(status_code=403)
