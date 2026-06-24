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

# --- Einstellungen aus der DB lesen/schreiben (system_settings) --------------
db_get() {
    docker compose exec -T postgres psql -U drk_app -d drk_platform -tAc \
        "SELECT value FROM system_settings WHERE key='$1'" 2>/dev/null \
        | tr -d '\r' | head -n1 || true
}
db_set() {
    docker compose exec -T postgres psql -U drk_app -d drk_platform -c \
        "INSERT INTO system_settings (key, value, updated_at, updated_by)
         VALUES ('$1', '$2', now(), 'backup')
         ON CONFLICT (key) DO UPDATE SET value='$2', updated_at=now(), updated_by='backup';" \
        >/dev/null 2>&1 || true
}

# --- Cron-Installation -------------------------------------------------------
if [ "${1:-}" = "--install" ]; then
    [ "$(id -u)" -eq 0 ] || { echo "Bitte mit sudo ausführen: sudo bash scripts/backup.sh --install"; exit 1; }
    REAL_USER="${SUDO_USER:-root}"
    cat > /etc/cron.d/drk-ki-backup <<EOF
# Backup-Dispatcher der KI-Plattform: prüft alle 15 Min den im Verwaltungs-UI
# (Einstellungen → Backup) hinterlegten Zeitplan und sichert, wenn fällig.
*/15 * * * * $REAL_USER BACKUP_DIR=$BACKUP_DIR bash $REPO_DIR/scripts/backup.sh --dispatch >> /var/log/drk-ki-backup.log 2>&1
EOF
    chmod 644 /etc/cron.d/drk-ki-backup
    mkdir -p "$BACKUP_DIR" && chown "$REAL_USER" "$BACKUP_DIR" && chmod 700 "$BACKUP_DIR"
    touch /var/log/drk-ki-backup.log && chown "$REAL_USER" /var/log/drk-ki-backup.log
    echo "✅ Cron installiert: Dispatcher alle 15 Min → Zeitplan aus dem Verwaltungs-UI"
    echo "   Ablage: $BACKUP_DIR (Log: /var/log/drk-ki-backup.log)"
    echo "   Für den NAS-Upload zusätzlich:  sudo apt install -y smbclient"
    echo "   Sofort-Probelauf:  bash scripts/backup.sh"
    exit 0
fi

# --- Dispatcher: läuft per Cron, sichert nur wenn laut Zeitplan fällig --------
if [ "${1:-}" = "--dispatch" ]; then
    [ "$(db_get backup_schedule_enabled)" = "true" ] || exit 0
    freq="$(db_get backup_schedule_freq)";       freq="${freq:-daily}"
    sched_time="$(db_get backup_schedule_time)"; sched_time="${sched_time:-02:30}"
    weekday="$(db_get backup_schedule_weekday)"; weekday="${weekday:-1}"
    today="$(date +%F)"
    # Wochentag prüfen (date +%u: 1=Mo … 7=So)
    [ "$freq" = "weekly" ] && [ "$(date +%u)" != "$weekday" ] && exit 0
    # Pro Tag nur ein Versuch (verhindert 15-Min-Wiederholungen, auch bei Fehler)
    [ "$(db_get last_attempt_date)" = "$today" ] && exit 0
    now_min=$((10#$(date +%H) * 60 + 10#$(date +%M)))
    sched_min=$((10#${sched_time%%:*} * 60 + 10#${sched_time##*:}))
    [ "$now_min" -ge "$sched_min" ] || exit 0
    db_set last_attempt_date "$today"
    exec bash "$REPO_DIR/scripts/backup.sh"
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

# --- NAS-Upload (SMB/CIFS, z.B. Synology) ------------------------------------
# Liest Zugangsdaten aus der DB; lädt die Sicherung per smbclient hoch. Wird in
# einer if-Bedingung aufgerufen → ein Fehler bricht die lokale Sicherung NICHT ab.
upload_to_nas() {
    local url user pass clean server rest share sub cd_prefix
    url="$(db_get backup_nas_url)"; user="$(db_get backup_nas_user)"; pass="$(db_get backup_nas_password)"
    [ -n "$url" ] && [ -n "$user" ] || { echo "ℹ️ Kein NAS konfiguriert — nur lokale Sicherung."; return 0; }
    command -v smbclient >/dev/null 2>&1 || {
        echo "⚠️ smbclient fehlt (sudo apt install -y smbclient) — NAS-Upload übersprungen"; return 1; }
    clean="$(echo "${url//\\//}" | sed 's#^/*##')"     # Backslashes→Slash, führende / weg
    server="${clean%%/*}"; rest="${clean#*/}"; share="${rest%%/*}"
    sub=""; [ "$rest" != "$share" ] && sub="${rest#*/}"
    cd_prefix=""
    if [ -n "$sub" ]; then
        smbclient "//$server/$share" -U "$user%$pass" -c "mkdir \"$sub\"" >/dev/null 2>&1 || true
        cd_prefix="cd \"$sub\"; "
    fi
    smbclient "//$server/$share" -U "$user%$pass" -c \
        "prompt OFF; ${cd_prefix}put \"$BACKUP_DIR/db_$TS.sql.gz\" \"db_$TS.sql.gz\"; put \"$BACKUP_DIR/minio_$TS.tgz\" \"minio_$TS.tgz\"; put \"$BACKUP_DIR/env_$TS\" \"env_$TS\""
}

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

# 5. Optional: auf NAS hochladen (Fehler hier kippt die lokale Sicherung nicht)
if upload_to_nas; then
    echo "✓ NAS-Upload abgeschlossen"
else
    docker compose exec -T postgres psql -U drk_app -d drk_platform -c \
        "INSERT INTO monitor_events (check_name, ok, detail)
         VALUES ('Backup-NAS', false, 'NAS-Upload fehlgeschlagen — Zugangsdaten/Erreichbarkeit prüfen');" \
        >/dev/null 2>&1 || true
    echo "⚠️ NAS-Upload fehlgeschlagen — lokale Sicherung ist vorhanden"
fi

# Zeitstempel der erfolgreichen Sicherung (Anzeige im Verwaltungs-UI)
db_set last_backup_at "$(date '+%F %T')"

echo "=== Backup OK ($(date '+%F %T')) — Bestand: $(ls "$BACKUP_DIR" | wc -l) Dateien ==="
