# Runbook: Backup & Wiederherstellung

## Einrichtung (einmalig)

```bash
sudo bash scripts/backup.sh --install   # Cron: täglich 02:30 Uhr
bash scripts/backup.sh                  # Probelauf
```

Gesichert wird nach `/var/backups/drk-ki` (änderbar via `BACKUP_DIR`):

| Datei | Inhalt |
|---|---|
| `db_<datum>.sql.gz` | PostgreSQL: Dokumente-Index, Wissensdatenbanken, Embeddings, Drafts, Audit-Log, Einstellungen |
| `minio_<datum>.tgz` | Original-Dokumente (MinIO-Volume) |
| `env_<datum>` | Secrets (`.env`) — Verzeichnis ist nur für den Besitzer lesbar |

Aufbewahrung: 14 Tage (änderbar via `RETENTION_DAYS`). Fehlschläge erscheinen
als Ereignis „Backup" im Verwaltungs-UI (⚙️ → Letzte Ereignisse) und im Log
`/var/log/drk-ki-backup.log`.

**Wichtig:** Das Backup-Verzeichnis liegt auf derselben Platte wie die Daten.
Für echte Ausfallsicherheit regelmäßig auf ein externes Ziel spiegeln
(NAS/rsync/USB) — z.B. per zweitem Cron:
`rsync -a /var/backups/drk-ki/ backup-nas:/drk-ki/`

## Wiederherstellung

```bash
cd ~/drk-mv-ki-plattform
docker compose down

# 1. .env zurückspielen
cp /var/backups/drk-ki/env_<datum> .env && chmod 600 .env

# 2. Volumes leeren und Stack starten (DB-Init läuft mit leerem Schema)
docker volume rm $(docker volume ls -q | grep drk-mv | grep -vE 'ollama_data')
docker compose up -d postgres minio
sleep 15

# 3. Datenbank einspielen (über das frisch initialisierte Schema)
gunzip -c /var/backups/drk-ki/db_<datum>.sql.gz \
  | docker compose exec -T postgres psql -U drk_app -d drk_platform

# 4. MinIO-Dokumente zurückspielen
MINIO_VOL=$(docker volume ls -q | grep -m1 minio_data)
docker run --rm -v "$MINIO_VOL":/data -v /var/backups/drk-ki:/backup alpine \
  sh -c "rm -rf /data/* && tar xzf /backup/minio_<datum>.tgz -C /"

# 5. Alles starten und prüfen
docker compose up -d
python3 scripts/smoke_test.py
```

Hinweis: Die Ollama-Modelle stecken nicht im Backup (öffentlich nachladbar):
`docker compose exec ollama ollama pull qwen3:32b nomic-embed-text`
