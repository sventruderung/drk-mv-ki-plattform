---
id: PROJECT-INTAKE
created: 2026-06-09
generated_by: prep-to-rules
generator_version: 0.1.0
framework_pin: v0.7.9
slug: drk-mv-ki-plattform
intent_ref: INTENT-01
existing_rules_referenced: []
sources:
  - "chat:pasted-lastenheft-drk-lv-mv-2026-06"
  - "chat:pasted-kvbrain-website-2026-06-09"
status: gelb
addons_triggered:
  - privacy
  - eu-ai-act
---

# Project-Intake — DRK MV KI-Plattform

> Erzeugt von `prep-to-rules` am 2026-06-09. Single Source of Truth für
> die Pre-Bootstrap-Antworten dieses Projekts. Gehört in `intake/PROJECT-INTAKE.md`
> am Projekt-Wurzel. Wird vom `/bootstrap`-Lauf gelesen (Onboarding-Dokument-Modus).

## 1. Projekt-Kontext

- **Name:** DRK MV KI-Plattform
- **Slug:** `drk-mv-ki-plattform`
- **Beschreibung:** Mandantenfähige, lokal gehostete KI-Plattform (Neubau) für die 15 DRK-Kreisverbände in Mecklenburg-Vorpommern. Das System bietet KI-gestützte Textassistenz und ein RAG-System mit isolierten Wissensdatenbanken pro Kreisverband. Betrieb vollständig On-Premise oder in DSGVO-konformer Private Cloud in Deutschland — kein Datenbyte verlässt den jeweiligen Mandanten.
- **Start-Version:** 0.1.0
- **Intent-Verweis:** siehe [`intents/INTENT-01.md`](../intents/INTENT-01.md)

## 2. Setup-Antworten (`bootstrap-prep` Block A + B)

### Block A — Was wollt ihr bauen

#### prep-F1 — Projekt-Zweck
- **Antwort:** Mandantenfähige KI-Plattform für 15 DRK-Kreisverbände MV mit RAG-System und Textassistenz. Strikte Datentrennung pro Kreisverband. Kompletter Neubau (kein Fork von kvbrain).
- **Quelle:** chat:pasted-lastenheft-drk-lv-mv-2026-06
- **Konfidenz:** explizit

#### prep-F2 — Stack / Sprachen
- **Antwort:** WEISS-ICH-NICHT — Beratung bei /bootstrap gewünscht. Orientierung: Python-Backend naheliegend (LLM-Ökosystem), OpenWebUI als UI-Referenz im Lastenheft, Microservice-Architektur gefordert (Lastenheft 5.2).
- **Quelle:** chat:pasted-lastenheft-drk-lv-mv-2026-06
- **Konfidenz:** leer (Beratung)

#### prep-F3 — Web-Performance
- **Antwort:** Ja — Time-to-First-Token < 2 Sekunden (Lastenheft 6.1), Streaming-Ausgabe Pflicht, Responsive Design Desktop + Tablet.
- **Quelle:** chat:pasted-lastenheft-drk-lv-mv-2026-06
- **Konfidenz:** explizit

#### prep-F4 — KI-Coding-Assistent
- **Antwort:** Claude (Cowork-Session)
- **Konfidenz:** abgeleitet

#### prep-F5 — Projektname + Version
- **Antwort:** `drk-mv-ki-plattform`, Start-Version 0.1.0
- **Konfidenz:** abgeleitet (Operator bestätigt Neubau)

#### prep-F6 — Backlog-Tool
- **Antwort:** WEISS-ICH-NICHT — Default: `github-issues`
- **Konfidenz:** leer

