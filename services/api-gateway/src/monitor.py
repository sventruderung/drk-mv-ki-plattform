"""Hintergrund-Monitor: prüft die Dienste minütlich.

Bei einem Zustandswechsel (gesund → ausgefallen oder zurück) wird ein
Ereignis gespeichert und — falls konfiguriert — eine E-Mail an den
Administrator geschickt. Konfiguration: Verwaltungs-UI → ⚙️ Einstellungen.
"""

import asyncio
import smtplib
from email.message import EmailMessage

from drk_shared.logging import get_logger

from .db import plain_connection

logger = get_logger(__name__)

CHECK_INTERVAL = 60  # Sekunden
_previous: dict[str, bool] = {}


async def _smtp_config() -> dict[str, str]:
    keys = ("smtp_host", "smtp_port", "smtp_user", "smtp_password",
            "alert_email", "alerts_enabled")
    async with plain_connection() as conn:
        rows = await conn.fetch(
            "SELECT key, value FROM system_settings WHERE key = ANY($1)", list(keys)
        )
    return {r["key"]: r["value"] for r in rows}


def _send_mail_sync(cfg: dict, subject: str, body: str) -> None:
    msg = EmailMessage()
    msg["From"] = cfg.get("smtp_user") or f"ki-plattform@{cfg['smtp_host']}"
    msg["To"] = cfg["alert_email"]
    msg["Subject"] = subject
    msg.set_content(body)
    port = int(cfg.get("smtp_port") or 587)
    with smtplib.SMTP(cfg["smtp_host"], port, timeout=20) as server:
        server.ehlo()
        if port != 25:
            server.starttls()
            server.ehlo()
        if cfg.get("smtp_user"):
            server.login(cfg["smtp_user"], cfg.get("smtp_password", ""))
        server.send_message(msg)


async def send_alert(subject: str, body: str) -> str | None:
    """Mail senden; gibt Fehlertext zurück oder None bei Erfolg."""
    cfg = await _smtp_config()
    if not (cfg.get("smtp_host") and cfg.get("alert_email")):
        return "SMTP nicht konfiguriert (Host/Empfänger fehlen)"
    try:
        await asyncio.get_event_loop().run_in_executor(
            None, _send_mail_sync, cfg, subject, body
        )
        return None
    except Exception as e:  # SMTP-Fehler dürfen den Monitor nie stoppen
        return f"{type(e).__name__}: {e}"


async def _record_event(name: str, ok: bool, detail: str) -> None:
    async with plain_connection() as conn:
        await conn.execute(
            "INSERT INTO monitor_events (check_name, ok, detail) VALUES ($1, $2, $3)",
            name, ok, detail,
        )


async def run(settings) -> None:
    """Endlosschleife — wird in der Gateway-Lifespan gestartet."""
    from .api.v1.routes.system import collect_checks

    await asyncio.sleep(30)  # Diensten Zeit zum Hochfahren geben
    logger.info("monitor.started", interval=CHECK_INTERVAL)
    while True:
        try:
            checks = await collect_checks(settings)
            changed: list[dict] = []
            for c in checks:
                prev = _previous.get(c["name"])
                if prev is not None and prev != c["ok"]:
                    changed.append(c)
                    await _record_event(c["name"], c["ok"], c.get("detail", ""))
                _previous[c["name"]] = c["ok"]

            if changed:
                cfg = await _smtp_config()
                if cfg.get("alerts_enabled") == "true":
                    down = [c for c in changed if not c["ok"]]
                    up = [c for c in changed if c["ok"]]
                    subject = "⚠️ DRK KI-Plattform: Störung" if down \
                        else "✅ DRK KI-Plattform: wiederhergestellt"
                    lines = [
                        f"{'❌' if not c['ok'] else '✅'} {c['name']}"
                        + (f" — {c['detail']}" if c.get("detail") else "")
                        for c in down + up
                    ]
                    err = await send_alert(
                        subject,
                        "Statuswechsel der DRK KI-Plattform:\n\n"
                        + "\n".join(lines)
                        + "\n\nDetails: Verwaltungs-UI → Einstellungen → Systemstatus",
                    )
                    if err:
                        logger.info("monitor.mail_failed", error=err)
                for c in changed:
                    logger.info("monitor.state_change", check=c["name"], ok=c["ok"])
        except asyncio.CancelledError:
            raise
        except Exception as e:  # Monitor läuft immer weiter
            logger.info("monitor.error", error=f"{type(e).__name__}: {e}")
        await asyncio.sleep(CHECK_INTERVAL)
