---
id: INTENT-01
status: founding
created: 2026-06-09
linked_initiative: null
source_platform: claude.ai
target_repo: C:\Users\st\OneDrive - ST Computer Gesellschaft für angewandte Informatik GmbH\Dokumente\AI\Claude\Projekte\kvbrain extended\DRK LV kvbrain extended
slug: drk-mv-ki-plattform-verwaltungseffizienz
---

# INTENT-01 — DRK-MV-KI-Plattform Verwaltungseffizienz

## 1. Problem-Story

Verwaltungsfachkraft beim DRK-Kreisverband Mecklenburgische Seenplatte, Neustrelitz, März 2026: Sie soll einen Ablehnungsbescheid für einen Sanitätsdienstantrag formulieren. Die interne Mustervorlage liegt irgendwo im Netzlaufwerk, niemand weiß wo genau. Sie fragt zwei Kollegen, bekommt eine veraltete Word-Datei aus 2019. Schreibt den Brief neu, braucht dafür ca. 45 Minuten. Drei Wochen später macht eine Kollegin denselben Brief — gleicher Zeitaufwand, leicht andere Formulierung.

Dieses Muster wiederholt sich systemisch: Kein Kreisverband hat eine zentrale, KI-gestützte Wissensbasis. Internes Verbandswissen ist in Netzlaufwerken verstreut, nicht abfragbar, nicht aktuell gehalten. Jeder Mitarbeitende reinventiert das Rad.

## 2. Baseline (Istzustand)

| Metrik | Aktueller Wert | Quelle | Erhebungsdatum |
|--------|----------------|--------|----------------|
| Ø Bearbeitungszeit Standardbrief/-bescheid | ~45 Min | Story-Schätzwert, bestätigt durch Operator (Workshop-Beobachtung) | 2026-06 |
| Aktive KI-Nutzung in DRK-Kreisverbänden MV | 0 von 15 | Ausgangszustand vor Projektstart | 2026-06 |
| Nutzer-CSAT (Arbeitszufriedenheit Dokumentation) | nicht erhoben | Baseline-Survey geplant vor Go-Live | TBD |

Erhebungsplan: Kurzumfrage bei 10 MA im Pilot-Kreisverband vor Go-Live zur Verifizierung der 45-Min-Schätzung.

## 3. Intent-Drafts

### Draft A (Effizienz)

> Verwaltungs- und Fachkräfte der DRK-Kreisverbände MV sollen Standarddokumente und interne Wissensabfragen in unter 5 Minuten erledigen, ohne veraltete Vorlagen zu suchen oder Kollegen zu fragen.
> Erfolg = Ø Bearbeitungszeit für einen Standardbrief sinkt von ~45 Min auf ≤ 5 Min, gemessen 6 Monate nach Go-Live im Pilot-Kreisverband.

### Draft B (Breite Nutzung + DSGVO-Vertrauen)

> Mitarbeitende aller DRK-Kreisverbände MV sollen KI für tägliche Verwaltungsaufgaben nutzen können, ohne Datenschutzbedenken bei der Eingabe vertraulicher Sozialdaten.
> Erfolg = ≥ 12 von 15 Kreisverbänden aktiv im System nach 18 Monaten, Nutzer-CSAT ≥ 4,0.

### Draft AB — Synthese (gewählt)

> Verwaltungs- und Fachkräfte der DRK-Kreisverbände MV sollen Standarddokumente und interne Wissensabfragen in unter 5 Minuten erledigen, ohne dass Sozialdaten die Organisation verlassen oder Kollegen zur Vorlagensuche bemüht werden.
> Erfolg = Ø Dokumentenerstellungszeit sinkt von ~45 Min auf ≤ 5 Min bei aktiver Nutzung in ≥ 12 von 15 Kreisverbänden, 18 Monate nach Go-Live.

## 4. Self-Check

Vollständiger Self-Check: siehe [INTENT-01.validation.md](INTENT-01.validation.md).

**Status:** grün

**Kurzfassung:** Stufe 1 ohne Treffer. Alle drei Soulkiller geklärt. Process-Trap bewusst bestätigt: Zeit-Einsparung ist der eigentliche Wert für Verwaltungsfachkräfte — kein tieferes Outcome dahinter erforderlich.

## 5. Erfolgsmetrik

| Metrik | Istwert | Zielwert | Zeitrahmen | Messverfahren |
|--------|---------|----------|------------|---------------|
| Ø Bearbeitungszeit Standardbrief | ~45 Min | ≤ 5 Min | 6 Monate nach Go-Live | Selbstauskunft-Befragung, 10 MA im Pilot-KV |
| Aktive Kreisverbände im System | 0 von 15 | ≥ 12 von 15 | 18 Monate nach Go-Live | Login-Aktivität im Admin-Dashboard |
| Nutzer-CSAT | nicht erhoben | ≥ 4,0 / 5 | 12 Monate nach Go-Live | Kurzumfrage nach erstem Quartal Nutzung |

## Intent-Statement (final)

> **Verwaltungs- und Fachkräfte der DRK-Kreisverbände MV sollen Standarddokumente und interne Wissensabfragen in unter 5 Minuten erledigen, ohne dass Sozialdaten die Organisation verlassen oder Kollegen zur Vorlagensuche bemüht werden. Erfolg = Ø Dokumentenerstellungszeit sinkt von ~45 Min auf ≤ 5 Min bei aktiver Nutzung in ≥ 12 von 15 Kreisverbänden, 18 Monate nach Go-Live.**

---
*Ausgangsbasis: kvbrain.stc.de (ST COMPUTER GmbH) — Erweiterung auf mandantenfähige Multi-KV-Plattform für DRK Landesverband Mecklenburg-Vorpommern e.V.*
*Rohmaterial: Lastenheft DRK LV MV (Juni 2026) + kvbrain-Website (chat:pasted-2026-06-09)*
