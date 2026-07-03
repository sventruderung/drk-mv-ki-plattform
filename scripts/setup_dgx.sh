#!/usr/bin/env bash
# Erstinstallation der DRK KI-Plattform (Mono) auf NVIDIA DGX Spark.
# Ausführen im Repo-Root:  bash scripts/setup_dgx.sh
set -euo pipefail

echo "=== DRK MV KI-Plattform — Mono-Setup (DGX Spark) ==="

# 1. Voraussetzungen
command -v docker >/dev/null || { echo "❌ Docker fehlt (auf DGX OS vorinstalliert — Installation prüfen)"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "❌ Docker Compose Plugin fehlt: sudo apt install docker-compose-plugin"; exit 1; }

# 2. .env anlegen — Passwörter/Secrets werden automatisch generiert
gen_secret() { openssl rand -hex 24; }
if [ ! -f .env ]; then
    cp .env.example .env
    sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(gen_secret)|" .env
    sed -i "s|^KEYCLOAK_ADMIN_PASSWORD=.*|KEYCLOAK_ADMIN_PASSWORD=$(gen_secret)|" .env
    sed -i "s|^MINIO_ACCESS_KEY=.*|MINIO_ACCESS_KEY=drk-$(openssl rand -hex 6)|" .env
    sed -i "s|^MINIO_SECRET_KEY=.*|MINIO_SECRET_KEY=$(gen_secret)|" .env
    # KEYCLOAK_CLIENT_SECRET wird von setup_keycloak.py gesetzt
    # Browser-erreichbare Keycloak-URL: Standard = Server-IP (der Wizard
    # stellt bei Angabe eines HTTPS-Hostnamens auf https://<host>/auth um)
    LOCAL_IP=$(hostname -I | awk '{print $1}')
    if [ -n "$LOCAL_IP" ]; then
        sed -i "s|^KEYCLOAK_PUBLIC_URL=.*|KEYCLOAK_PUBLIC_URL=http://${LOCAL_IP}:8080/auth|" .env
    fi
    chmod 600 .env
    echo "✅ .env erstellt — Passwörter automatisch generiert (chmod 600)."
    read -rp "Kontakt-E-Mail für Let's Encrypt (leer = HTTPS später): " acme
    if [ -n "$acme" ]; then
        sed -i "s|^ACME_EMAIL=.*|ACME_EMAIL=${acme}|" .env
    fi
fi

# 3. Branding-Datenverzeichnis befüllen (eigenes Logo via UI änderbar).
# MUSS vor dem ersten compose up existieren — Docker legt fehlende
# Datei-Mounts sonst als Verzeichnisse an und Open WebUI startet nicht.
mkdir -p data/branding
cp -n infra/openwebui/branding/*.png data/branding/ 2>/dev/null || true

# 4. Stack bauen und starten
echo "→ Baue und starte Container (erster Lauf dauert einige Minuten) ..."
docker compose up -d --build

# 4. Modelle laden (einmalig; Qwen3 32B ≈ 20 GB Download)
echo "→ Lade LLM-Modelle (einmalig, je nach Anbindung 30–90 Min) ..."
docker compose exec ollama ollama pull qwen3:32b
docker compose exec ollama ollama pull nomic-embed-text

# 5. Smoke-Test (httpx via apt — pip ist auf Ubuntu/DGX OS systemweit gesperrt, PEP 668)
echo "→ Smoke-Test ..."
python3 -c "import httpx" 2>/dev/null || sudo apt install -y python3-httpx
# smbclient: für den optionalen Backup-Upload auf ein NAS (Einstellungen → Backup)
command -v smbclient >/dev/null 2>&1 || sudo apt install -y smbclient
python3 scripts/smoke_test.py

cat <<'EOF'

=== Nächste Schritte ===
1. Keycloak einrichten (automatisch, fragt KV-Name + Admin-Konto ab):
   python3 scripts/setup_keycloak.py
   danach: docker compose up -d
2. Open WebUI (http://<host>:3000): Admin-Konto anlegen,
   Pipes installieren (docs/runbooks/openwebui-rag-pipe.md)
3. Verwaltungs-UI (http://<host>:8000/admin): Dokumente, Nutzer, Status
EOF
