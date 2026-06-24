"""Instanz-Einstellungen (Hostname für HTTPS) + Caddy-TLS-Check.

- GET/PUT /settings/hostname: nur kv-admin, Änderung wird auditiert
- GET /tls/check: von Caddy (Docker-intern) vor jeder Zertifikats-Ausstellung
  aufgerufen — 200 nur für den hinterlegten Hostnamen (On-Demand-TLS)
"""

import asyncio
import re

import httpx
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel

from drk_shared.logging import get_logger

from ....db import plain_connection, tenant_connection
from ....keycloak_admin import KeycloakAdmin, KeycloakAdminError

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

    # Beim Setzen eines Hostnamens die HTTPS-Redirect-URIs in Keycloak ergänzen,
    # damit der Login direkt nach dem Umschalten nicht an einer Redirect-URI-
    # Abweichung scheitert. Schlägt das fehl (z.B. fehlende Rolle 'manage-clients'),
    # bleibt der Hostname gespeichert — wir melden den Hinweis nur zurück.
    redirects_added = False
    redirect_warning = ""
    if hostname:
        try:
            admin = KeycloakAdmin(request.app.state.settings)
            await admin.add_https_redirects(hostname)
            redirects_added = True
            async with tenant_connection(request.state.tenant_id) as conn:
                await conn.execute(
                    """
                    INSERT INTO audit_log (tenant_id, actor, action, object_type, object_id, info)
                    VALUES ($1, $2, 'settings.hostname.redirects', 'settings',
                            'keycloak_clients', $3)
                    """,
                    request.state.tenant_id, request.state.user_id or "",
                    f"HTTPS-Redirect-URIs ergänzt für {hostname}",
                )
        except (KeycloakAdminError, httpx.HTTPError) as e:
            detail = getattr(e, "detail", str(e)) or type(e).__name__
            redirect_warning = (
                "Redirect-URIs konnten nicht automatisch gesetzt werden "
                f"({detail}). Dem Keycloak-Service-Account fehlt vermutlich die "
                "Rolle 'manage-clients'. Ersatzweise auf dem Server ausführen: "
                f"python3 scripts/set_host.py {hostname} --https"
            )
            logger.info("settings.hostname.redirects_failed", detail=detail)

    # Issuer-/Env-Umstellung (KEYCLOAK_PUBLIC_URL) und Neustart laufen außerhalb
    # des Containers — ein einmaliger Host-Schritt, den nur set_host.py kann.
    command = f"python3 scripts/set_host.py {hostname} --https" if hostname else ""
    return {
        "hostname": hostname,
        "redirects_added": redirects_added,
        "redirect_warning": redirect_warning,
        "command": command,
    }


# ── ELO-Dokumentensystem (Connector-Verbindung) ─────────────────────────────
# Gesamtkonzept §3.2 "Konfigurieren": Verbindungsdaten + Secret werden hier in
# der Admin-Console gepflegt. Das Passwort liegt im Secret-Store (system_settings),
# wird NIE zurückgegeben; die Connector-Registry hält nur Metadaten + Tenant-
# Freigaben, kein Klartext-Secret (§7 #3 / ADR-003). Der elo-connector liest diese
# Werte zur Laufzeit aus dem Store.

class EloConfigRequest(BaseModel):
    base_url: str | None = None            # None = unverändert lassen
    tomcat_user: str | None = None         # Tomcat-Login (schützt Server/Doc)
    tomcat_password: str | None = None     # None = unverändert (Maske im UI)
    api_user: str | None = None            # REST-API Basic-Auth (ELO-Benutzer)
    api_password: str | None = None        # None = unverändert (Maske im UI)


def _strip_doc(url: str) -> str:
    """Erlaubt das Einfügen der .../rest-Archiv/doc-Adresse — /doc wird entfernt,
    sodass die API-Basis (.../rest-Archiv) gespeichert wird."""
    url = url.strip().rstrip("/")
    if url.endswith("/doc"):
        url = url[: -len("/doc")]
    return url


