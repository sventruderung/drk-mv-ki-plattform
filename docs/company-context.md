# Company-Context — DRK MV KI-Plattform

> Erzeugt von `prep-to-rules` am 2026-06-09. Aktiv wegen Add-ons: privacy, eu-ai-act.
> Diese Datei beschreibt den regulatorischen und organisatorischen Kontext für Bootstrap und alle nachgelagerten Phasen.

## Firma

| Feld | Wert |
|---|---|
| Dienstleister | ST Computer Gesellschaft für angewandte Informatik GmbH |
| Ansprechpartner | Sven Truderung (st@stc.de) |
| Auftraggeber | DRK Landesverband Mecklenburg-Vorpommern e.V. |
| Endnutzer | Verwaltungs- und Fachkräfte der ~15 DRK-Kreisverbände MV |
| Branche | Sozialwirtschaft / Wohlfahrtsverband |

## Compliance-Profil

### Aktive Rechtsgrundlagen

**DSGVO Art. 9 — Besondere Kategorien personenbezogener Daten**
Das System verarbeitet potenziell Sozialdaten (Gesundheitsdaten, soziale Hilfsbedürftigkeit), die nach Art. 9 DSGVO besonderen Schutz erfordern. Verarbeitung nur mit expliziter Rechtsgrundlage (Art. 9 Abs. 2 DSGVO).

**§ 35 SGB I — Sozialdatenschutz**
Sozialdaten unterliegen dem besonderen gesetzlichen Sozialgeheimnis. Weitergabe und Nutzung sind streng limitiert. Das Zero-Data-Leak-Prinzip ist direkte Folge dieser Pflicht.

**ADV nach Art. 28 DSGVO**
Auftragsverarbeitungsvertrag zwischen:
- DRK Kreisverbände ↔ DRK Landesverband MV e.V.
- DRK Landesverband MV e.V. ↔ ST COMPUTER GmbH

Muss vor Go-Live unterzeichnet sein.

**EU AI Act**
KI-System (LLMs) verarbeitet Eingaben, die personenbezogene Sozialdaten enthalten können. Voraussichtlich Hochrisiko-Klassifikation (Art. 6 EU AI Act, Anlage III — Beschäftigung, Sozialleistungen). Genaue Klassifikation: durch dpo-Skill klären.

Folgen:
- Risikoabschätzung (DPIA) vor Inbetriebnahme
- Technische Dokumentation des KI-Systems (AI_SYSTEM.md)
- Human-Oversight nachweisbar implementieren
- Transparenz gegenüber Nutzern

## Datenverarbeitungs-Kontext

| Datenkategorie | Klassifikation | Rechtsgrundlage |
|---|---|---|
| Sozialdaten (Klientendaten) | streng vertraulich | Art. 9 DSGVO, §35 SGB I |
| Gesundheitsdaten | streng vertraulich | Art. 9 DSGVO |
| Verwaltungsdaten intern | vertraulich | Art. 6 Abs. 1 lit. b/e DSGVO |
| Nutzereingaben (Prompts) | vertraulich | dürfen nicht gespeichert werden |
| Dokumente je Kreisverband | intern / vertraulich | Mandanten-ACL |

**Zero-Data-Leak-Prinzip:**
Kein Datenbyte verlässt den Mandanten (Kreisverband) ohne explizite technische und rechtliche Freigabe. Alle LLMs und Embedding-Modelle laufen lokal.

**Kein Prompt-Logging:**
Nutzereingaben werden nicht persistiert, nicht analysiert, nicht weitergeleitet. Technisch und prozessual sicherzustellen. Audit-Log erfasst nur administrative Aktionen.

## KI-Anteil

| Komponente | Beschreibung |
|---|---|
| LLM (Text-Assistent) | Lokal gehostetes Open-Source-Modell (z.B. Llama/Qwen/Mistral-Familie) |
| Embedding-Modell | Lokal für RAG-Indexierung |
| RAG-System | Retrieval-Augmented Generation; isolierte Wissensdatenbank pro Kreisverband |
| Zitierungspflicht | Alle RAG-Antworten müssen Quellen ausweisen |
| Human Oversight | Alle KI-Ausgaben sind Assistenz; Nutzer trifft finale Entscheidung |

EU-AI-Act-Dokumentation wird durch dpo-Skill bei Bootstrap-Phase 4.4n erzeugt:
- `AI_SYSTEM.md` — Systemdokumentation nach Art. 11 EU AI Act
- `dpo/controls/dpia.md` — Datenschutz-Folgenabschätzung
- `dpo/controls/verarbeitungsverzeichnis.md`
- `dpo/controls/toms.md` — Technische und organisatorische Maßnahmen

## Referenz-Produkt

kvbrain.stc.de ist das bestehende Single-Tenant-Produkt von ST COMPUTER GmbH für Wohlfahrtsorganisationen. Es dient als Architektur-Referenz, wird aber **nicht** geforkt. Die DRK-Plattform ist ein kompletter Neubau mit Mandantenfähigkeit von Grund auf.
