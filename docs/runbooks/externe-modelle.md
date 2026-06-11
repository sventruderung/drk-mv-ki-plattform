# Runbook: Externe KI-Modelle (OpenAI / Anthropic)

Die Plattform kann optional externe Modelle anbinden. **Standardzustand:
alles deaktiviert** — ohne bewusste Admin-Aktion verlässt kein Byte das System
(Zero-Data-Leak bleibt der Default).

## Datenschutz-Grundsätze (nicht verhandelbar)

| | Lokal (Qwen3) | Extern (GPT/Claude) |
|---|---|---|
| Chat-Eingaben | bleiben auf dem Server | **gehen an den Drittanbieter** |
| Wissensbasis (RAG) | ✅ immer lokal | ❌ technisch ausgeschlossen |
| Social-Media-Texte | ✅ immer lokal | ❌ technisch ausgeschlossen |
| Voraussetzung | — | **Freigabe durch DSB** (AVV mit Anbieter!) |

Die RAG-Suche und der content-service rufen den llm-service ohne
Modell-Parameter auf — sie können externe Modelle architektonisch nicht
erreichen. Nur der direkte Chat kann (nach Freigabe) extern.

## Aktivierung (Verwaltungs-UI → ⚙️ Einstellungen)

1. **Vorher**: DSB-Freigabe einholen, AVV mit OpenAI/Anthropic abschließen
2. API-Key des Anbieters unter „API-Keys externer Anbieter" hinterlegen
   (wird nie wieder angezeigt; Änderung wird auditiert)
3. Gewünschte Modelle in der Tabelle „KI-Modelle" aktivieren:
   - **Aktiv** = Modell ist nutzbar
   - **Für alle Nutzer** = jeder darf es nutzen; sonst individuelle Freigabe
4. Individuelle Freigabe: Tab 👥 Nutzer → „Modelle" → Häkchen setzen
5. Open-WebUI-Pipe `drk_models_pipe.py` installieren (einmalig) —
   freigegebene Modelle erscheinen als „⚡ …" in der Modellauswahl

## Durchsetzung (Defense in Depth)

- **Gateway** prüft pro Anfrage: Modell aktiviert UND (für alle ODER
  Nutzer-Freigabe) — sonst HTTP 403 mit klarem Hinweis
- **llm-service** lehnt deaktivierte Modelle ab (zweite Schicht)
- **Audit**: Modell-Aktivierungen (`model.config`, mit Vermerk EXTERNER
  PROVIDER), Nutzer-Freigaben (`user.models`) und Key-Änderungen
  (`settings.apikeys`, nie der Key selbst) sind revisionssicher protokolliert
- Bei jeder Anfrage an ein externes Modell wird der Provider in den
  Metadaten geloggt (nie der Inhalt)

## Modell-Katalog erweitern

Neue Modelle per SQL (oder künftig No-Code-Admin):

```sql
INSERT INTO ai_models (id, provider, display_name) VALUES
  ('claude-haiku-4-5', 'anthropic', 'Claude Haiku 4.5 (extern!)');
```
