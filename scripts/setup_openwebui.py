#!/usr/bin/env python3
"""Open-WebUI-Ersteinrichtung: installiert und aktiviert die drei DRK-Pipes.

- Legt bei Bedarf das Open-WebUI-Admin-Konto an (erstes Konto = Admin)
- Installiert/aktualisiert die Pipes aus infra/openwebui/pipes/
- Aktiviert sie, sodass sie sofort in der Modellauswahl erscheinen

Auf dem Server im Repo-Root ausführen:  python3 scripts/setup_openwebui.py
Abhängigkeit: sudo apt install python3-httpx
"""

import getpass
import sys
import time
from pathlib import Path

import httpx

BASE = "http://localhost:3000"
PIPES_DIR = Path("infra/openwebui/pipes")
PIPES = [
    ("drk_rag_pipe", "DRK Wissensbasis (RAG)", "drk_rag_pipe.py"),
    ("drk_content_pipe", "DRK Social Media (P02)", "drk_content_pipe.py"),
    ("drk_models_pipe", "DRK Externe Modelle", "drk_models_pipe.py"),
    ("drk_elo_pipe", "DRK Dokumentensystem (ELO)", "drk_elo_pipe.py"),
]


def fail(text: str) -> None:
    sys.exit(f"❌ {text}")


def get_token(client: httpx.Client) -> str:
    email = input("Open-WebUI-Admin-E-Mail: ").strip()
    password = getpass.getpass("Open-WebUI-Admin-Passwort: ")

    resp = client.post("/api/v1/auths/signin", json={"email": email, "password": password})
    if resp.status_code == 200:
        print("✅ Angemeldet.")
        return resp.json()["token"]

    # Noch kein Konto? Erstes Konto wird automatisch Admin.
    answer = input("Anmeldung fehlgeschlagen. Konto neu anlegen (erstes Konto = Admin)? [j/N] ")
    if answer.strip().lower() != "j":
        fail("Abgebrochen.")
    resp = client.post(
        "/api/v1/auths/signup",
        json={"name": "Administrator", "email": email, "password": password},
    )
    if resp.status_code != 200:
        fail(f"Konto anlegen fehlgeschlagen (HTTP {resp.status_code}): {resp.text[:200]}")
    print("✅ Admin-Konto angelegt.")
    return resp.json()["token"]


def main() -> None:
    print("=== DRK KI-Plattform — Open-WebUI-Pipes installieren ===\n")
    if not PIPES_DIR.is_dir():
        fail("infra/openwebui/pipes nicht gefunden — bitte im Repo-Root ausführen.")

    with httpx.Client(base_url=BASE, timeout=30) as client:
        # Open WebUI braucht nach dem (Neu-)Start bis zu einer Minute
        for attempt in range(30):
            try:
                client.get("/health").raise_for_status()
                break
            except httpx.HTTPError:
                if attempt == 0:
                    print("⏳ Warte auf Open WebUI (startet noch) ...")
                time.sleep(3)
        else:
            fail(f"Open WebUI nach 90 s nicht erreichbar unter {BASE} — "
                 "Container prüfen: docker compose logs open-webui")

        headers = {"Authorization": f"Bearer {get_token(client)}"}

        existing = {
            f["id"] for f in client.get("/api/v1/functions/", headers=headers).json()
        }

        for func_id, name, filename in PIPES:
            content = (PIPES_DIR / filename).read_text(encoding="utf-8")
            payload = {
                "id": func_id,
                "name": name,
                "content": content,
                "meta": {"description": f"DRK-Pipe aus {filename}", "manifest": {}},
            }
            if func_id in existing:
                resp = client.post(
                    f"/api/v1/functions/id/{func_id}/update", headers=headers, json=payload
                )
                action = "aktualisiert"
            else:
                resp = client.post("/api/v1/functions/create", headers=headers, json=payload)
                action = "installiert"
            if resp.status_code != 200:
                fail(f"{filename}: HTTP {resp.status_code} — {resp.text[:200]}")

            # Aktivieren (Toggle nur, wenn noch inaktiv)
            state = client.get(f"/api/v1/functions/id/{func_id}", headers=headers).json()
            if not state.get("is_active", False):
                client.post(f"/api/v1/functions/id/{func_id}/toggle", headers=headers)
            print(f"✅ {name} {action} und aktiviert.")

    print("\n=== Fertig. Die Pipes erscheinen jetzt in der Modellauswahl. ===")
    print("Hinweis: Nutzer müssen über 'DRK Login' (Keycloak) angemeldet sein,")
    print("damit Wissensbasis und Social Media funktionieren.")


if __name__ == "__main__":
    main()
