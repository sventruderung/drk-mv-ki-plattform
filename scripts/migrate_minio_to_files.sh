#!/usr/bin/env bash
# Einmaliger Umzug der Original-Dokumente von MinIO in die Dateiablage
# (Volume documents_data des rag-service). Für Installationen, die vor dem
# Umbau "Dateiablage statt MinIO" eingerichtet wurden.
#
#   bash scripts/migrate_minio_to_files.sh
#
# Voraussetzungen:
#   - der alte MinIO-Container existiert noch (läuft oder gestoppt)
#   - in .env stehen noch MINIO_ACCESS_KEY / MINIO_SECRET_KEY / MINIO_BUCKET
# Idempotent: kann wiederholt werden, vorhandene Dateien werden überschrieben.
# MinIO-Container und -Volume werden NICHT gelöscht — das erst nach Prüfung von Hand.
set -euo pipefail
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

env_get() { grep -E "^$1=" .env | tail -1 | cut -d= -f2- | tr -d '\r'; }
KEY="$(env_get MINIO_ACCESS_KEY)"; SECRET="$(env_get MINIO_SECRET_KEY)"
BUCKET="$(env_get MINIO_BUCKET)"; BUCKET="${BUCKET:-drk-docs}"
[ -n "$KEY" ] && [ -n "$SECRET" ] || { echo "❌ MINIO_ACCESS_KEY/MINIO_SECRET_KEY fehlen in .env"; exit 1; }

CT="$(docker ps -a --format '{{.Names}}' | grep -E -m1 '[-_]minio[-_]1$' || true)"
[ -n "$CT" ] || { echo "❌ Kein MinIO-Container gefunden — nichts zu migrieren."; exit 1; }
echo "→ MinIO-Container: $CT"
docker start "$CT" >/dev/null
for _ in $(seq 1 30); do
    docker exec "$CT" mc ready local >/dev/null 2>&1 && break
    sleep 2
done

echo "→ Exportiere Bucket $BUCKET …"
docker exec -e "MC_HOST_src=http://$KEY:$SECRET@localhost:9000" "$CT" sh -c \
    "rm -rf /tmp/export && mkdir -p /tmp/export && mc mirror --quiet src/$BUCKET /tmp/export" >/dev/null

echo "→ Kopiere in das Volume documents_data …"
docker compose create rag-service >/dev/null 2>&1 || true   # legt das Volume an
DOCS_VOL="$(docker volume ls -q | grep -m1 'documents_data$' || true)"
[ -n "$DOCS_VOL" ] || { echo "❌ Volume documents_data nicht gefunden."; exit 1; }
docker cp "$CT:/tmp/export" - \
    | docker run -i --rm -v "$DOCS_VOL":/documents alpine \
        tar x -C /documents --strip-components=1
docker exec "$CT" rm -rf /tmp/export
N_FILES="$(docker run --rm -v "$DOCS_VOL":/documents:ro alpine sh -c 'find /documents -type f | wc -l')"
echo "  $N_FILES Datei(en) in der Dateiablage"

echo "→ Prüfe: jedes Dokument der Datenbank hat seine Datei …"
PGUSER="$(env_get POSTGRES_USER)"; PGUSER="${PGUSER:-drk_app}"
PGDB="$(env_get POSTGRES_DB)"; PGDB="${PGDB:-drk_platform}"
docker compose exec -T postgres psql -U "$PGUSER" -d "$PGDB" -tAc \
    "SELECT storage_key FROM documents" | tr -d '\r' | sed '/^$/d' > /tmp/drk-storage-keys.txt
N_DB="$(wc -l < /tmp/drk-storage-keys.txt)"
MISSING="$(docker run -i --rm -v "$DOCS_VOL":/documents:ro alpine sh -c \
    'n=0; while IFS= read -r k; do [ -f "/documents/$k" ] || { echo "  fehlt: $k" >&2; n=$((n+1)); }; done; echo $n' \
    < /tmp/drk-storage-keys.txt)"
rm -f /tmp/drk-storage-keys.txt
echo "  Dokumente in der DB: $N_DB | ohne Datei: $MISSING"
[ "$MISSING" = "0" ] || { echo "⚠️  Nicht alle Dateien gefunden — MinIO NICHT entfernen, Ausgabe prüfen."; exit 1; }

docker stop "$CT" >/dev/null
echo "✅ Umzug abgeschlossen. MinIO-Container ist gestoppt (nicht gelöscht)."
echo "   Nach erfolgreichem Test (Quelle im Chat öffnen, Upload, Backup) aufräumen:"
echo "     docker rm $CT && docker volume rm \$(docker volume ls -q | grep -m1 'minio_data\$')"
echo "     MINIO_*-Zeilen aus .env entfernen"
