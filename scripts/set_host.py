#!/usr/bin/env python3
"""Netzwerk-/Host-Adresse der Plattform umstellen (nach IP- oder Standortwechsel).

Erkennt die aktuelle Server-IP automatisch (oder nimmt das Argument) und zieht
ALLE Stellen nach, die sonst auf die alte Adresse zeigen:
  1. KEYCLOAK_PUBLIC_URL in der .env
  2. Redirect-URIs beider Keycloak-Clients (alte bleiben erhalten — funktioniert
     dann in beiden Netzen / nach Rückzug)
  3. Neustart von api-gateway und open-webui (laden die neue Adresse)

Aufruf:
    python3 scripts/set_host.py              # IP automatisch erkennen
    python3 scripts/set_host.py 192.168.50.7 # IP explizit
    python3 scripts/set_host.py ki.drk-dbr.de --https   # öffentlicher Hostname

Abhängigkeit: sudo apt install python3-httpx
"""

import re
import subprocess
import sys
from pathlib import Path

import httpx

ENV_FILE = Path(".env")
KC = "http://localhost:8080/auth"
REALM = "drk-kv"


def fail(t: str):
    sys.exit(f"❌ {t}")


def env() -> dict:
    if not ENV_FILE.is_file():
        fail(".env nicht gefunden — bitte im Repo-Root ausführen.")
    return dict(
        re.findall(r"^([A-Z_]+)=(.*)$", ENV_FILE.read_text(encoding="utf-8"), re.M)
    )


def set_env(key: str, value: str):
    text = ENV_FILE.read_text(encoding="utf-8")
    pat = re.compile(rf"^{re.escape(key)}=.*$", re.M)
    text = pat.sub(f"{key}={value}", text) if pat.search(text) else text + f"\n{key}={value}\n"
    ENV_FILE.write_text(text, encoding="utf-8")


def detect_ip() -> str:
    out = subprocess.run(["hostname", "-I"], capture_output=True, text=True).stdout.split()
    if not out:
        fail("Server-IP nicht automatisch erkennbar — bitte als Argument angeben.")
    return out[0]


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    https = "--https" in sys.argv
    host = args[0] if args else detect_ip()
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

    print(f"=== Host-Umstellung auf: {host} ({scheme}) ===")

    # 1. Keycloak-Redirect-URIs ergänzen (Secret + Mapper NICHT anfassen!)
    e = env()
    tok = httpx.post(
        f"{KC}/realms/master/protocol/openid-connect/token",
        data={"grant_type": "password", "client_id": "admin-cli",
              "username": "admin", "password": e.get("KEYCLOAK_ADMIN_PASSWORD", "")},
        timeout=15,
    )
    if tok.status_code != 200:
        fail("Keycloak-Admin-Login fehlgeschlagen — läuft Keycloak? Passwort korrekt?")
    h = {"Authorization": f"Bearer {tok.json()['access_token']}"}

    for client_id, uris in redirects.items():
        cl = httpx.get(f"{KC}/admin/realms/{REALM}/clients?clientId={client_id}",
                       headers=h, timeout=15).json()
        if not cl:
            fail(f"Client {client_id} nicht gefunden.")
        cl = cl[0]
        merged = sorted(set(cl.get("redirectUris", [])) | set(uris))
        payload = {k: v for k, v in cl.items() if k not in ("secret", "protocolMappers")}
        payload["redirectUris"] = merged
        httpx.put(f"{KC}/admin/realms/{REALM}/clients/{cl['id']}", headers=h, json=payload, timeout=15)
        print(f"✅ Redirect-URIs ergänzt: {client_id}")

    # 2. .env aktualisieren
    set_env("KEYCLOAK_PUBLIC_URL", public_url)
    print(f"✅ KEYCLOAK_PUBLIC_URL = {public_url}")

    # 3. Bei HTTPS: Hostname auch in die Plattform-DB (Caddy-Zertifikat)
    if https:
        subprocess.run(
            ["docker", "compose", "exec", "-T", "postgres", "psql", "-U", "drk_app",
             "-d", "drk_platform", "-c",
             f"UPDATE system_settings SET value='{host}' WHERE key='public_hostname'"],
            capture_output=True,
        )

    # 4. Dienste neu starten, die die Adresse tragen
    print("→ Starte api-gateway und open-webui neu …")
    subprocess.run(["docker", "compose", "up", "-d", "--force-recreate",
                    "api-gateway", "open-webui"], check=True)

    base = f"https://{host}" if https else f"http://{host}:8000"
    print(f"\n=== Fertig. Verwaltung: {base}/admin  ·  Chat: "
          + (f"https://{host}" if https else f"http://{host}:3000") + " ===")
    print("Im Browser ab- und neu anmelden (frisches Token).")


if __name__ == "__main__":
    main()
