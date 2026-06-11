# Runbook: Open-WebUI-RAG-Pipe einrichten

Die Pipe `DRK Wissensbasis (RAG)` macht die rechtegeprüfte Dokumentensuche
(§4.2 Lastenheft) direkt in Open WebUI nutzbar. Sie erscheint dort als
eigenes Modell in der Modellauswahl.

## Funktionsweise

```
Nutzer (in Open WebUI per Keycloak eingeloggt)
   │  Frage an Modell "DRK Wissensbasis (RAG)"
   ▼
Pipe liest oauth_id_token-Cookie der Nutzer-Session
   │  POST /api/v1/rag/chat  (Authorization: Bearer <ID-Token>)
   ▼
API-Gateway validiert Token, extrahiert tenant_id + Rollen
   │  ACL-gefilterte pgvector-Suche → Quellen-Prompt → LLM
   ▼
Antwort mit Zitaten [Quelle: Dokument, Seite X] zurück in den Chat
```

Damit gilt: Jeder Nutzer sieht in den Antworten nur Inhalte aus Dokumenten,
für die er eine aktive Leseberechtigung hat — identisch zur Gateway-API.

## Installation (einmalig, als Open-WebUI-Admin)

1. Open WebUI öffnen → **Admin-Panel → Funktionen → Neue Funktion**
2. Inhalt von `infra/openwebui/pipes/drk_rag_pipe.py` einfügen, speichern
3. Funktion **aktivieren** (Schalter)
4. Unter **Ventile (Valves)** prüfen:
   - `gateway_url`: `http://api-gateway:8000` (Docker-intern, Standard passt)
5. In der Modellauswahl erscheint jetzt **DRK Wissensbasis (RAG)**

## Voraussetzungen

- Login in Open WebUI über **DRK Login** (Keycloak-OIDC) — lokale
  Open-WebUI-Konten haben kein Token und bekommen einen Hinweis statt Antwort
- `ENABLE_OAUTH_ID_TOKEN_COOKIE: "true"` im Compose (bereits gesetzt)
- Keycloak-Realm-Mapper liefern `tenant_id` und `realm_access.roles`
  auch im **ID-Token** (bereits im Realm-Export `drk-kv-realm.json`)

## Abnahmetest (gehört zu TC-02)

1. Als Nutzer **mit** Rolle `kv-pflege` anmelden → Frage zu einem
   Pflege-Dokument stellen → Antwort mit Zitat erwartet
2. Als Nutzer **ohne** diese Rolle anmelden → gleiche Frage →
   Erwartung: „Zu Ihrer Frage liegen keine freigegebenen Informationen
   in der Wissensbasis vor."
3. Abmelden, Cookie löschen, Frage stellen → Hinweis auf fehlendes Token

## Bekannte Grenzen

- Das ID-Token läuft nach 15 Minuten ab (Realm-Einstellung
  `accessTokenLifespan`). Open WebUI erneuert es beim nächsten Login;
  bei abgelaufenem Token liefert die Pipe einen klaren Hinweis.
- Dokumenten-Upload läuft weiterhin über die Gateway-API
  (`POST /api/v1/documents`) — nicht über den Open-WebUI-Upload
  (der würde in der lokalen Open-WebUI-Wissensbasis landen, ohne ACL).
