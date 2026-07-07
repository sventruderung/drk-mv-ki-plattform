#!/usr/bin/env python3
"""Open-WebUI-Pipes installieren — auth-unabhängig, direkt in die Datenbank.

Warum nicht über die Web-API (signin/signup)?
Open WebUI läuft hier im OAuth-only-Modus (ENABLE_LOGIN_FORM=false). Das Image
ist an den rollenden Tag ':main' gebunden; neuere Builds sperren die
signin/signup-Endpunkte in diesem Modus komplett (HTTP 403 ACCESS_PROHIBITED).
Eine API-basierte Installation ist damit nicht mehr zuverlässig.

Deshalb schreibt dieses Skript die Pipes direkt in die SQLite-Tabelle 'function'
im open_webui_data-Volume — unabhängig davon, was Open WebUI an der Anmeldung
ändert. Es installiert nur die Pipe-Dateien, die tatsächlich vorhanden sind,
und läuft so unverändert auf allen Branches (main / white-label).

Auf dem Server im Repo-Root ausführen:  python3 scripts/setup_openwebui.py
Voraussetzung: docker compose ist verfügbar und der open-webui-Container läuft.
"""

import subprocess
import sys
from pathlib import Path

PIPES_DIR = Path("infra/openwebui/pipes")
SERVICE = "open-webui"

# Bekannte Pipes mit Anzeigename (erscheint im Modell-Dropdown).
# Nur vorhandene Dateien werden installiert — dasselbe Skript läuft damit
# auf main (mit content-/elo-Pipe) wie auf white-label (ohne diese).
PIPES = [
    ("drk_rag_pipe", "DRK Wissensbasis (RAG)", "drk_rag_pipe.py"),
    ("drk_content_pipe", "DRK Social Media (P02)", "drk_content_pipe.py"),
    ("drk_models_pipe", "DRK Externe Modelle", "drk_models_pipe.py"),
    ("drk_elo_pipe", "DRK Dokumentensystem (ELO)", "drk_elo_pipe.py"),
]

# Läuft INNERHALB des Containers: liest /tmp/pipes, schreibt in webui.db.
# Die Pipe-Liste wird als repr() vorangestellt (siehe build_snippet()).
INSTALLER_BODY = r'''
import sqlite3, json, time, os
DB = "/app/backend/data/webui.db"
db = sqlite3.connect(DB)
row = db.execute("select id from \"user\" where role='admin' order by created_at limit 1").fetchone()
uid = row[0] if row else "system"
cols = {r[1]: r for r in db.execute("PRAGMA table_info(function)")}
now = int(time.time())
for fid, name, fn in PIPES:
    path = "/tmp/pipes/" + fn
    if not os.path.exists(path):
        continue
    content = open(path, encoding="utf-8").read()
    vals = {"id": fid, "user_id": uid, "name": name, "type": "pipe", "content": content,
            "meta": json.dumps({"description": "DRK-Pipe aus " + fn, "manifest": {}}),
            "valves": json.dumps({}), "is_active": 1, "is_global": 0,
            "created_at": now, "updated_at": now}
    for nm, info in cols.items():          # verbleibende NOT-NULL-Spalten auffuellen
        if info[3] and info[4] is None and nm not in vals:
            vals[nm] = 0 if any(x in (info[2] or "").upper() for x in ("INT", "REAL", "BOOL")) else ""
    keys = [k for k in vals if k in cols]
    db.execute("INSERT OR REPLACE INTO function (%s) VALUES (%s)"
               % (",".join(keys), ",".join("?" * len(keys))), [vals[k] for k in keys])
    print("OK\t%s\t%s" % (fid, name))
db.commit()
'''


def fail(text: str) -> None:
    sys.exit(f"❌ {text}")


def compose(*args: str, **kwargs) -> subprocess.CompletedProcess:
    """docker compose ... im Repo-Root ausführen."""
    return subprocess.run(["docker", "compose", *args], **kwargs)


def build_snippet(present: list[tuple[str, str, str]]) -> str:
    return "PIPES = " + repr(present) + "\n" + INSTALLER_BODY


def main() -> None:
    print("=== DRK KI-Plattform — Open-WebUI-Pipes installieren (direkt in die DB) ===\n")
    if not PIPES_DIR.is_dir():
        fail("infra/openwebui/pipes nicht gefunden — bitte im Repo-Root ausführen.")

    present = [(fid, name, fn) for fid, name, fn in PIPES if (PIPES_DIR / fn).is_file()]
    if not present:
        fail("Keine Pipe-Dateien in infra/openwebui/pipes gefunden.")

    # Läuft der Container?
    ps = compose("ps", "-q", SERVICE, capture_output=True, text=True)
    if ps.returncode != 0 or not ps.stdout.strip():
        fail(f"Container '{SERVICE}' läuft nicht — zuerst 'docker compose up -d' ausführen.")

    # 1. Alte Kopie entfernen (Idempotenz) + Pipes frisch in den Container kopieren
    print("→ Kopiere Pipe-Dateien in den Container ...")
    compose("exec", "-T", SERVICE, "rm", "-rf", "/tmp/pipes")
    if compose("cp", str(PIPES_DIR), f"{SERVICE}:/tmp/pipes").returncode != 0:
        fail("Kopieren der Pipe-Dateien fehlgeschlagen (docker compose cp).")

    # 2. Installer im Container ausführen
    print("→ Trage Pipes in die Datenbank ein ...")
    proc = compose("exec", "-T", SERVICE, "python3", "-",
                   input=build_snippet(present), text=True, capture_output=True)
    if proc.returncode != 0:
        fail(f"DB-Installation fehlgeschlagen:\n{proc.stderr.strip() or proc.stdout.strip()}")

    installed = []
    for line in proc.stdout.splitlines():
        if line.startswith("OK\t"):
            _, fid, name = line.split("\t", 2)
            installed.append((fid, name))
            print(f"✅ {name} installiert und aktiviert.")
    if not installed:
        fail(f"Keine Pipe wurde eingetragen — Ausgabe:\n{proc.stdout}\n{proc.stderr}")

    # 3. Neu starten, damit die Pipes als Modelle registriert werden
    print("→ Starte Open WebUI neu, damit die Pipes als Modelle erscheinen ...")
    compose("restart", SERVICE)

    print("\n=== Fertig. Die Pipes erscheinen jetzt in der Modellauswahl. ===")
    print("Hinweis: Nutzer müssen über 'DRK Login' (Keycloak) angemeldet sein,")
    print("damit Wissensbasis, ELO und Social Media funktionieren.")


if __name__ == "__main__":
    main()
