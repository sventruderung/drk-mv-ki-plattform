#!/usr/bin/env python3
"""Netzwerk-/Host-Adresse der Plattform an die aktuelle IP anpassen.

Zieht ALLE Stellen nach, die sonst auf die alte Adresse zeigen:
  1. KEYCLOAK_PUBLIC_URL in der .env
  2. Redirect-URIs beider Keycloak-Clients (alte bleiben erhalten)
  3. Neustart von api-gateway + open-webui (nur wenn sich etwas geändert hat)

Idempotent: Läuft die IP schon korrekt, passiert nichts (kein Neustart).
Dadurch gefahrlos automatisch beim Boot / bei IP-Wechsel ausführbar.

Manuell:
    python3 scripts/set_host.py               # IP automatisch erkennen
    python3 scripts/set_host.py 192.168.50.7  # IP explizit
    python3 scripts/set_host.py ki.kv.de --https   # öffentlicher Hostname

Automatik einrichten (einmalig, als root) — danach kein Handgriff mehr nötig:
    sudo python3 scripts/set_host.py --install-auto

Abhängigkeit: sudo apt install python3-httpx
"""

import os
import re
import subprocess
import sys
import time
from pathlib import Path

import httpx

REPO_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = REPO_DIR / ".env"
KC = "http://localhost:8080/auth"
REALM = "drk-kv"


def fail(t: str):
    sys.exit(f"❌ {t}")


def env() -> dict:
    if not ENV_FILE.is_file():
        fail(".env nicht gefunden — bitte im Repo-Root ausführen.")
    return dict(
        re.findall(r"^([A-Z0-9_]+)=(.*)$", ENV_FILE.read_text(encoding="utf-8"), re.M)
    )


def set_env(key: str, value: str):
    text = ENV_FILE.read_text(encoding="utf-8")
    pat = re.compile(rf"^{re.escape(key)}=.*$", re.M)
    text = pat.sub(f"{key}={value}", text) if pat.search(text) else text + f"\n{key}={value}\n"
    ENV_FILE.write_text(text, encoding="utf-8")


def detect_ip() -> str:
    out = subprocess.run(["hostname", "-I"], capture_output=True, text=True).stdout.split()
    # Echte LAN-IP bevorzugen (Docker-Bridges 172.x überspringen)
    lan = [ip for ip in out if ip.startswith("192.168.") or ip.startswith("10.")]
    if lan:
        return lan[0]
    if out:
        return out[0]
    fail("Server-IP nicht automatisch erkennbar — bitte als Argument angeben.")


def _dc(*args: str, **kw):
    """docker compose im Repo-Verzeichnis."""
    return subprocess.run(["docker", "compose", *args], cwd=REPO_DIR, **kw)


def get_token(admin_pw: str, wait: bool) -> str | None:
    """Keycloak-Admin-Token holen. wait=True: bis zu ~2 Min auf Keycloak warten
    (für den automatischen Lauf beim Booten, wenn Keycloak noch hochfährt)."""
    tries = 40 if wait else 1
    for i in range(tries):
        try:
            r = httpx.post(
                f"{KC}/realms/master/protocol/openid-connect/token",
                data={"grant_type": "password", "client_id": "admin-cli",
                      "username": "admin", "password": admin_pw},
                timeout=10,
            )
            if r.status_code == 200:
                return r.json()["access_token"]
        except httpx.HTTPError:
            pass
        if wait and i < tries - 1:
            time.sleep(3)
    return None


