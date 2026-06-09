---
intake_ref: PROJECT-INTAKE
status: gelb
validated_at: 2026-06-09
---

# Validation-Report PROJECT-INTAKE

Bezugs-Datei: [PROJECT-INTAKE.md](PROJECT-INTAKE.md)

## Stufe 1 — Pflichtfeld-Completeness

| Pflicht-Feld | Frage-ID | Akzeptabel-Wert | Tatsächlich | Status |
|---|---|---|---|---|
| Projekt-Beschreibung | prep-F1 | Wert oder INTENT-Verweis | Vollständige Beschreibung + intent_ref: INTENT-01 | [OK] |
| Stack / Sprachen | prep-F2 | Wert ODER WEISS-ICH-NICHT | WEISS-ICH-NICHT / Beratung | [OK] |
| Projektname + Slug | prep-F5 | expliziter Wert | drk-mv-ki-plattform, 0.1.0 | [OK] |
| Backlog-Tool | prep-F6 | Wert ODER Default github-issues | github-issues (Default) | [OK] |
| Compliance/Privacy-Profil | prep-F7 | 4 Trigger-Flags adressiert | pii=ja, ki=ja, reguliert=ja, kosten=nein | [OK] |
| Governance-Strenge | prep-F8 | locker \| normal \| streng | streng | [OK] |
| Doku-Wohnort | prep-F13 | Wert ODER Default repo-docs | repo-docs (Default) | [OK] |
| Hosting / Ziel-Runtime | int-C1.1 | Wert ODER WEISS-ICH-NICHT | On-Prem / Private Cloud DE | [OK] |
| CI/CD-System | int-C2.1 | Wert ODER WEISS-ICH-NICHT | out-of-scope (Neubau) | [OK] |
| Secrets-Management | int-C5.1 | Wert ODER WEISS-ICH-NICHT | out-of-scope (Neubau) | [OK] |

**Stufe-1-Befund:** 0 Treffer — Stufe 1 grün.

## Stufe 2 — Konsistenz-Checks

| Check-Name | Trigger-Bedingung | Tatsächlich | Status | Operator-Begründung |
|---|---|---|---|---|
| Trigger-Mapping (privacy) | pii=ja → privacy in addons_triggered | privacy aktiv ✓ | [OK] | — |
| Trigger-Mapping (eu-ai-act) | ki=ja → eu-ai-act in addons_triggered | eu-ai-act aktiv ✓ | [OK] | — |
| eu-ai-act Belege | eu-ai-act aktiv → KI-Bestandteil + PII in §4 belegt | §4 enthält LLM-Beschreibung + Sozialdaten | [OK] | — |
| github-issues → Repo da | backlog=github-issues → prep-F12 nicht leer | prep-F12 = WEISS-ICH-NICHT | [?] | Neubau — Repo wird bei /bootstrap angelegt. Kein Block. |
| governance=streng → C6 nicht leer | streng → int-C6.1 ausgefüllt | DSGVO, Pentest, Audit-Log vorhanden | [OK] | — |
| KI + Kundendaten → Privacy aktiv | ki=ja → privacy in addons_triggered | privacy aktiv | [OK] | — |
| doc-ssot=vault → Begründung | documentation_ssot=vault → Begründung | repo-docs (kein Vault) | [OK] | — |

**Stufe-2-Befund:** 1 offener Punkt (`github-issues` ohne Repo-URL) — begründet und akzeptiert.

## Stufe 3 — Skelett-Compliance

| Senke | Erwartete Struktur | Status |
|---|---|---|
| `infrastructure-playbook.md` | H2-Sektionen §1–§6 in Reihenfolge | [OK] |
| `code-style-guide.md` | H2-Sektionen §1–§10 in Reihenfolge | [OK] |
| `CONVENTIONS.md` | backlog_adapter, governance_mode, documentation_ssot vorhanden | [OK] |
| `intake/PROJECT-INTAKE.md` | YAML-Frontmatter + 7 Sektionen | [OK] |
| `.claude/sensitive-paths.json` | Valides JSON + Framework-Defaults | [OK] |

**Stufe-3-Befund:** 0 Treffer — Stufe 3 grün.

## Operator-Ausnahmen

| Check-Referenz | Begründung | Datum |
|---|---|---|
| github-issues-repo (Stufe 2) | Neubau ohne bestehendes Repo. Repo wird beim /bootstrap-Lauf angelegt. github-issues bleibt als Default korrekt. | 2026-06-09 |

## Empfehlung

**Status:** gelb

**Begründung:** Stufe 1 und Stufe 3 sauber. Eine begründete Stufe-2-Warnung: github-issues ohne Repo-URL — im Neubau-Kontext erwartet und dokumentiert. Das Paket ist für /bootstrap verwendbar. Bootstrap wird beim ersten Lauf nach der Repo-URL fragen.

**Nächster Schritt:**
- Paket am Projekt-Root entpacken
- `/bootstrap` starten — liest PROJECT-INTAKE.md als Onboarding-Dokument
- Bootstrap fragt nach Repo-URL (offener Punkt prep-F12) und Stack (prep-F2)
- Compliance-Artefakte (SECURITY.md, dpo/controls/, AI_SYSTEM.md) werden von Bootstrap-Phase 4.4n / dpo-Skill erzeugt
