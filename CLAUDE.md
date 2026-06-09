# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projekt

**DRK MV KI-Plattform** — Mandantenfähige, lokal gehostete KI-Plattform (Neubau) für die 15 DRK-Kreisverbände in Mecklenburg-Vorpommern. Textassistenz und RAG mit isolierten Wissensdatenbanken pro Kreisverband. Kein Byte verlässt den jeweiligen Mandanten.

- **Auftraggeber:** DRK Landesverband Mecklenburg-Vorpommern e.V.
- **Dienstleister:** ST Computer GmbH (Sven Truderung, st@stc.de)
- **Kein Fork** von kvbrain — kompletter Neubau mit Mandantenfähigkeit von Grund auf.
- Vollständiger Compliance-Kontext: [`docs/company-context.md`](docs/company-context.md)

## Stack (wird bei /bootstrap festgelegt)

Orientierungspunkte bis zur Entscheidung:

- **Backend:** Python + FastAPI (LLM-Ökosystem, Microservice-Pflicht aus Lastenheft §5.2)
- **Datenbank:** PostgreSQL mit Row-Level-Security (Multi-Tenancy)
- **LLM:** Ollama / LiteLLM / vLLM — lokal, kein externer API-Aufruf
- **Vector DB:** Qdrant / Weaviate / pgvector
- **Frontend:** TBD (OpenWebUI als Referenz im Lastenheft)
- **Container:** Docker/Compose (Minimum) → Kubernetes bei ≥ 3 Kreisverbänden zentral

Nach Stack-Entscheidung: `.claude/rules/code-style-guide.md` §1 mit konkreten Versionen befüllen.

## Architektur-Constraints (nicht verhandelbar)

- **Multi-Tenancy strikt:** Physische oder logische DB-Trennung pro Kreisverband. `tenant_id` immer explizit benennen, nie implizit aus Kontext ableiten.
- **Zero-Data-Leak:** Alle LLMs und Embedding-Modelle lokal. Kein externer API-Aufruf ohne explizite Konfiguration.
- **RAG pro Tenant:** Isolierte Wissensdatenbanken, Dokument-ACL, Zitierungspflicht bei jeder RAG-Antwort.
- **API-First:** Alle Funktionen via REST. Versionierung `/api/v1/...`. OpenAPI 3.x Spec für alle Endpunkte.
- **Auth:** JWT-Validierung bei jedem Request. `tenant_id` kommt aus dem Token, nie aus User-Input. Header `X-Tenant-ID` zusätzlich zu JWT-Claims.
- **Kein Prompt-Logging:** Nutzereingaben werden technisch nicht persistiert. Audit-Log erfasst nur administrative Aktionen.
- **Streaming Pflicht:** Time-to-First-Token < 2 Sekunden (Lastenheft §6.1).

## Prioritätsreihenfolge bei Zielkonflikten

1. Datenschutz / Compliance (DSGVO Art. 9, §35 SGB I)
2. Mandantentrennung
3. Security (Zero-Data-Leak, kein Prompt-Logging)
4. Funktionalität
5. Performance
6. Developer Experience

Wenn unsicher: Datenschutz-by-Design wählen, im ADR dokumentieren, Operator fragen.

## Compliance-Pflichten (KRITISCH)

- **DSGVO Art. 9:** Sozialdaten sind besondere Kategorien. Verarbeitung nur mit expliziter Rechtsgrundlage.
- **§35 SGB I:** Sozialdaten unterliegen dem Sozialgeheimnis. Weitergabe streng limitiert.
- **EU AI Act:** Voraussichtlich Hochrisiko-Klassifikation. `AI_SYSTEM.md` vor Go-Live erforderlich.
- **ADV Art. 28 DSGVO:** Auftragsverarbeitungsvertrag DRK KV ↔ DRK LV MV ↔ ST Computer — vor Go-Live unterzeichnet.
- **Pentest:** Dokumentierter Penetrationstest ist Abnahmekriterium (Lastenheft §7).

Sensible Pfade mit Bearbeitungsvorbehalt: [`.claude/sensitive-paths.json`](.claude/sensitive-paths.json) — vor Änderungen an `dpo/`, `config/tenants/`, `migrations/`, `kubernetes/prod/` immer nachfragen.

## Code-Konventionen

**Dateien/Ordner:** `kebab-case` · **Klassen:** `PascalCase` · **Funktionen/Variablen:** `snake_case` (Python) / `camelCase` (JS/TS) · **Konstanten:** `UPPER_SNAKE_CASE`

Kommentar-Prefixes die zu beachten sind:
- `# TENANT-ISOLATION:` — an komplexer Mandantentrennungslogik
- `# COMPLIANCE:` — an datenschutzkritischen Stellen (z.B. `# COMPLIANCE: kein Logging von Prompt-Inhalt`)

**Logging:** Structured JSON mit Level, Timestamp, Service, RequestID, TenantID — **niemals** Prompt-Inhalt. Kein Stack-Trace an den Client, kein Tenant-Kontext in Fehlermeldungen.

**API-Antwortformat:**
```json
{ "data": ..., "meta": { "tenant_id": "...", "request_id": "..." } }
```

## Tests

- Pytest für Python (oder Framework-Äquivalent nach Stack-Entscheidung)
- Coverage-Ziel: > 80 %
- **Pflicht:** Tenant-Isolation-Tests — prüfen, dass kein cross-tenant Datenzugriff möglich ist
- Security-Tests: OWASP Top 10 relevante Szenarien

## Dokumentation

- Architekturentscheidungen: `docs/adr/ADR-XXX-titel.md`
- Compliance-Artefakte: `dpo/controls/` (nur mit DPO-Freigabe ändern)
- Runbooks: `docs/runbooks/`
- Lessons: `journal/lessons/`

## Governance

- **Vier-Augen-Prinzip:** Kein Direct-Push auf `main` — immer PR + Review
- **Commit-Messages:** Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`)
- **Semantic Versioning:** `v0.1.0`, `v0.2.0` etc. Release-Notes in `CHANGELOG.md`
- **Definition of Done:** Siehe [`CONVENTIONS.md`](CONVENTIONS.md) — insbesondere: Mandantentrennung geprüft, Compliance-Impact bewertet, kein Prompt-Logging eingebaut

## Nächste Schritte

1. `/bootstrap` starten — Stack-Entscheidung + Repo anlegen (GitHub)
2. Compliance-Artefakte erzeugen: DPIA, Verarbeitungsverzeichnis, `AI_SYSTEM.md`
3. Pilot-Rollout: erst 1 Kreisverband, dann schrittweise weitere 14

Offene Punkte (Stack, CI/CD, Secrets, Netzwerk) dokumentiert in [`intake/PROJECT-INTAKE.md`](intake/PROJECT-INTAKE.md) §6.
