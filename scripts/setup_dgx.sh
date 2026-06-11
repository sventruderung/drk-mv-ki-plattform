#!/usr/bin/env bash
# Erstinstallation der DRK KI-Plattform (Mono) auf NVIDIA DGX Spark.
# Ausführen im Repo-Root:  bash scripts/setup_dgx.sh
set -euo pipefail

echo "=== DRK MV KI-Plattform — Mono-Setup (DGX Spark) ==="

# 1. Voraussetzungen
command -v docker >/dev/null || { echo "❌ Docker fehlt (auf DGX OS vorinstalliert — Installation prüfen)"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "❌ Docker Compose Plugin fehlt: sudo apt install docker-compose-plugin"; exit 1; }

# 2. .env anlegen
if [ ! -f .env ]; then
    cp .env.example .env
    echo ""
    echo "⚠️  .env wurde aus der Vorlage erstellt."
    echo "    Bitte jetzt ALLE CHANGE_ME-Werte setzen (Passwörter, Secrets):"
    echo "    nano .env"
    echo "    Danach dieses Skript erneut ausführen."
    exit 0
fi
if grep -q "CHANGE_ME" .env; then
    echo "❌ .env enthält noch CHANGE_ME-Platzhalter. Bitte zuerst ausfüllen: nano .env"
    exit 1
fi

# 3. Stack bauen und starten
echo "→ Baue und starte Container (erster Lauf dauert einige Minuten) ..."
docker compose up -d --build

# 4. Modelle laden (einmalig; Qwen3 72B ≈ 42 GB Download)
echo "→ Lade LLM-Modelle (einmalig, je nach Anbindung 30–90 Min) ..."
docker compose exec ollama ollama pull qwen3:72b
docker compose exec ollama ollama pull nomic-embed-text

# 5. Smoke-Test
echo "→ Smoke-Test ..."
pip3 install --quiet httpx 2>/dev/null || true
python3 scripts/smoke_test.py

cat <<'EOF'

=== Nächste Schritte (siehe docs/runbooks/) ===
1. Keycloak Admin UI (http://<host>:8080):
   - Client-Secret für drk-platform neu generieren, in .env eintragen
   - tenant_id-Mapper anpassen (kv-CHANGE_ME → echter KV-Name)
   - Erste Nutzer anlegen, Rollen zuweisen
   - danach: docker compose up -d (Services neu laden)
2. Open WebUI (http://<host>:3000): Admin-Konto anlegen,
   Pipes installieren (docs/runbooks/openwebui-rag-pipe.md)
3. Erste Dokumente: python3 scripts/upload_docs.py --help
EOF