#### prep-F7 — Compliance / Privacy-Profil
- **prep-F7-pii:** Ja — Sozialdaten (Art. 9 DSGVO, § 35 SGB I, besondere Kategorien personenbezogener Daten inkl. Gesundheitsdaten)
- **prep-F7-ki:** Ja — LLMs verarbeiten Eingaben der Nutzer lokal; Zero-Data-Leak-Prinzip (keine externen APIs ohne explizite Freigabe)
- **prep-F7-reguliert:** Ja — Sozialrecht (SGB I), DSGVO Art. 9, branchenspezifische Datenschutzpflichten
- **prep-F7-kosten:** Teilweise — GPU-Infrastruktur (zentraler Betrieb geplant zur Kostenbündelung), kein laufendes Cloud-Modell als Default
- **Konfidenz:** explizit

#### prep-F8 — Governance-Strenge
- **Antwort:** `streng` — Pentest-Pflicht als Abnahmekriterium (Lastenheft 7), Mandantentrennung auditierbar, revisionssicheres Audit-Log, DSGVO-Compliance-Nachweis
- **Quelle:** chat:pasted-lastenheft-drk-lv-mv-2026-06
- **Konfidenz:** abgeleitet (stark)

#### prep-F9 — Parallele Entwicklung
- **Antwort:** WEISS-ICH-NICHT — vermutlich kleines Team (ST Computer + ggf. DRK-IT)
- **Konfidenz:** leer

#### prep-F10 — Entwicklungsort
- **Antwort:** WEISS-ICH-NICHT
- **Konfidenz:** leer

### Block B — Was ist schon vorhanden

#### prep-F11 — Neu oder existierend?
- **Antwort:** Kompletter Neubau — kein Fork von kvbrain. kvbrain bleibt eigenständiges Produkt.
- **Konfidenz:** explizit (Operator-Bestätigung)

#### prep-F12 — Code-Repository
- **Antwort:** WEISS-ICH-NICHT — wird bei /bootstrap angelegt. Erwartung: GitHub.
- **Konfidenz:** leer

#### prep-F13 — Doku-Wohnort
- **Antwort:** `repo-docs` (Default)
- **Konfidenz:** leer (Default)

#### prep-F15 — API-Keys / Zugangsdaten vorhanden?
- **Antwort:** Noch keine (Neubau)
- **Konfidenz:** explizit

#### prep-F16 — Onboarding-Doku
- **Antwort:** WEISS-ICH-NICHT
- **Konfidenz:** leer

## 3. Integrations-Antworten (`integration-discovery` C1–C7)

### C1 — Ziel-Runtime / Hosting

#### int-C1.1 — On-Prem / Cloud / hybrid
- **Antwort:** On-Premise oder DSGVO-konforme Private Cloud ausschließlich in Deutschland (deutsches Rechenzentrum). Kein Public Cloud Default.
- **Quelle:** chat:pasted-lastenheft-drk-lv-mv-2026-06 §2.2
- **Konfidenz:** explizit

#### int-C1.3 — Datenstandort
- **Antwort:** Deutschland
- **Konfidenz:** explizit

#### int-C1.4 — Container-Plattform
- **Antwort:** Docker/Compose als Minimum; ggf. Kubernetes für Multi-Tenant-Skalierung bei zentralem Betrieb
- **Konfidenz:** abgeleitet

#### int-C1.2 / C1.5–C1.7
- **Antwort:** WEISS-ICH-NICHT
- **Konfidenz:** leer

### C2 — CI/CD-Systeme
- **Status:** out-of-scope (Neubau, kein CI/CD-System vorhanden)

### C3 — Schnittstellen / Zielsysteme

#### int-C3.2 — Schnittstellen-Typen
- **Antwort:** REST/API — API-First-Architektur explizit gefordert (Lastenheft 5.2)
- **Konfidenz:** explizit

#### int-C3.4 — Authentifizierung
- **Antwort:** OpenID Connect / OAuth2 / Active Directory — SSO-Vorbereitung oder direkte Integration (Lastenheft 6.2)
- **Konfidenz:** explizit

#### int-C3.1 / C3.3 / C3.5–C3.7
- **Antwort:** WEISS-ICH-NICHT / out-of-scope (initiale Phase)

### C4 — Netzwerk / Zugang
- **Status:** out-of-scope (hängt von DRK-IT ab, noch nicht definiert)

