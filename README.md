# DRK MV KI-Plattform

Lokal gehostete, mandantenfähige KI-Plattform für die DRK-Kreisverbände in
Mecklenburg-Vorpommern. Kein Datenbyte verlässt das System — alle Modelle
laufen lokal (Zero-Data-Leak, DSGVO-konform).

## Funktionen (Stand: Mono-Pilot)

| Modul | Beschreibung |
|---|---|
| **KI-Chat** | Open WebUI mit Qwen3 32B (lokal via Ollama) |
| **Wissensbasis (RAG)** | Dokumente hochladen (PDF/DOCX/XLSX/TXT), rechtegeprüfte Suche mit Quellen-Zitaten — Nutzer sehen nur Inhalte, für die sie freigeschaltet sind (§4.2) |
| **Social Media (P02)** | KI-Entwürfe für Facebook/Instagram/LinkedIn/Webseite/Newsletter mit Freigabe-Workflow — nichts geht ohne menschliche Freigabe online |
| **SSO** | Keycloak (OIDC), vorbereitet für Active-Directory-Anbindung |

## Architektur

```
Open WebUI (:3000) ──── Ollama (:11434, Qwen3 32B + nomic-embed-text)
     │ Pipes (OIDC-Token)
     ▼
API-Gateway (:8000) ── JWT-Validierung, tenant_id + Rollen aus Token
     ├── rag-service (:8001) ──── PostgreSQL + pgvector (RLS) / MinIO
     ├── llm-service (:8002) ──── Ollama
     └── content-service (:8005) ─ Freigabe-Workflow (P02)

Keycloak (:8080) — Login, Rollen, Realm drk-kv
```

Details: `docs/architecture.md` und die Systemübersichten in `docs/`.

## Installation (Pilot auf NVIDIA DGX Spark)

```bash
git clone https://github.com/sventruderung/drk-mv-ki-plattform.git
cd drk-mv-ki-plattform
bash scripts/setup_dgx.sh        # führt durch .env, Build, Modell-Download
python3 scripts/smoke_test.py    # prüft alle Dienste
```

Ausführliche Anleitung: `docs/Installationsanleitung-DRK-DGX-Spark.docx`
und `docs/runbooks/`.

## Entwicklung

```bash
# Tests (je Service)
cd services/rag-service && python -m pytest tests/ -v

# Stack lokal starten
cp .env.example .env   # CHANGE_ME-Werte setzen!
docker compose up -d --build
```

## Betrieb

```bash
bash scripts/migrate.sh                       # DB-Schema nachziehen (nach git pull)
sudo bash scripts/backup.sh --install         # Backup-Dispatcher (Zeitplan + NAS im UI)
sudo apt install -y smbclient                  # nur falls Backup auf NAS genutzt wird
python3 scripts/set_host.py <host> [--https]  # nach IP-/Netzwechsel
```

Konventionen: `CONVENTIONS.md` · Projekt-Regeln: `CLAUDE.md`

## Compliance-Grundsätze

- **Kein Prompt-Logging** — Nutzereingaben werden nie gespeichert oder analysiert
- **Mandantentrennung** — tenant_id ausschließlich aus JWT, Row-Level Security in PostgreSQL
- **Rechtegeprüfte Generierung** — RAG nutzt nur Dokumente mit aktiver Leseberechtigung
- **Vier-Augen bei Inhalten** — Social-Media-Beiträge brauchen Freigabe durch zweite Person
- **Secrets nie im Code** — nur über `.env` (nicht im Repository)
