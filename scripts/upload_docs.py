#!/usr/bin/env python3
"""Dokumenten-Upload in die DRK-Wissensbasis (für Mandanten-Admins).

Meldet sich per Keycloak an (Direct Access Grant) und lädt Dateien mit
ACL-Gruppen über das API-Gateway hoch.

Beispiele:
    python upload_docs.py satzung.pdf
    python upload_docs.py --acl kv-vorstand finanzbericht.pdf
    python upload_docs.py --acl kv-pflege,kv-vorstand *.pdf

Abhängigkeit: pip install httpx
"""

import argparse
import getpass
import mimetypes
import sys
from pathlib import Path

import httpx

SUPPORTED = {".pdf", ".docx", ".xlsx", ".txt"}


def get_token(keycloak_url: str, realm: str, client_id: str, client_secret: str,
              username: str, password: str) -> str:
    resp = httpx.post(
        f"{keycloak_url}/realms/{realm}/protocol/openid-connect/token",
        data={
            "grant_type": "password",
            "client_id": client_id,
            "client_secret": client_secret,
            "username": username,
            "password": password,
        },
        timeout=30,
    )
    if resp.status_code != 200:
        sys.exit(f"❌ Anmeldung fehlgeschlagen (HTTP {resp.status_code}): {resp.text}")
    return resp.json()["access_token"]


def main() -> None:
    parser = argparse.ArgumentParser(description="DRK-Wissensbasis: Dokumente hochladen")
    parser.add_argument("files", nargs="+", help="Dateien (PDF, DOCX, XLSX, TXT)")
    parser.add_argument("--acl", default="kv-alle",
                        help="ACL-Gruppen, kommasepariert (Standard: kv-alle)")
    parser.add_argument("--gateway", default="http://localhost:8000")
    parser.add_argument("--keycloak", default="http://localhost:8080")
    parser.add_argument("--realm", default="drk-kv")
    parser.add_argument("--client-id", default="drk-platform")
    parser.add_argument("--client-secret", required=True,
                        help="Client-Secret (aus Keycloak Admin UI)")
    parser.add_argument("--user", required=True, help="Keycloak-Benutzername")
    args = parser.parse_args()

    password = getpass.getpass(f"Passwort für {args.user}: ")
    token = get_token(args.keycloak, args.realm, args.client_id,
                      args.client_secret, args.user, password)
    print("✅ Angemeldet.")

    ok = failed = 0
    for name in args.files:
        path = Path(name)
        if not path.is_file():
            print(f"⏭️  {name}: nicht gefunden, übersprungen")
            failed += 1
            continue
        if path.suffix.lower() not in SUPPORTED:
            print(f"⏭️  {path.name}: Format nicht unterstützt, übersprungen")
            failed += 1
            continue

        content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        resp = httpx.post(
            f"{args.gateway}/api/v1/documents",
            files={"file": (path.name, path.read_bytes(), content_type)},
            data={"acl_groups": args.acl},
            headers={"Authorization": f"Bearer {token}"},
            timeout=600,
        )
        if resp.status_code == 200:
            info = resp.json()
            print(f"✅ {path.name}: {info['chunks']} Chunks, ACL: {', '.join(info['acl_groups'])}")
            ok += 1
        else:
            detail = resp.json().get("detail", resp.text) if resp.content else ""
            print(f"❌ {path.name}: HTTP {resp.status_code} — {detail}")
            failed += 1

    print(f"\nFertig: {ok} hochgeladen, {failed} übersprungen/fehlgeschlagen.")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
