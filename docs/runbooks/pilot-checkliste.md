# Pilot-Checkliste: Mono-Installation für einen Kreisverband

Reihenfolge für die Erstinbetriebnahme auf dem DGX Spark. Jeder Punkt muss
abgehakt sein, bevor echte Nutzer eingeladen werden.

## A. Basis-Setup

- [ ] DGX Spark im KV-Netz, statische IP, SSH-Zugang
- [ ] Repo geklont, `bash scripts/setup_dgx.sh` durchgelaufen
- [ ] `python3 scripts/smoke_test.py` — alle Checks grün

## B. Keycloak konfigurieren (Admin UI, Port 8080)

- [ ] Realm `drk-kv` wurde automatisch importiert (Login-Seite zeigt "DRK Kreisverband")
- [ ] Client `drk-platform`: **neues Client-Secret generieren** → in `.env` eintragen → `docker compose up -d`
- [ ] tenant_id-Mapper: Wert `kv-CHANGE_ME` durch echten KV-Namen ersetzen (z.B. `kv-parchim`)
- [ ] Admin-Konto für den Mandanten-Admin anlegen, Rolle `kv-admin`
- [ ] 2–3 Pilot-Nutzer anlegen mit passenden Rollen:
  - Redaktion: `content-editor` (+ `kv-alle`)
  - Führungskraft: `content-approver`, ggf. `kv-vorstand`
  - Fachbereich: z.B. `kv-pflege`

## C. Open WebUI einrichten (Port 3000)

- [ ] Erstes Konto = Admin-Konto (lokal), danach Login nur noch via "DRK Login"
- [ ] Pipe `drk_rag_pipe.py` installiert + aktiviert (siehe `openwebui-rag-pipe.md`)
- [ ] Pipe `drk_content_pipe.py` installiert + aktiviert
- [ ] Verifizieren: `oauth_id_token`-Cookie wird nach Keycloak-Login gesetzt
      (Browser-DevTools → Cookies) — versionsabhängig!

## D. Wissensbasis befüllen

- [ ] Testdokumente hochladen:
      `python3 scripts/upload_docs.py --user <admin> --client-secret <secret> satzung.pdf`
- [ ] Mindestens ein Dokument mit eingeschränkter ACL:
      `--acl kv-vorstand vertraulich.pdf`

## E. Abnahmetests (vor Pilot-Start, §7 Lastenheft)

- [ ] **TC-Latenz**: Frage im Chat → erste Antwort-Tokens < 2 s (Ziel: < 0,5 s)
- [ ] **TC-RAG-Zitate**: Frage zur Wissensbasis → Antwort enthält [Quelle: Dokument, Seite]
- [ ] **TC-ACL positiv**: Nutzer MIT `kv-vorstand` fragt nach Vorstands-Dokument → Antwort kommt
- [ ] **TC-ACL negativ**: Nutzer OHNE `kv-vorstand` stellt gleiche Frage →
      "keine freigegebenen Informationen"
- [ ] **TC-Workflow**: Editor erstellt Social-Media-Entwurf → kann ihn NICHT
      selbst freigeben → Approver gibt frei
- [ ] **TC-Kein-Token**: Abgemeldeter Nutzer → klarer Hinweis statt Antwort
- [ ] **TC-Logs**: `docker compose logs` enthält KEINE Prompt-Inhalte (Stichprobe)

## F. Pilot-Start

- [ ] Kurzeinweisung der Pilot-Nutzer (30 Min: Login, Chat, Wissensbasis, Social Media)
- [ ] Feedback-Kanal benannt (für Co-Creation-Zyklus)
- [ ] Backup eingerichtet: `postgres_data`- und `minio_data`-Volumes sichern

## Offene Punkte nach Pilot (bewusst nicht im Scope)

- Pentest + DSB-Freigabe (Go-Live-Kriterien §7 — blocking für Produktivbetrieb)
- P03 Drittsystem-Integrationen
- No-Code-Prompt-Management (admin-service, §5.2)
- TLS/HTTPS via Reverse Proxy (für Pilot im internen Netz; vor Produktivbetrieb Pflicht)
- Automatisches Social-Media-Publishing (Phase 4, erfordert DSB-Freigabe)
