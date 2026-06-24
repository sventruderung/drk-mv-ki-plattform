#!/usr/bin/env bash
# Voll-Restore der KI-Plattform aus einem Backup (NAS oder lokal).
#
# Stellt wieder her: PostgreSQL (inkl. Keycloak-Realm, Nutzer, Client-Secret),
# MinIO-Dokumente und die .env. Danach wird der Host automatisch angepasst
# (Keycloak-URL + Redirect-URIs auf die aktuelle IP) und ein Smoke-Test läuft.
#
#   Vom NAS (neuester Stand):
#     bash scripts/restore.sh --nas //192.168.1.10/backup/drk-ki --user backup-user
#   Aus lokalem Verzeichnis, bestimmter Stand:
#     bash scripts/restore.sh --local /var/backups/drk-ki --ts 2026-06-24_0230
#
# ACHTUNG: überschreibt die laufende Installation. Vorher Rückfrage (außer --yes).
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

NAS_URL=""; NAS_USER=""; NAS_PASS=""; LOCAL_DIR=""; TS=""; ASSUME_YES=0
while [ $# -gt 0 ]; do
    case "$1" in
        --nas) NAS_URL="$2"; shift 2 ;;
        --user) NAS_USER="$2"; shift 2 ;;
        --password) NAS_PASS="$2"; shift 2 ;;
        --local) LOCAL_DIR="$2"; shift 2 ;;
        --ts) TS="$2"; shift 2 ;;
        --yes) ASSUME_YES=1; shift ;;
        *) echo "Unbekannte Option: $1"; exit 1 ;;
    esac
done

[ -n "$NAS_URL$LOCAL_DIR" ] || { echo "❌ Quelle fehlt: --nas <URL> --user <U>  ODER  --local <DIR>"; exit 1; }

RESTORE_DIR="$(mktemp -d)"
cleanup() { rm -rf "$RESTORE_DIR"; }
trap cleanup EXIT

