#!/usr/bin/env python3
"""Keycloak-Ersteinrichtung — automatisiert Checkliste B in einem Lauf.

Erledigt über die Keycloak-Admin-API:
  1. Neues Client-Secret für drk-platform generieren → direkt in .env schreiben
  2. tenant_id-Mapper auf den echten KV-Namen setzen (beide Clients)
  3. Service-Account-Rollen view-users/manage-users zuweisen (Nutzer-Tab)
  4. Optional: HTTPS-Redirect-URIs für den öffentlichen Hostnamen eintragen
  5. Ersten Mandanten-Admin (kv-admin) anlegen

Auf dem Server im Repo-Root ausführen:  python3 scripts/setup_keycloak.py
Abhängigkeit: pip install httpx
"""

import getpass
import re
import sys
from pathlib import Path

import httpx

ENV_FILE = Path(".env")
KEYCLOAK_BASE = "http://localhost:8080/auth"
REALM = "drk-kv"
ADMIN_ROLES = ["view-users", "manage-users"]


def fail(text: str) -> None:
    sys.exit(f"❌ {text}")


def read_env() -> dict[str, str]:
    if not ENV_FILE.is_file():
        fail(".env nicht gefunden — bitte im Repo-Root ausführen (nach setup_dgx.sh).")
    env = {}
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip()
    return env


def write_env_value(key: str, value: str) -> None:
    text = ENV_FILE.read_text(encoding="utf-8")
    pattern = re.compile(rf"^{re.escape(key)}=.*$", re.MULTILINE)
    if pattern.search(text):
        text = pattern.sub(f"{key}={value}", text)
    else:
        text += f"\n{key}={value}\n"
    ENV_FILE.write_text(text, encoding="utf-8")


class KC:
    def __init__(self, base: str, admin_password: str):
        self.base = base
        resp = httpx.post(
            f"{base}/realms/master/protocol/openid-connect/token",
            data={
                "grant_type": "password",
                "client_id": "admin-cli",
                "username": "admin",
                "password": admin_password,
            },
            timeout=15,
        )
        if resp.status_code != 200:
            fail("Keycloak-Admin-Login fehlgeschlagen — Passwort prüfen "
                 "(KEYCLOAK_ADMIN_PASSWORD in .env).")
        self.headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

    def req(self, method: str, path: str, **kw) -> httpx.Response:
        resp = httpx.request(
            method, f"{self.base}/admin/realms/{REALM}{path}",
            headers=self.headers, timeout=30, **kw,
        )
        if resp.status_code >= 400 and resp.status_code != 409:
            fail(f"Keycloak-API-Fehler {resp.status_code} bei {path}: {resp.text[:200]}")
        return resp

    def client_by_id(self, client_id: str) -> dict:
        clients = self.req("GET", f"/clients?clientId={client_id}").json()
        if not clients:
            fail(f"Client {client_id} nicht gefunden — Realm-Import prüfen.")
        return clients[0]


