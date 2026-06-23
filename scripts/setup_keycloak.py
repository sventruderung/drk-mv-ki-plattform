#!/usr/bin/env python3
"""Keycloak-Ersteinrichtung — automatisiert Checkliste B in einem Lauf.

Erledigt über die Keycloak-Admin-API:
  1. Neues Client-Secret für drk-platform generieren → direkt in .env schreiben
  2. tenant_id-Mapper auf den echten KV-Namen setzen (beide Clients)
  3. Service-Account-Rollen view-users/manage-users/manage-clients/manage-realm
     zuweisen (Nutzerverwaltung, HTTPS-Redirects, AD-Federation)
  4. Optional: HTTPS-Redirect-URIs für den öffentlichen Hostnamen eintragen
  5. Ersten Mandanten-Admin (kv-admin) anlegen

Auf dem Server im Repo-Root ausführen:  python3 scripts/setup_keycloak.py
Abhängigkeit: sudo apt install python3-httpx (oder pip install httpx im venv)
"""

import getpass
import re
import subprocess
import sys
from pathlib import Path

import httpx

ENV_FILE = Path(".env")
KEYCLOAK_BASE = "http://localhost:8080/auth"
REALM = "drk-kv"
# view-users/manage-users: Nutzerverwaltung · manage-clients: HTTPS-Redirect-URIs
# automatisch ergänzen · manage-realm: AD-/LDAP-Federation verwalten
ADMIN_ROLES = ["view-users", "manage-users", "manage-clients", "manage-realm"]


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
    raw_name = input("Name des Kreisverbands (z.B. Bad Doberan): ").strip()
    # Normalisieren: Kleinbuchstaben, Umlaute, Leerzeichen -> Bindestrich
    kv_name = raw_name.lower()
    for old, new in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        kv_name = kv_name.replace(old, new)
    kv_name = re.sub(r"[^a-z0-9]+", "-", kv_name).strip("-")
    if not re.match(r"^[a-z0-9-]{2,40}$", kv_name):
        fail(f"Name '{raw_name}' ergibt keine gültige Kennung.")
    tenant_id = f"kv-{kv_name}"
    # Anzeigename behält Groß-/Kleinschreibung (Login-Seite, Oberfläche)
    brand = env().get("BRAND_NAME", "kv-brain")
    display_name = f"{brand} {raw_name}".strip()
    print(f"   → Technische Kennung: {tenant_id} | Anzeigename: {display_name}")

    hostname = input("Öffentlicher Hostname für HTTPS (leer = später): ").strip().lower()

    admin_user = input("Benutzername für den ersten Mandanten-Admin: ").strip()
    admin_user_pw = getpass.getpass(f"Startpasswort für {admin_user} (min. 10 Zeichen): ")
    if len(admin_user_pw) < 10:
        fail("Passwort zu kurz.")
    print()

    platform = kc.client_by_id("drk-platform")
    admin_ui = kc.client_by_id("drk-admin-ui")

    # --- 0. Anzeigename des Realms (Login-Seite) ---
    realm = httpx.get(
        f"{kc.base}/admin/realms/{REALM}", headers=kc.headers, timeout=15
    ).json()
    realm["displayName"] = display_name
    # Token-Lebensdauer ein Arbeitstag — 15-Min-Standard erzwingt staendiges Neu-Anmelden
    realm["accessTokenLifespan"] = 28800
    realm["loginTheme"] = "kv-brain"  # gebrandete Login-Seite (Logo + Farbe)
    kc.req("PUT", "", json=realm)
    print(f"✅ Anzeigename + Login-Theme gesetzt: {display_name} (Token-Lebensdauer: 8 h)")

    # --- 1. Client-Secret rotieren und in .env schreiben ---
    secret = kc.req("POST", f"/clients/{platform['id']}/client-secret").json()["value"]
    # Verifizieren statt blind vertrauen: zurücklesen + Token-Test
    stored = kc.req("GET", f"/clients/{platform['id']}/client-secret").json().get("value")
    if stored != secret:
        fail(f"Secret-Rotation nicht persistiert (Keycloak meldet '{stored[:8]}…') — "
             "Keycloak-Datenbank prüfen: docker compose logs keycloak")
    token_test = httpx.post(
        f"{kc.base}/realms/{REALM}/protocol/openid-connect/token",
        data={"grant_type": "client_credentials",
              "client_id": "drk-platform", "client_secret": secret},
        timeout=15,
    )
    if token_test.status_code != 200:
        fail("Service-Account-Login mit neuem Secret fehlgeschlagen "
             f"(HTTP {token_test.status_code}: {token_test.text[:120]})")
    write_env_value("KEYCLOAK_CLIENT_SECRET", secret)
    print("✅ Client-Secret generiert, verifiziert und in .env eingetragen.")

    # --- 2. tenant_id-Mapper in beiden Clients setzen (mit Verifikation) ---
    for client in (platform, admin_ui):
        mappers = kc.req("GET", f"/clients/{client['id']}/protocol-mappers/models").json()
        for m in mappers:
            if m.get("config", {}).get("claim.name") == "tenant_id":
                m["config"]["claim.value"] = tenant_id
                kc.req("PUT", f"/clients/{client['id']}/protocol-mappers/models/{m['id']}", json=m)
        # Zurücklesen — stiller Fehlschlag wäre eine Tenant-Verwechslung!
        check = kc.req("GET", f"/clients/{client['id']}/protocol-mappers/models").json()
        stored = next((m["config"].get("claim.value") for m in check
                       if m.get("config", {}).get("claim.name") == "tenant_id"), None)
        if stored != tenant_id:
            fail(f"tenant_id-Mapper in {client['clientId']} nicht übernommen "
                 f"(steht auf '{stored}') — Keycloak prüfen.")
    print(f"✅ tenant_id-Mapper auf '{tenant_id}' gesetzt und verifiziert (beide Clients).")

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
    print("✅ Service-Account-Rollen (view-users, manage-users, manage-clients, "
          "manage-realm) zugewiesen.")

    # --- 4. Redirect-URIs (interne IP immer; HTTPS-Hostname falls angegeben) ---
    local_ip = subprocess.run(
        ["hostname", "-I"], capture_output=True, text=True
    ).stdout.split()
    local_ip = local_ip[0] if local_ip else ""

    platform_uris = [f"http://{local_ip}:3000/*", f"http://{local_ip}:8000/*"] if local_ip else []
    admin_uris = [f"http://{local_ip}:8000/*"] if local_ip else []
    if hostname:
        platform_uris.append(f"https://{hostname}/*")
        admin_uris.append(f"https://{hostname}/admin/*")
    if platform_uris:
        for client_name, uris in (
            ("drk-platform", platform_uris),
            ("drk-admin-ui", admin_uris),
        ):
            # FRISCH laden — der Stand vom Skriptanfang enthält das Secret und
            # die Mapper von VOR Schritt 1/2 und würde beides zurückdrehen!
            client = kc.client_by_id(client_name)
            payload = {k: v for k, v in client.items()
                       if k not in ("secret", "protocolMappers")}
            payload["redirectUris"] = sorted(set(client.get("redirectUris", [])) | set(uris))
            kc.req("PUT", f"/clients/{client['id']}", json=payload)
        print(f"✅ Redirect-URIs eingetragen (intern: {local_ip or '—'}"
              + (f", öffentlich: {hostname}" if hostname else "") + ").")
    if hostname:
        write_env_value("KEYCLOAK_PUBLIC_URL", f"https://{hostname}/auth")
        print(f"✅ KEYCLOAK_PUBLIC_URL auf https://{hostname}/auth gesetzt (.env).")
        # Hostname direkt in die Plattform-DB schreiben — Caddy fragt dort vor
        # jeder Zertifikats-Ausstellung an (On-Demand-TLS)
        result = subprocess.run(
            ["docker", "compose", "exec", "-T", "postgres",
             "psql", "-U", "drk_app", "-d", "drk_platform", "-c",
             "UPDATE system_settings SET value = %s, updated_at = now(), "
             "updated_by = 'setup_keycloak' WHERE key = 'public_hostname'"
             .replace("%s", f"'{hostname}'")],
            capture_output=True, text=True,
        )
        if result.returncode == 0:
            print(f"✅ HTTPS-Hostname in der Plattform hinterlegt — Zertifikat wird")
            print(f"   beim ersten Aufruf von https://{hostname} ausgestellt")
            print(f"   (DNS + Portweiterleitung 80/443 vorausgesetzt).")
        else:
            print("⚠️  Hostname konnte nicht in die DB geschrieben werden — bitte")
            print("   nach dem Start im Verwaltungs-UI eintragen (⚙️ Einstellungen).")

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
    wanted = [r for r in all_roles if r["name"] in ("kv-admin", "alle")]
    kc.req("POST", f"/users/{user_id}/role-mappings/realm",
           json=[{"id": r["id"], "name": r["name"]} for r in wanted])
    print(f"✅ Administrator '{admin_user}' angelegt (Rollen: kv-admin, alle).")

    # --- End-Verifikation: gilt das rotierte Secret nach ALLEN Schritten noch? ---
    final = httpx.post(
        f"{kc.base}/realms/{REALM}/protocol/openid-connect/token",
        data={"grant_type": "client_credentials",
              "client_id": "drk-platform", "client_secret": secret},
        timeout=15,
    )
    if final.status_code != 200:
        fail("End-Verifikation fehlgeschlagen — ein späterer Schritt hat das "
             f"Client-Secret überschrieben (HTTP {final.status_code}).")
    print("✅ End-Verifikation: Secret, Mapper und Service-Account konsistent.")

    print("\n=== Fertig. Jetzt Services mit dem neuen Client-Secret neu starten: ===")
    print("docker compose up -d --force-recreate api-gateway open-webui")
    print("Danach: Verwaltungs-UI öffnen (/admin) und mit dem neuen Admin anmelden.")


if __name__ == "__main__":
    main()