# --- 1. Backup-Dateien bereitstellen ----------------------------------------
if [ -n "$NAS_URL" ]; then
    command -v smbclient >/dev/null 2>&1 || { echo "❌ smbclient fehlt: sudo apt install -y smbclient"; exit 1; }
    [ -n "$NAS_USER" ] || { echo "❌ --user fehlt"; exit 1; }
    if [ -z "$NAS_PASS" ]; then read -rsp "NAS-Passwort für $NAS_USER: " NAS_PASS; echo; fi
    clean="$(echo "${NAS_URL//\\//}" | sed 's#^/*##')"
    server="${clean%%/*}"; rest="${clean#*/}"; share="${rest%%/*}"
    sub=""; [ "$rest" != "$share" ] && sub="${rest#*/}"
    cdcmd=""; [ -n "$sub" ] && cdcmd="cd \"$sub\"; "
    if [ -z "$TS" ]; then
        echo "→ Suche neuesten Stand auf //$server/$share/$sub …"
        listing="$(smbclient "//$server/$share" -U "$NAS_USER%$NAS_PASS" -c "${cdcmd}ls db_*.sql.gz" 2>/dev/null || true)"
        TS="$(echo "$listing" | grep -oE 'db_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{4}\.sql\.gz' \
              | sed 's/^db_//; s/\.sql\.gz$//' | sort -u | tail -1)"
        [ -n "$TS" ] || { echo "❌ Kein Backup auf dem NAS gefunden."; exit 1; }
    fi
    echo "→ Lade Stand $TS vom NAS …"
    smbclient "//$server/$share" -U "$NAS_USER%$NAS_PASS" -c \
        "lcd \"$RESTORE_DIR\"; ${cdcmd}get db_$TS.sql.gz; get minio_$TS.tgz; get env_$TS"
else
    if [ -z "$TS" ]; then
        TS="$(ls "$LOCAL_DIR"/db_*.sql.gz 2>/dev/null | sed 's#.*/db_##; s/\.sql\.gz$//' | sort | tail -1)"
        [ -n "$TS" ] || { echo "❌ Kein Backup in $LOCAL_DIR gefunden."; exit 1; }
    fi
    echo "→ Verwende lokalen Stand $TS aus $LOCAL_DIR"
    cp "$LOCAL_DIR/db_$TS.sql.gz" "$LOCAL_DIR/minio_$TS.tgz" "$LOCAL_DIR/env_$TS" "$RESTORE_DIR/"
fi

# --- 2. Prüfen, dass alle drei Teile da und plausibel sind ------------------
for f in "db_$TS.sql.gz" "minio_$TS.tgz" "env_$TS"; do
    [ -s "$RESTORE_DIR/$f" ] || { echo "❌ Datei fehlt oder leer: $f"; exit 1; }
done
gzip -t "$RESTORE_DIR/db_$TS.sql.gz" || { echo "❌ DB-Dump beschädigt."; exit 1; }
echo "✓ Backup-Satz $TS vollständig (DB, MinIO, .env)"

# --- 3. Rückfrage (destruktiv!) ---------------------------------------------
if [ "$ASSUME_YES" -ne 1 ]; then
    echo
    echo "⚠️  Dies überschreibt die laufende Installation:"
    echo "    • Datenbank drk_platform (inkl. Keycloak) wird neu aufgebaut"
    echo "    • MinIO-Dokumente werden ersetzt"
    echo "    • .env wird ersetzt (Sicherung als .env.pre-restore.$TS)"
    read -rp "Wirklich aus Stand $TS wiederherstellen? (ja/NEIN): " ans
    [ "$ans" = "ja" ] || { echo "Abgebrochen."; exit 0; }
fi

# --- 4. .env wiederherstellen (zuerst — alle Folgeschritte nutzen sie) ------
[ -f .env ] && cp -p .env ".env.pre-restore.$TS"
install -m 600 "$RESTORE_DIR/env_$TS" .env
echo "✓ .env wiederhergestellt (vorherige: .env.pre-restore.$TS)"

PGUSER="$(grep -E '^POSTGRES_USER=' .env | cut -d= -f2- | tr -d '\r')"
PGDB="$(grep -E '^POSTGRES_DB=' .env | cut -d= -f2- | tr -d '\r')"
PGUSER="${PGUSER:-drk_app}"; PGDB="${PGDB:-drk_platform}"

# --- 5. PostgreSQL wiederherstellen -----------------------------------------
echo "→ Starte PostgreSQL und trenne Anwendungsdienste …"
docker compose up -d postgres
docker compose stop keycloak api-gateway rag-service llm-service \
    connector-service elo-connector open-webui >/dev/null 2>&1 || true
# auf Bereitschaft warten
for _ in $(seq 1 30); do
    docker compose exec -T postgres pg_isready -U "$PGUSER" >/dev/null 2>&1 && break
    sleep 1
done
echo "→ Datenbank $PGDB neu aufbauen und einspielen …"
docker compose exec -T postgres psql -U "$PGUSER" -d postgres -c \
    "DROP DATABASE IF EXISTS $PGDB WITH (FORCE);"
docker compose exec -T postgres psql -U "$PGUSER" -d postgres -c \
    "CREATE DATABASE $PGDB OWNER $PGUSER;"
gunzip -c "$RESTORE_DIR/db_$TS.sql.gz" \
    | docker compose exec -T postgres psql -U "$PGUSER" -d "$PGDB" -v ON_ERROR_STOP=1 >/dev/null
echo "✓ PostgreSQL wiederhergestellt (inkl. Keycloak-Realm, Nutzer, Secret)"

# --- 6. MinIO-Dokumente wiederherstellen ------------------------------------
echo "→ MinIO-Dokumente einspielen …"
docker compose up -d minio >/dev/null
docker compose stop minio >/dev/null
MINIO_VOL="$(docker volume ls -q | grep -m1 'minio_data')"
[ -n "$MINIO_VOL" ] || { echo "❌ MinIO-Volume nicht gefunden."; exit 1; }
docker run --rm -v "$MINIO_VOL":/data -v "$RESTORE_DIR":/backup:ro alpine sh -c \
    "find /data -mindepth 1 -delete && tar xzf /backup/minio_$TS.tgz -C /"
echo "✓ MinIO wiederhergestellt"

# --- 7. Alles starten -------------------------------------------------------
echo "→ Starte alle Dienste …"
docker compose up -d

# --- 8. Host angleichen (IP/Redirect-URIs) + Smoke-Test ---------------------
# Die wiederhergestellte .env trägt evtl. die alte IP/URL. set_host.py erkennt
# die aktuelle IP, korrigiert KEYCLOAK_PUBLIC_URL + Redirect-URIs und startet
# Gateway + Open WebUI neu — damit der Login nach dem Restore sicher funktioniert.
echo "→ Passe Host an die aktuelle Umgebung an …"
sleep 8   # Keycloak braucht einen Moment
if python3 scripts/set_host.py; then
    echo "✓ Host angeglichen"
else
    echo "⚠️ set_host.py fehlgeschlagen — bei Bedarf manuell ausführen:"
    echo "    python3 scripts/set_host.py            # interne IP"
    echo "    python3 scripts/set_host.py <host> --https   # für HTTPS-Betrieb"
fi

echo
echo "=== Restore aus Stand $TS abgeschlossen ==="
python3 scripts/smoke_test.py || echo "⚠️ Smoke-Test meldet Probleme — Logs prüfen: docker compose logs"
echo
echo "Anmeldung wie vor der Sicherung (kv-admin + Passwort aus dem gesicherten Stand)."
echo "Falls HTTPS genutzt wird: python3 scripts/set_host.py <hostname> --https"
