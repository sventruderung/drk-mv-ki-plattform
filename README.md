# kv-brain — KI-Plattform (White-Label)

Lokal gehostete, mandantenfähige KI-Plattform. Kein Datenbyte verlässt das
System — alle Modelle laufen lokal (Zero-Data-Leak, DSGVO-konform).

> **Branch `feat/white-label-mono`:** organisationsneutrale Variante. Markenname,
> Farbe, Logo und Sichtbarkeits-Gruppen sind über die `.env` konfigurierbar
> (Standard: kv-brain). Der Branch `main` enthält die DRK-MV-spezifische Variante.

## Funktionen

| Modul | Beschreibung |
|---|---|
| **KI-Chat** | Open WebUI mit Qwen3 32B (lokal via Ollama) |
| **Wissensbasis (RAG)** | Mehrere frei benennbare Wissensdatenbanken; Dokumente in 24 Formaten (inkl. OCR für Scans, Ordner-/ZIP-Upload, Duplikat-Erkennung); rechtegeprüfte Suche mit Reranking und Quellen-Zitaten — Nutzer sehen nur Inhalte, für die ihre Gruppe freigeschaltet ist |
| **Externe Modelle** | Optional OpenAI/Anthropic, pro Nutzer freigebbar, lokal/extern klar gekennzeichnet (Standard: deaktiviert) |
| **Dokumentensystem (ELO)** | Read-only-Anbindung an ein ELO-DMS über die Connector-Registry |
| **Verwaltung** | Browser-UI (`/admin`): Dokumente, Wissensdatenbanken, Nutzer, Audit-Protokoll, Monitoring, System-Steuerung |
| **SSO** | Keycloak (OIDC), mit/ohne Active-Directory-Anbindung |

## Branding & Gruppen (White-Label)

Alles aus der `.env` — eine Codebasis, pro Installation eine Konfiguration:

```bash
BRAND_NAME=kv-brain
BRAND_COLOR=#235FA6
BRAND_LOGO=logo.svg
ACL_GROUPS=alle:Alle Mitarbeitenden,gf:GF,verwaltung:Verwaltung,datenschutz:Datenschutz,esf-brb:ESF BRB,panel:Panel,rehapro:Rehapro,my-turn:my turn
```

- Logo: `services/api-gateway/src/static/admin/logo.svg` (Admin-UI + Keycloak-Login),
  PNGs unter `infra/openwebui/branding/` (Open WebUI). Durch offizielle Dateien ersetzbar.
- Sichtbarkeits-Gruppen sind datengetrieben: aus `ACL_GROUPS` entstehen Realm-Rollen,
  UI-Checkboxen, Filter und Rollen-Labels automatisch.

## Architektur

```
Open WebUI (:3000) ──── Ollama (:11434, Qwen3 32B + nomic-embed-text)
     │ Pipes (OIDC-Token)
     ▼
API-Gateway (:8000) ── JWT-Validierung, tenant_id + Rollen aus Token
     ├── rag-service (:8001) ──────── PostgreSQL + pgvector (RLS) / MinIO
     ├── llm-service (:8002) ──────── Ollama / optional OpenAI · Anthropic
     ├── connector-service (:8004) ── Connector-Registry
     └── elo-connector (:8006) ────── ELO-DMS (read-only)

Caddy (:80/:443, HTTPS) · Keycloak (:8080, Login/Rollen/Realm)
```

## Installation (NVIDIA DGX Spark)

```bash
git clone https://github.com/sventruderung/drk-mv-ki-plattform.git
cd drk-mv-ki-plattform
git checkout feat/white-label-mono     # White-Label-Branch

bash scripts/setup_dgx.sh              # .env (Secrets automatisch), Build, Modelle
python3 scripts/setup_keycloak.py      # Realm, Rollen, erster Admin, Login-Theme
docker compose up -d --force-recreate api-gateway open-webui
python3 scripts/setup_openwebui.py     # Pipes installieren
python3 scripts/smoke_test.py          # alle Dienste prüfen
```

Ausführliche Anleitung: `docs/Installationsanleitung-kv-brain-DGX.docx` und `docs/runbooks/`.

## Betrieb

```bash
bash scripts/migrate.sh                       # DB-Schema nachziehen (nach git pull)
sudo bash scripts/backup.sh --install         # Backup-Dispatcher (Zeitplan + NAS im UI)
sudo apt install -y smbclient                  # nur falls Backup auf NAS genutzt wird
python3 scripts/set_host.py <host> [--https]  # nach IP-/Netzwechsel
```

Nach `docker compose down` (z.B. OS-Update) immer mit `docker compose up -d` abschließen —
bewusst gestoppte Container starten nicht von selbst.

## Compliance-Grundsätze

- **Kein Prompt-Logging** — Nutzereingaben werden nie gespeichert oder analysiert
- **Mandantentrennung** — tenant_id ausschließlich aus JWT, Row-Level Security in PostgreSQL
- **Rechtegeprüfte Generierung** — RAG nutzt nur Dokumente mit aktiver Leseberechtigung der Nutzergruppe
- **Externe Modelle nur bewusst** — standardmäßig deaktiviert, Aktivierung nur durch Admin (DSB-Freigabe), in jeder Antwort als extern gekennzeichnet
- **Secrets nie im Code** — nur über `.env` (nicht im Repository)

Konventionen: `CONVENTIONS.md` · Projekt-Regeln: `CLAUDE.md`