@router.get("/settings/elo")
async def get_elo_config(request: Request):
    """ELO-Verbindung lesen — Passwörter werden NIE zurückgegeben, nur ob gesetzt."""
    if "kv-admin" not in request.state.roles:
        raise HTTPException(status_code=403, detail="Rolle 'kv-admin' erforderlich.")
    async with plain_connection() as conn:
        rows = await conn.fetch(
            "SELECT key, value FROM system_settings WHERE key LIKE 'elo_%'"
        )
    cfg = {r["key"]: r["value"] for r in rows}
    return {
        "base_url": cfg.get("elo_rest_base_url", ""),
        "tomcat_user": cfg.get("elo_tomcat_user", ""),
        "tomcat_password_set": bool(cfg.get("elo_tomcat_password")),
        "api_user": cfg.get("elo_api_user", "0"),
        "api_password_set": bool(cfg.get("elo_api_password")),
    }


@router.put("/settings/elo")
async def set_elo_config(body: EloConfigRequest, request: Request):
    if "kv-admin" not in request.state.roles:
        raise HTTPException(status_code=403, detail="Rolle 'kv-admin' erforderlich.")
    values = {
        "elo_rest_base_url": _strip_doc(body.base_url) if body.base_url is not None else None,
        "elo_tomcat_user": body.tomcat_user,
        "elo_tomcat_password": body.tomcat_password,   # None = unverändert
        "elo_api_user": body.api_user,
        "elo_api_password": body.api_password,          # None = unverändert
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
    # AUDIT: nur DASS die Verbindung geändert wurde — niemals ein Passwort.
    async with tenant_connection(request.state.tenant_id) as conn:
        await conn.execute(
            """
            INSERT INTO audit_log (tenant_id, actor, action, object_type, object_id, info)
            VALUES ($1, $2, 'settings.elo', 'settings', 'elo', 'ELO-Verbindung geändert')
            """,
            request.state.tenant_id, request.state.user_id or "",
        )
    logger.info("settings.elo.changed")
    return {"saved": True}


@router.post("/settings/elo/test")
async def test_elo_config(request: Request):
    """Anmeldung am ELO REST Service prüfen.

    Probiert automatisch aus, mit welchem Zugangsdaten-Paar die /api antwortet
    (REST-API zuerst, dann Tomcat) — auf einem HTTP-Request kann nur ein
    Basic-Auth-Header mitgehen.
    """
    if "kv-admin" not in request.state.roles:
        raise HTTPException(status_code=403, detail="Rolle 'kv-admin' erforderlich.")
    async with plain_connection() as conn:
        rows = await conn.fetch(
            "SELECT key, value FROM system_settings WHERE key LIKE 'elo_%'"
        )
    cfg = {r["key"]: r["value"] for r in rows}
    base = (cfg.get("elo_rest_base_url") or "").rstrip("/")
    if not base:
        raise HTTPException(status_code=422, detail="Keine ELO-Basis-URL hinterlegt.")

    candidates: list[tuple[str, str, str]] = []
    if cfg.get("elo_api_user") or cfg.get("elo_api_password"):
        candidates.append(("REST-API", cfg.get("elo_api_user", "0"), cfg.get("elo_api_password", "")))
    if cfg.get("elo_tomcat_user") or cfg.get("elo_tomcat_password"):
        candidates.append(("Tomcat", cfg.get("elo_tomcat_user", ""), cfg.get("elo_tomcat_password", "")))
    if not candidates:
        raise HTTPException(status_code=422, detail="Keine Zugangsdaten hinterlegt.")

    probe = f"{base}/v3/api-docs"   # OpenAPI-Definition der Instanz
    last_status = None
    async with httpx.AsyncClient(timeout=8) as client:
        for label, user, pwd in candidates:
            try:
                resp = await client.get(probe, auth=httpx.BasicAuth(user, pwd))
            except httpx.HTTPError as e:
                raise HTTPException(status_code=502, detail=f"ELO nicht erreichbar: {type(e).__name__}")
            if resp.status_code < 400:
                # Funktionierenden Auth-Modus merken — der elo-connector nutzt ihn
                # für die /api-Aufrufe (api = REST-API-Credentials, tomcat = Tomcat).
                mode = "tomcat" if label == "Tomcat" else "api"
                async with plain_connection() as conn:
                    await conn.execute(
                        """
                        INSERT INTO system_settings (key, value, updated_at, updated_by)
                        VALUES ('elo_auth_mode', $1, now(), $2)
                        ON CONFLICT (key) DO UPDATE
                        SET value = $1, updated_at = now(), updated_by = $2
                        """,
                        mode, request.state.user_id or "",
                    )
                return {"ok": True, "auth": label}
            last_status = resp.status_code

    if last_status == 401:
        raise HTTPException(
            status_code=401,
            detail="Anmeldung am ELO-Server fehlgeschlagen — keines der Zugangsdaten-Paare "
            "wurde an der /api akzeptiert (Benutzer/Passwort prüfen).",
        )
    raise HTTPException(status_code=502, detail=f"ELO meldete HTTP {last_status}.")


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
    from ....branding import BRAND_NAME
    from ....monitor import send_alert

    err = await send_alert(
        f"{BRAND_NAME}: Testnachricht",
        "Diese Testnachricht bestätigt, dass der E-Mail-Alarm korrekt "
        "konfiguriert ist.\n\nVerwaltungs-UI → Einstellungen → Monitoring",
    )
    if err:
        raise HTTPException(status_code=502, detail=f"Versand fehlgeschlagen: {err}")
    return {"sent": True}


# ── Backup auf NAS (SMB/CIFS, z.B. Synology) ────────────────────────────────
# Zugangsdaten liegen verschlüsselt im Secret-Store (system_settings); das
# Passwort wird NIE zurückgegeben. Die geplante Sicherung läuft per cron auf dem
# Host (scripts/backup.sh liest diese Werte und lädt per smbclient hoch); der
# Test hier prüft Verbindung + Schreibrecht direkt aus dem Gateway.

TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


def _parse_nas_url(url: str) -> tuple[str, str, str]:
    """//server/freigabe/unterordner → (server, freigabe, unterordner).
    Akzeptiert auch Backslashes (\\\\nas\\backup)."""
    clean = url.strip().replace("\\", "/").lstrip("/")
    parts = [p for p in clean.split("/") if p]
    if len(parts) < 2:
        raise ValueError("NAS-URL muss mindestens //server/freigabe enthalten.")
    return parts[0], parts[1], "/".join(parts[2:])


def _smb_write_test(server: str, share: str, sub: str, user: str, pwd: str) -> None:
    """Blockierender SMB-Test: Sitzung öffnen, Testdatei schreiben + löschen."""
    import smbclient

    base = rf"\\{server}\{share}"
    folder = base + ("\\" + sub.replace("/", "\\") if sub else "")
    target = folder + r"\.drk_backup_test"
    smbclient.register_session(server, username=user, password=pwd, connection_timeout=8)
    try:
        if sub:
            smbclient.makedirs(folder, exist_ok=True)
        with smbclient.open_file(target, mode="wb") as fh:
            fh.write(b"drk-backup-test")
        smbclient.remove(target)
    finally:
        smbclient.delete_session(server)


class BackupConfigRequest(BaseModel):
    nas_url: str | None = None
    nas_user: str | None = None
    nas_password: str | None = None        # None = unverändert (Maske im UI)
    schedule_enabled: bool | None = None
    schedule_freq: str | None = None       # 'daily' | 'weekly'
    schedule_time: str | None = None       # 'HH:MM'
    schedule_weekday: str | None = None    # '1'..'7' (Mo..So), nur bei weekly


@router.get("/settings/backup")
async def get_backup_config(request: Request):
    if "kv-admin" not in request.state.roles:
        raise HTTPException(status_code=403, detail="Rolle 'kv-admin' erforderlich.")
    async with plain_connection() as conn:
        rows = await conn.fetch(
            "SELECT key, value FROM system_settings WHERE key LIKE 'backup_%' "
            "OR key = 'last_backup_at'"
        )
    cfg = {r["key"]: r["value"] for r in rows}
    return {
        "nas_url": cfg.get("backup_nas_url", ""),
        "nas_user": cfg.get("backup_nas_user", ""),
        "nas_password_set": bool(cfg.get("backup_nas_password")),
        "schedule_enabled": cfg.get("backup_schedule_enabled") == "true",
        "schedule_freq": cfg.get("backup_schedule_freq", "daily"),
        "schedule_time": cfg.get("backup_schedule_time", "02:30"),
        "schedule_weekday": cfg.get("backup_schedule_weekday", "1"),
        "last_backup_at": cfg.get("last_backup_at", ""),
    }


@router.put("/settings/backup")
async def set_backup_config(body: BackupConfigRequest, request: Request):
    if "kv-admin" not in request.state.roles:
        raise HTTPException(status_code=403, detail="Rolle 'kv-admin' erforderlich.")
    if body.schedule_freq is not None and body.schedule_freq not in ("daily", "weekly"):
        raise HTTPException(status_code=422, detail="Frequenz muss 'daily' oder 'weekly' sein.")
    if body.schedule_time is not None and not TIME_RE.match(body.schedule_time):
        raise HTTPException(status_code=422, detail="Uhrzeit im Format HH:MM angeben.")
    if body.schedule_weekday is not None and body.schedule_weekday not in [str(d) for d in range(1, 8)]:
        raise HTTPException(status_code=422, detail="Wochentag 1 (Mo) bis 7 (So).")
    values = {
        "backup_nas_url": body.nas_url,
        "backup_nas_user": body.nas_user,
        "backup_nas_password": body.nas_password,   # None = unverändert
        "backup_schedule_enabled": None if body.schedule_enabled is None
        else ("true" if body.schedule_enabled else "false"),
        "backup_schedule_freq": body.schedule_freq,
        "backup_schedule_time": body.schedule_time,
        "backup_schedule_weekday": body.schedule_weekday,
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
            VALUES ($1, $2, 'settings.backup', 'settings', 'backup', 'NAS-Backup-Konfiguration geändert')
            """,
            request.state.tenant_id, request.state.user_id or "",
        )
    logger.info("settings.backup.changed")
    return {"saved": True}


@router.post("/settings/backup/test")
async def test_backup_nas(request: Request):
    """Verbindung + Schreibrecht zum NAS prüfen (Testdatei schreiben + löschen)."""
    if "kv-admin" not in request.state.roles:
        raise HTTPException(status_code=403, detail="Rolle 'kv-admin' erforderlich.")
    async with plain_connection() as conn:
        rows = await conn.fetch(
            "SELECT key, value FROM system_settings WHERE key LIKE 'backup_nas_%'"
        )
    cfg = {r["key"]: r["value"] for r in rows}
    url = cfg.get("backup_nas_url", "")
    user = cfg.get("backup_nas_user", "")
    pwd = cfg.get("backup_nas_password", "")
    if not url or not user:
        raise HTTPException(status_code=422, detail="NAS-URL und Benutzer müssen gesetzt sein.")
    try:
        server, share, sub = _parse_nas_url(url)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    try:
        await asyncio.to_thread(_smb_write_test, server, share, sub, user, pwd)
    except Exception as e:  # noqa: BLE001 — Fehlertext zurückmelden (SMB-Bibliothek)
        logger.info("settings.backup.test_failed", error=type(e).__name__)
        raise HTTPException(status_code=502, detail=f"NAS-Test fehlgeschlagen: {e}")
    return {"ok": True}


@router.get("/tls/check")
async def tls_check(domain: str = "") -> Response:
    """Caddy On-Demand-TLS 'ask': 200 = Zertifikat ausstellen, 403 = ablehnen."""
    allowed = await _get_hostname()
    if allowed and domain.lower() == allowed:
        return Response(status_code=200)
    logger.info("tls.check.denied", domain=domain)
    return Response(status_code=403)
