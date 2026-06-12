#!/usr/bin/env bash
# Datenbank-Migrationen einspielen (idempotent — beliebig oft ausführbar).
# Nach jedem 'git pull' empfohlen:  bash scripts/migrate.sh
set -euo pipefail
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

echo "→ Spiele Migrationen ein (infra/postgres/migrations.sql) ..."
docker compose exec -T postgres psql -U drk_app -d drk_platform \
    -v ON_ERROR_STOP=1 < infra/postgres/migrations.sql
echo "✅ Datenbank ist auf dem aktuellen Stand."
