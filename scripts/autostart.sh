#!/usr/bin/env bash
# Startet den KI-Stack nach jedem Server-Neustart.
#
#   Einmalig einrichten (als Betriebs-User, kein sudo nötig):
#     bash scripts/autostart.sh --install
#   Manuell ausführen / testen:
#     bash scripts/autostart.sh
#
# Warum: Die Restart-Policy "unless-stopped" greift nicht, wenn der Stack vor
# dem Neustart mit "docker compose down/stop" angehalten wurde (z. B. bei OS-
# Updates). Außerdem bindet Ollama die GPU-Geräte explizit ein — /dev/nvidia-uvm
# muss beim Start existieren, sonst startet der Container nicht.
# Log: ~/drk-autostart.log
set -uo pipefail
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SELF="$REPO_DIR/scripts/autostart.sh"

if [ "${1:-}" = "--install" ]; then
    command -v crontab >/dev/null || { echo "❌ crontab fehlt (Paket cron)"; exit 1; }
    id -nG | grep -qw docker || echo "⚠️  $(id -un) ist nicht in der Gruppe docker — Autostart wird scheitern"
    (crontab -l 2>/dev/null | grep -v -e 'drk-autostart' -e 'scripts/autostart.sh'
     echo "@reboot bash $SELF") | crontab -
    echo "✅ Autostart eingerichtet (crontab @reboot → $SELF)"
    echo "   Log: ~/drk-autostart.log"
    exit 0
fi

LOG="$HOME/drk-autostart.log"
exec >>"$LOG" 2>&1
echo "=== $(date '+%F %T') Autostart"
for _ in $(seq 1 60); do docker info >/dev/null 2>&1 && break; sleep 5; done
docker info >/dev/null 2>&1 || { echo "Docker nicht bereit — Abbruch"; exit 1; }
for _ in $(seq 1 30); do
    [ -e /dev/nvidia-uvm ] && [ -e /dev/nvidia0 ] && break
    nvidia-modprobe -u -c=0 2>/dev/null; sleep 2
done
[ -e /dev/nvidia-uvm ] || echo "WARNUNG: /dev/nvidia-uvm fehlt — Ollama startet evtl. nicht"
cd "$REPO_DIR" && docker compose up -d
sleep 30
docker compose ps --format '{{.Service}}: {{.Status}}'