def reconcile(host: str, https: bool, auto: bool):
    scheme = "https" if https else "http"
    if https:
        public_url = f"https://{host}/auth"
        redirects = {
            "drk-platform": [f"https://{host}/*"],
            "drk-admin-ui": [f"https://{host}/admin/*"],
        }
    else:
        public_url = f"http://{host}:8080/auth"
        redirects = {
            "drk-platform": [f"http://{host}:3000/*", f"http://{host}:8000/*"],
            "drk-admin-ui": [f"http://{host}:8000/*"],
        }

    if not auto:
        print(f"=== Host-Abgleich: {host} ({scheme}) ===")

    e = env()
    token = get_token(e.get("KEYCLOAK_ADMIN_PASSWORD", ""), wait=auto)
    if not token:
        # Im Automatik-Lauf (z.B. sehr früh beim Boot) leise aufgeben — der
        # nächste Trigger/Boot holt es nach. Manuell: klarer Fehler.
        if auto:
            print("⏭️  Keycloak (noch) nicht erreichbar — übersprungen.")
            return
        fail("Keycloak-Admin-Login fehlgeschlagen — läuft Keycloak? Passwort korrekt?")
    h = {"Authorization": f"Bearer {token}"}

    changed = False
    for client_id, uris in redirects.items():
        arr = httpx.get(f"{KC}/admin/realms/{REALM}/clients?clientId={client_id}",
                        headers=h, timeout=15).json()
        if not arr:
            fail(f"Client {client_id} nicht gefunden.")
        cl = arr[0]
        current = set(cl.get("redirectUris", []))
        if not set(uris) <= current:      # fehlt mindestens eine URI?
            payload = {k: v for k, v in cl.items() if k not in ("secret", "protocolMappers")}
            payload["redirectUris"] = sorted(current | set(uris))
            httpx.put(f"{KC}/admin/realms/{REALM}/clients/{cl['id']}",
                      headers=h, json=payload, timeout=15)
            changed = True
            if not auto:
                print(f"✅ Redirect-URIs ergänzt: {client_id}")

    if e.get("KEYCLOAK_PUBLIC_URL") != public_url:
        set_env("KEYCLOAK_PUBLIC_URL", public_url)
        changed = True
        if not auto:
            print(f"✅ KEYCLOAK_PUBLIC_URL = {public_url}")

    if https:
        _dc("exec", "-T", "postgres", "psql", "-U", "drk_app", "-d", "drk_platform",
            "-c", f"UPDATE system_settings SET value='{host}' WHERE key='public_hostname'",
            capture_output=True)

    if not changed:
        print(f"✓ Adresse bereits aktuell ({host}) — kein Neustart nötig.")
        return

    print("→ Adresse geändert — starte api-gateway und open-webui neu …")
    _dc("up", "-d", "--force-recreate", "api-gateway", "open-webui", check=True)
    base = f"https://{host}" if https else f"http://{host}:8000"
    print(f"=== Fertig. Verwaltung: {base}/admin === (im Browser neu anmelden)")


# ── Automatik einrichten (systemd + NetworkManager-Hook) ────────────────────

SERVICE_PATH = "/etc/systemd/system/drk-hostsync.service"
DISPATCH_PATH = "/etc/NetworkManager/dispatcher.d/90-drk-hostsync"


def install_auto():
    if os.geteuid() != 0:
        fail("Bitte mit sudo ausführen: sudo python3 scripts/set_host.py --install-auto")
    user = os.environ.get("SUDO_USER") or REPO_DIR.owner()
    service = f"""[Unit]
Description=kv-brain/DRK Host-Sync (Keycloak-URL + Redirect-URIs an aktuelle IP)
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User={user}
WorkingDirectory={REPO_DIR}
ExecStart=/usr/bin/python3 {REPO_DIR}/scripts/set_host.py --auto

[Install]
WantedBy=multi-user.target
"""
    dispatch = (
        "#!/bin/sh\n"
        "# Bei jeder Adressänderung den Host-Sync anstoßen (IP-Wechsel im Betrieb)\n"
        'case "$2" in\n'
        "  up|dhcp4-change|dhcp6-change) systemctl start drk-hostsync.service ;;\n"
        "esac\n"
    )
    Path(SERVICE_PATH).write_text(service, encoding="utf-8")
    Path(DISPATCH_PATH).write_text(dispatch, encoding="utf-8")
    os.chmod(DISPATCH_PATH, 0o755)
    subprocess.run(["systemctl", "daemon-reload"], check=True)
    subprocess.run(["systemctl", "enable", "drk-hostsync.service"], check=True)
    print("✅ Automatik eingerichtet:")
    print(f"   • {SERVICE_PATH} (läuft bei jedem Boot, nach Docker)")
    print(f"   • {DISPATCH_PATH} (läuft bei jedem IP-Wechsel)")
    print("Ab jetzt passt sich die Plattform ohne Zutun an die aktuelle IP an.")
    print("Sofort einmal ausführen:  sudo -u %s python3 %s/scripts/set_host.py"
          % (user, REPO_DIR))


def main():
    if "--install-auto" in sys.argv:
        install_auto()
        return
    auto = "--auto" in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    https = "--https" in sys.argv
    host = args[0] if args else detect_ip()
    reconcile(host, https, auto)


if __name__ == "__main__":
    main()