### C5 — Secrets-Management
- **Status:** out-of-scope (Neubau, kein bestehendes Secrets-System)

### C6 — Compliance / Audit

#### int-C6.1 — Compliance-Pflichten
- **Antwort:** DSGVO Art. 9 (besondere Kategorien), § 35 SGB I, revisionssicheres Audit-Log für administrative Aktionen (kein Logging von Prompt-Inhalten)
- **Konfidenz:** explizit

#### int-C6.2 — Datenklassifikation
- **Antwort:** Sozialdaten = streng vertraulich (Art. 9 DSGVO); Verwaltungsdaten = intern/vertraulich
- **Konfidenz:** abgeleitet

#### int-C6.3 — Pentest vor Go-Live
- **Antwort:** Ja — dokumentierter Sicherheits- und Penetrationstest als Abnahmekriterium (Lastenheft 7)
- **Konfidenz:** explizit

#### int-C6.5 — Audit-Logging
- **Antwort:** Ja — Protokollierung administrativer Änderungen (Rechtevergabe, Mandantenverwaltung). Ausdrücklich KEIN Logging von Prompt-Inhalten (Datenschutz-by-Design, Lastenheft 6.2).
- **Konfidenz:** explizit

#### int-C6.4 / C6.6
- **Antwort:** WEISS-ICH-NICHT

### C7 — Verantwortlichkeiten / Go-Live

#### int-C7.1 — Ansprechpartner
- **Antwort:** Auftraggeber: DRK Landesverband MV e.V. // Entwickler/Dienstleister: ST Computer GmbH (Sven Truderung, st@stc.de)
- **Konfidenz:** explizit

#### int-C7.5 — SLAs
- **Antwort:** Time-to-First-Token < 2s; stabile Parallelverarbeitung aus mehreren Kreisverbänden gleichzeitig
- **Konfidenz:** abgeleitet (aus Lastenheft 6.1 + 7)

#### int-C7.6 — Go-Live-Modus
- **Antwort:** Schrittweise — Pilot-Kreisverband zuerst, dann rollierender Rollout auf weitere KV
- **Konfidenz:** abgeleitet

#### int-C7.8 — Betrieb nach Go-Live
- **Antwort:** Geteilt — ST Computer GmbH (Wartung, Updates, Modell-Upgrades) + DRK LV MV (Super-Admin, Mandantenverwaltung)
- **Konfidenz:** abgeleitet

#### int-C7.2 / C7.3 / C7.4 / C7.7
- **Antwort:** WEISS-ICH-NICHT

## 4. Compliance & Privacy

### Aktive Add-ons

- **`privacy`:** ja — Sozialdaten nach Art. 9 DSGVO und § 35 SGB I werden verarbeitet. Zero-Data-Leak-Pflicht (kein Byte verlässt den Mandanten ohne explizite Freigabe).
- **`eu-ai-act`:** ja — KI-System (LLMs lokal) verarbeitet Eingaben von Nutzern, die ggf. personenbezogene Sozialdaten enthalten. Lokalbetrieb mindert Risiko, aber Dokumentationspflichten bleiben.
- **`compliance` (regulierte Branche):** ja — Sozialrecht (SGB I), DSGVO
- **`cost-efficiency`:** nein (GPU-Kosten zentral, aber kein primäres Optimierungsziel)

### Antwort-Material

#### DSGVO / Datenschutz
- **Personenbezogene Daten verarbeitet:** Ja — Sozialdaten (besondere Kategorien nach Art. 9 DSGVO), Gesundheitsdaten, SGB-I-Daten
- **Datenklassifikation:** Sozialdaten = streng vertraulich; Verwaltungsdaten = intern
- **Auftragsverarbeitung relevant:** Ja — ADV nach Art. 28 DSGVO zwischen DRK KV und ST Computer. Mandantenübergreifend: ADV zwischen DRK LV MV und ST Computer.
- **Zero-Data-Leak:** Alle LLMs und Embedding-Modelle laufen lokal. Keine externe API ohne explizite Nutzerfreigabe.

