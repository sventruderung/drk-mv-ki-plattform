#!/usr/bin/env bash
# Nächtliches Backup der DRK KI-Plattform: PostgreSQL + MinIO + .env
#
#   Einmalig als Cron einrichten:  sudo bash scripts/backup.sh --install
#   Manuell ausführen:             bash scripts/backup.sh
#
# Ablage: $BACKUP_DIR (Standard /var/backups/drk-ki), Aufbewahrung 14 Tage.
# Fehlschläge erscheinen als Ereignis im Verwaltungs-UI (Monitoring).
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/drk-ki}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

# --- Cron-Installation -------------------------------------------------------
if [ "${1:-}" = "--install" ]; then
    [ "$(id -u)" -eq 0 ] || { echo "Bitte mit sudo ausführen: sudo bash scripts/backup.sh --install"; exit 1; }
    REAL_USER="${SUDO_USER:-root}"
    cat > /etc/cron.d/drk-ki-backup <<EOF
# Nächtliches Backup der DRK KI-Plattform (02:30 Uhr)
30 2 * * * $REAL_USER BACKUP_DIR=$BACKUP_DIR bash $REPO_DIR/scripts/backup.sh >> /var/log/drk-ki-backup.log 2>&1
EOF
    chmod 644 /etc/cron.d/drk-ki-backup
    mkdir -p "$BACKUP_DIR" && chown "$REAL_USER" "$BACKUP_DIR" && chmod 700 "$BACKUP_DIR"
    touch /var/log/drk-ki-backup.log && chown "$REAL_USER" /var/log/drk-ki-backup.log
    echo "✅ Cron installiert: täglich 02:30 → $BACKUP_DIR (Log: /var/log/drk-ki-backup.log)"
    echo "   Probelauf:  bash scripts/backup.sh"
    exit 0
fi

# --- Fehler landen im Monitoring (Verwaltungs-UI → Ereignisse) -----------------
notify_failure() {
    docker compose exec -T postgres psql -U drk_app -d drk_platform -c \
        "INSERT INTO monitor_events (check_name, ok, detail)
         VALUES ('Backup', false, 'Backup fehlgeschlagen — /var/log/drk-ki-backup.log prüfen');" \
        >/dev/null 2>&1 || true
    echo "❌ Backup fehlgeschlagen ($(date '+%F %T'))"
}
trap notify_failure ERR

umask 077   # Backups enthalten Dokumenttexte + Secrets — nur Besitzer liest
mkdir -p "$BACKUP_DIR"
TS="$(date +%F_%H%M)"
echo "=== Backup $TS → $BACKUP_DIR ==="

# 1. PostgreSQL (Dokumente-Index, Wissensdatenbanken, Drafts, Audit, Settings)
docker compose exec -T postgres pg_dump -U drk_app drk_platform \
    | gzip > "$BACKUP_DIR/db_$TS.sql.gz"
gzip -t "$BACKUP_DIR/db_$TS.sql.gz"
[ "$(stat -c%s "$BACKUP_DIR/db_$TS.sql.gz")" -gt 1000 ] || { echo "DB-Dump verdächtig klein"; false; }
echo "✓ PostgreSQL: $(du -h "$BACKUP_DIR/db_$TS.sql.gz" | cut -f1)"

# 2. MinIO (Original-Dokumente)
MINIO_VOL="$(docker volume ls -q | grep -m1 'minio_data')"
docker run --rm -v "$MINIO_VOL":/data:ro -v "$BACKUP_DIR":/backup alpine \
    tar czf "/backup/minio_$TS.tgz" -C / data
echo "✓ MinIO: $(du -h "$BACKUP_DIR/minio_$TS.tgz" | cut -f1)"

# 3. .env (enthält Secrets — Backup-Verzeichnis ist chmod 700)
install -m 600 .env "$BACKUP_DIR/env_$TS"
echo "✓ .env gesichert"

# 4. Aufbewahrung: alles älter als $RETENTION_DAYS Tage löschen
find "$BACKUP_DIR" -maxdepth 1 \( -name 'db_*' -o -name 'minio_*' -o -name 'env_*' \) \
    -mtime +"$RETENTION_DAYS" -delete

echo "=== Backup OK ($(date '+%F %T')) — Bestand: $(ls "$BACKUP_DIR" | wc -l) Dateien ==="
