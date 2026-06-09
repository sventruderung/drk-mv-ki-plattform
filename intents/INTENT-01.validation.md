---
intent_ref: INTENT-01
status: gruen
validated_at: 2026-06-09
---

# Validation-Report INTENT-01

Bezugs-Datei: [INTENT-01.md](INTENT-01.md)

## Stufe 1 — Linter (deterministisch)

| Pattern | Status | Treffer-Zitat | Vorschlag |
|---------|--------|---------------|-----------|
| Fehler 1 — Versteckter Feature-Intent | [OK] | Kein Treffer — keine Technologiewörter (Chatbot, KI, System, API etc.) im Statement | — |
| Fehler 2 — Nicht messbarer Intent | [OK] | Kein Treffer — "≤ 5 Min", "≥ 12 von 15 Kreisverbänden", "18 Monate" sind harte Zahlen | — |
| Fehler 3 — Unternehmens-Intent | [OK] | Kein Treffer — beginnt mit Nutzergruppe "Verwaltungs- und Fachkräfte", nicht mit "Wir wollen" | — |
| Fehler 4 — Mega-Intent | [OK] | ~25 Wörter im Kernsatz; eine Hauptmetrik (Bearbeitungszeit) + qualifizierende Bedingung (12/15 KV) — kein zweiter primärer Metrik-Block | — |
| Fehler 5 — Copy-Paste-Intent | [OK] | Kein Treffer — "DRK-Kreisverbände MV", "Sozialdaten" sind eindeutig kontextspezifisch | — |

**Stufe-1-Befund:** 0 Treffer — Stufe 1 grün.

## Stufe 2 — LLM-Stresstest (qualitativ)

| Soulkiller | Status | Operator-Begründung |
|------------|--------|----------------------|
| Tech-Trap | [OK] | Kein Tech-Wort im Statement. Ohne KI wäre der Intent identisch gültig (könnte auch durch strukturiertes Vorlagenarchiv oder Intranet adressiert werden). Technologieentscheidung kommt in der Implementierung. |
| Process-Trap | [OK] | Operator hat bewusst bestätigt: Zeit-Einsparung (45 Min → 5 Min) ist der eigentliche Wert für Verwaltungsfachkräfte — kein abstrakterer Nutzen ("mehr Zeit für Betreuungsarbeit") dahinter erforderlich. Die Effizienz-Metrik ist das Outcome, nicht ein Proxy dafür. |
| Experience-Trap | [OK] | "Experience" kommt nicht vor. Stattdessen konkretes Erlebnis: Fachkraft hat Dokument in unter 5 Minuten, ohne Kolleg anfragen oder Netzlaufwerk durchsuchen zu müssen. |

**Stufe-2-Befund:** Alle 3 Soulkiller OK — Stufe 2 grün.

## Goldstandard-Vergleich

Vergleich gegen das Londoner-Team-Beschwerde-Beispiel (Schrader Kap. 4):

Das Londoner-Beispiel: "Kunden mit Beschwerden sollen innerhalb von 60 Minuten eine hilfreiche Lösung für ihr spezifisches Problem erhalten, ohne mehrmals nachfragen oder eskalieren zu müssen. Erfolg = CSAT steigt von 3,0 auf 4,0 innerhalb von 3 Monaten."

1. **Reibungspunkt noch konkreter** — "ohne Kollegen zur Vorlagensuche bemüht werden" ist gut, aber "ohne in veralteten Netzlaufwerken zu suchen" wäre noch präziser als Schmerzpunkt-Beschreibung. Bewusst nicht geändert, da der Operator die Formulierung so bestätigt hat.
2. **Zeitrahmen für Effizienz-Metrik** — 6 Monate nach Go-Live für die 45→5-Min-Messung ist explizit. Goldstandard-konform.
3. **Draft ist auf Goldstandard-Niveau** — Nutzergruppe definiert, Ergebnis messbar, Problem benannt, kein Tech-Trap, kein Process-Trap, kein Experience-Trap, kontextspezifisch.

## Empfehlung

**Status:** grün

**Begründung:** Der Intent erfüllt alle drei Schrader-Kriterien (präzise / Ergebnis / Nutzerperspektive). Stufe 1 ohne Treffer, Stufe 2 alle Soulkiller bewusst geklärt. Die Synthese aus Draft A (Effizienzmetrik) und Draft B (DSGVO-Rahmen + Rollout-Scope) ist stimmig — die Adoption (12/15 KV) fungiert als qualifizierende Bedingung, nicht als zweite Hauptmetrik. Baseline-Erhebungsplan ist definiert.

**Nächster Schritt:**
→ `intents/INTENT-01.md` ist Input für `/ideation` in Claude Code.

Empfohlene Commit-Message nach Ablage im Projekt-Repo:

```
intent: INTENT-01 (drk-mv-ki-plattform-verwaltungseffizienz) — founding

Self-Check: gruen
Quellen: Lastenheft DRK LV MV (Juni 2026), kvbrain-Website (kvbrain.stc.de)
```