#### EU AI Act
- **KI-Bestandteil:** Lokale LLMs (Open-Source, z.B. Llama/Qwen/Mistral-Derivate) für Textassistenz und RAG-Verarbeitung
- **Verarbeitete Datenkategorien:** Nutzereingaben (ggf. Sozialdaten), interne Verbandsdokumente
- **Risikoklasse (initiale Einschätzung, keine Rechtsberatung):** Wahrscheinlich Hochrisiko-System (Art. 6 EU AI Act) wegen Verarbeitung besonderer Datenkategorien im Sozialbereich — Bootstrap-Phase 4.4n / dpo-Skill klärt belastbar
- **Human Oversight:** Ja — alle KI-Ausgaben sind Assistenz, keine automatischen Entscheidungen; Nutzer trifft finale Entscheidung

#### Regulierte Branche
- **Branche:** Sozialwirtschaft / Wohlfahrtsverbände
- **Pflichten:** DSGVO Art. 9, § 35 SGB I, Pentest-Pflicht (Abnahmekriterium)
- **Audit-/Logging-Anforderungen:** Revisionssicheres Audit-Log für administrative Aktionen; kein Logging von Prompt-Inhalten

## 5. Bestehende Regelwerke (Referenzen)

| Pfad / Quelle | Kurze Beschreibung | Verfügbar via |
|---|---|---|
| kvbrain.stc.de (Produktbasis) | Bestehende kvbrain-Lösung (ST Computer) — Referenz für Architektur-Entscheidungen, aber kein Code-Fork | Operator-Wissen |
| Lastenheft DRK LV MV, Juni 2026 | Vollständiges Anforderungsdokument | chat:pasted-lastenheft-drk-lv-mv-2026-06 |

## 6. Offene Punkte

| Frage-ID | Cluster | Status | Begründung |
|---|---|---|---|
| `prep-F2` | A — Stack | WEISS-ICH-NICHT | Beratung bei /bootstrap gewünscht |
| `prep-F6` | A — Backlog | WEISS-ICH-NICHT | Default github-issues gesetzt |
| `prep-F9` | A — Team | WEISS-ICH-NICHT | Klären bei Bootstrap |
| `prep-F10` | A — Entwicklungsort | WEISS-ICH-NICHT | Klären bei Bootstrap |
| `prep-F12` | B — Repo | WEISS-ICH-NICHT | Neubau — Repo wird bei /bootstrap angelegt |
| `prep-F16` | B — Onboarding-Doku | WEISS-ICH-NICHT | Klären bei Bootstrap |
| `int-C1.2/5-7` | C1 — Hosting Details | WEISS-ICH-NICHT | Klären mit DRK-IT |
| `int-C2.*` | C2 — CI/CD | out-of-scope | Neubau, kein System vorhanden |
| `int-C3.1/3/5-7` | C3 — Drittsysteme | WEISS-ICH-NICHT | Initiale Phase, keine Integration geplant |
| `int-C4.*` | C4 — Netzwerk | out-of-scope | Hängt von DRK-IT ab, noch offen |
| `int-C5.*` | C5 — Secrets | out-of-scope | Neubau, kein Secrets-System vorhanden |
| `int-C6.4/6` | C6 — Compliance Details | WEISS-ICH-NICHT | Klären mit DRK-Datenschutzbeauftragtem |
| `int-C7.2/3/4/7` | C7 — Governance Details | WEISS-ICH-NICHT | Klären in erstem DRK-IT-Workshop |

## 7. Validation

- **Status:** gelb
- **Validation-Report:** siehe [`PROJECT-INTAKE.validation.md`](PROJECT-INTAKE.validation.md)
- **Linter-Zusammenfassung:** Stufe 1 grün (alle Pflichtfelder beantwortet oder WEISS-ICH-NICHT). Stufe 2 ein Konsistenz-Treffer: `github-issues` ohne Repo-URL — begründet (Neubau, Repo bei /bootstrap). Stufe 3 grün.
