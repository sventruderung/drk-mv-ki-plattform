# Code-Style-Guide — DRK MV KI-Plattform

> Erzeugt von `prep-to-rules` am 2026-06-09. Stack-spezifische Regeln bei /bootstrap ergänzen.

## 1 · Stack-Entscheidungen

Stack wird bei /bootstrap festgelegt. Orientierungspunkte:

- Backend: Python (LLM-Ökosystem, FastAPI/Django empfohlen)
- Frontend: WEISS-ICH-NICHT (OpenWebUI als Referenz im Lastenheft)
- Datenbank: WEISS-ICH-NICHT (PostgreSQL mit Row-Level-Security für Multi-Tenancy empfohlen)
- LLM-Integration: Ollama / LiteLLM / vLLM (lokal, kein externer API-Aufruf)
- Vector DB: WEISS-ICH-NICHT (Qdrant / Weaviate / pgvector empfohlen)

Nach Stack-Entscheidung: diese Sektion mit konkreten Versionen befüllen.

## 2 · Naming

- **Dateien/Ordner:** `kebab-case`
- **Klassen:** `PascalCase`
- **Funktionen/Variablen:** `snake_case` (Python), `camelCase` (JS/TS)
- **Konstanten:** `UPPER_SNAKE_CASE`
- **Tenant-ID im Code:** immer explizit als `tenant_id` benennen (nie implizit aus Kontext)

## 3 · Kommentare / Dokumentation

- Jede Funktion/Methode mit Docstring (Google-Style für Python)
- Komplexe Tenant-Isolation-Logik: inline Kommentar mit "TENANT-ISOLATION:" Prefix
- Compliance-kritische Stellen: "COMPLIANCE:" Prefix (z.B. `# COMPLIANCE: kein Logging von Prompt-Inhalt`)
- ADRs für alle Architekturentscheidungen: `docs/adr/ADR-XXX-titel.md`

## 4 · Tests

- Unit-Tests: jede Funktion mit Business-Logik
- Integrationstests: jede API-Endpoint
- **Pflicht-Testklasse:** Tenant-Isolation-Tests (prüfen, dass kein cross-tenant Datenzugriff möglich)
- Coverage-Ziel: > 80 % (streng)
- Security-Tests: OWASP Top 10 relevante Szenarien
- Pytest für Python (oder Framework-Äquivalent für gewählten Stack)

## 5 · Fehler-Handling

- Keine Stack-Traces an den Client (besonders wichtig: kein Tenant-Kontext in Fehlermeldungen)
- Structured Logging (JSON): Level, Timestamp, Service, RequestID, TenantID — **niemals** Prompt-Inhalt
- Fehler-Codes dokumentiert in `docs/error-codes.md`
- Uncaught Exceptions ins Monitoring (Alert bei Prod)

## 6 · Security

**Diese Regeln sind nicht verhandelbar (Governance: streng):**

- SQL-Queries: ausschließlich Parameterized Queries / ORM — kein string concat
- Auth: JWT-Validierung bei jedem Request, Tenant-ID aus Token (nicht aus User-Input)
- Input-Validierung: alle Eingaben serverseitig validieren (Pydantic / Zod o.ä.)
- Dateizugriff: nur auf explizit erlaubte Tenant-Verzeichnisse
- Kein Logging von Prompt-Inhalten (Datenschutz-by-Design)
- Dependency-Check: `pip-audit` / `npm audit` in CI
- Secrets: nie im Code, nie in Git (`.env.example` mit Platzhaltern statt echter Werte)

## 7 · API-Design

- REST, API-First (alle Funktionen via API)
- OpenAPI 3.x Spec für alle Endpunkte (Code-First oder Spec-First, bei Bootstrap entscheiden)
- Versionierung: `/api/v1/...`
- Auth-Header: `Authorization: Bearer <JWT>`
- Tenant-Header: `X-Tenant-ID` (zusätzlich zur JWT-Claims-Validierung)
- Antwortformat: `{ "data": ..., "meta": { "tenant_id": ..., "request_id": ... } }`

## 8 · Performance

- Time-to-First-Token: < 2 Sekunden (Lastenheft §6.1) — Streaming-Ausgabe Pflicht
- API-Response-Time (non-LLM): < 200ms P95
- DB-Queries: EXPLAIN ANALYZE für alle Queries mit potenziell großen Tenant-Datenmengen
- LLM-Anfragen: Timeout konfigurierbar, Fallback bei GPU-Überlast

## 9 · Versionierung / Branching

- Semantic Versioning (MAJOR.MINOR.PATCH)
- Branch-Strategie: bei /bootstrap festlegen (Trunk-Based empfohlen für kleines Team)
- Commit-Messages: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, etc.)
- Kein Direct-Push auf `main` — immer PR + Review (Vier-Augen-Prinzip)

## 10 · Entscheidungsregeln

Bei Zielkonflikt gilt diese Prioritätsreihenfolge:

1. **Datenschutz / Compliance** (DSGVO Art. 9, §35 SGB I) — immer vorrangig
2. **Mandantentrennung** — kein Kompromiss für Performance oder Komfort
3. **Security** (Zero-Data-Leak, kein Prompt-Logging)
4. **Funktionalität** (Feature-Vollständigkeit)
5. **Performance** (erst wenn Security + Compliance sicher)
6. **Developer Experience** (Komfort, Tooling)

Wenn unsicher: Datenschutz-by-Design wählen, im ADR dokumentieren, Operator fragen.