def main() -> None:
    print("=== DRK KI-Plattform — Keycloak-Ersteinrichtung ===\n")
    env = read_env()

    admin_pw = env.get("KEYCLOAK_ADMIN_PASSWORD") or getpass.getpass("Keycloak-Admin-Passwort: ")
    kc = KC(KEYCLOAK_BASE, admin_pw)
    print("✅ Mit Keycloak verbunden.\n")

    # --- Eingaben ---
    kv_name = input("Name des Kreisverbands (z.B. parchim): ").strip().lower()
    if not re.match(r"^[a-z0-9-]{2,40}$", kv_name):
        fail("Ungültiger Name — nur Kleinbuchstaben, Ziffern, Bindestriche.")
    tenant_id = f"kv-{kv_name}"

    hostname = input("Öffentlicher Hostname für HTTPS (leer = später): ").strip().lower()

    admin_user = input("Benutzername für den ersten Mandanten-Admin: ").strip()
    admin_user_pw = getpass.getpass(f"Startpasswort für {admin_user} (min. 10 Zeichen): ")
    if len(admin_user_pw) < 10:
        fail("Passwort zu kurz.")
    print()

    platform = kc.client_by_id("drk-platform")
    admin_ui = kc.client_by_id("drk-admin-ui")

    # --- 1. Client-Secret rotieren und in .env schreiben ---
    secret = kc.req("POST", f"/clients/{platform['id']}/client-secret").json()["value"]
    write_env_value("KEYCLOAK_CLIENT_SECRET", secret)
    print("✅ Client-Secret generiert und in .env eingetragen.")

    # --- 2. tenant_id-Mapper in beiden Clients setzen ---
    for client in (platform, admin_ui):
        mappers = kc.req("GET", f"/clients/{client['id']}/protocol-mappers/models").json()
        for m in mappers:
            if m.get("config", {}).get("claim.name") == "tenant_id":
                m["config"]["claim.value"] = tenant_id
                kc.req("PUT", f"/clients/{client['id']}/protocol-mappers/models/{m['id']}", json=m)
    print(f"✅ tenant_id-Mapper auf '{tenant_id}' gesetzt (beide Clients).")

    # --- 3. Service-Account-Rollen für die Nutzerverwaltung ---
    sa_user = kc.req("GET", f"/clients/{platform['id']}/service-account-user").json()
    realm_mgmt = kc.client_by_id("realm-management")
    available = kc.req(
        "GET", f"/users/{sa_user['id']}/role-mappings/clients/{realm_mgmt['id']}/available"
    ).json()
    to_assign = [r for r in available if r["name"] in ADMIN_ROLES]
    if to_assign:
        kc.req("POST", f"/users/{sa_user['id']}/role-mappings/clients/{realm_mgmt['id']}",
               json=to_assign)
    print("✅ Service-Account-Rollen (view-users, manage-users) zugewiesen.")

    # --- 4. HTTPS-Redirect-URIs ---
    if hostname:
        for client, uris in (
            (platform, [f"https://{hostname}/*"]),
            (admin_ui, [f"https://{hostname}/admin/*"]),
        ):
            merged = sorted(set(client.get("redirectUris", [])) | set(uris))
            kc.req("PUT", f"/clients/{client['id']}",
                   json={**client, "redirectUris": merged})
        write_env_value("KEYCLOAK_PUBLIC_URL", f"https://{hostname}/auth")
        print(f"✅ Redirect-URIs für https://{hostname} eingetragen, .env aktualisiert.")
        print("   → Hostname nach dem Start zusätzlich im Verwaltungs-UI eintragen (⚙️).")

    # --- 5. Ersten kv-admin anlegen ---
    resp = kc.req("POST", "/users", json={
        "username": admin_user,
        "enabled": True,
        "credentials": [{"type": "password", "value": admin_user_pw, "temporary": True}],
        "requiredActions": ["UPDATE_PASSWORD"],
    })
    if resp.status_code == 409:
        print(f"⏭️  Nutzer {admin_user} existiert bereits — Rollen werden geprüft.")
        user_id = kc.req("GET", f"/users?username={admin_user}&exact=true").json()[0]["id"]
    else:
        user_id = resp.headers["Location"].rsplit("/", 1)[-1]
    all_roles = kc.req("GET", "/roles").json()
    wanted = [r for r in all_roles if r["name"] in ("kv-admin", "kv-alle")]
    kc.req("POST", f"/users/{user_id}/role-mappings/realm",
           json=[{"id": r["id"], "name": r["name"]} for r in wanted])
    print(f"✅ Mandanten-Admin '{admin_user}' angelegt (Rollen: kv-admin, kv-alle).")

    print("\n=== Fertig. Jetzt Services neu laden: docker compose up -d ===")
    print("Danach: Verwaltungs-UI öffnen (/admin) und mit dem neuen Admin anmelden.")


if __name__ == "__main__":
    main()
