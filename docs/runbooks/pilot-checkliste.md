# Pilot-Checkliste: Mono-Installation für einen Kreisverband

Reihenfolge für die Erstinbetriebnahme auf dem DGX Spark. Jeder Punkt muss
abgehakt sein, bevor echte Nutzer eingeladen werden.

## A. Basis-Setup

- [ ] DGX Spark im KV-Netz, statische IP, SSH-Zugang
- [ ] Repo geklont, `bash scripts/setup_dgx.sh` durchgelaufen
- [ ] `python3 scripts/smoke_test.py` — alle Checks grün

## B. Keycloak konfigurieren (automatisiert)

- [ ] `python3 scripts/setup_keycloak.py` ausführen — fragt KV-Name,
      optional Hostname und das erste Admin-Konto ab; erledigt
      Client-Secret, tenant_id-Mapper, Service-Account-Rollen und
      Redirect-URIs in einem Lauf
- [ ] `docker compose up -d` (Services laden das neue Client-Secret)
- [ ] Verwaltungs-UI → ⚙️ Einstellungen → **Systemstatus**: alle Checks grün
- [ ] Optional AD-Anbindung: siehe `ldap-ad-anbindung.md` — Nutzer kommen
      dann aus dem AD, nur Rollen werden im Verwaltungs-UI vergeben.
      Mindestens ein lokales kv-admin-Konto behalten (Break-Glass)
- [ ] 2–3 Pilot-Nutzer im Verwaltungs-UI (Tab 👥 Nutzer) anlegen:
  - Redaktion: `content-editor` (+ `kv-alle`)
  - Führungskraft: `content-approver`, ggf. `kv-vorstand`
  - Fachbereich: z.B. `kv-pflege`

## C. Open WebUI einrichten (Port 3000)

- [ ] Erstes Konto = Admin-Konto (lokal), danach Login nur noch via "DRK Login"
- [ ] Pipe `drk_rag_pipe.py` installiert + aktiviert (siehe `openwebui-rag-pipe.md`)
- [ ] Pipe `drk_content_pipe.py` installiert + aktiviert
- [ ] Verifizieren: `oauth_id_token`-Cookie wird nach Keycloak-Login gesetzt
      (Browser-DevTools → Cookies) — versionsabhängig!

## D. Wissensbasis befüllen (Verwaltungs-UI)

- [ ] Verwaltungs-UI öffnen: `http://<host>:8000/admin/` → Login via Keycloak
- [ ] Testdokumente per Drag-and-Drop hochladen, Sichtbarkeit per Checkbox wählen
- [ ] Mindestens ein Dokument mit eingeschränkter Sichtbarkeit (nur Vorstand)
- [ ] Tab **Protokoll** (als kv-admin): Upload-Einträge erscheinen im Audit-Log
- [ ] Alternative für Massen-Import: `python3 scripts/upload_docs.py --help`

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
- [ ] **TC-Audit**: Upload, Löschung und Freigabe-Entscheidungen erscheinen im
      Protokoll-Tab; Einträge sind nicht änderbar (kein UPDATE/DELETE-Recht)
- [ ] **TC-Audit-Zugriff**: Nutzer ohne `kv-admin` sieht den Protokoll-Tab nicht
      und erhält bei direktem API-Aufruf HTTP 403

## E2. HTTPS aktivieren (siehe `https-setup.md`)

- [ ] DNS-Eintrag zeigt auf den Server, Ports 80/443 offen
- [ ] `ACME_EMAIL` und `KEYCLOAK_PUBLIC_URL` in `.env` gesetzt
- [ ] Hostname im Admin-UI eingetragen (⚙️ Einstellungen)
- [ ] Keycloak-Redirect-URIs um HTTPS-Adressen ergänzt
- [ ] `https://<hostname>` lädt mit gültigem Zertifikat; HTTP leitet um
- [ ] Interne Ports (8000, 3000, 8080) in der Firewall geschlossen

## F. Pilot-Start

- [ ] Kurzeinweisung der Pilot-Nutzer (30 Min: Login, Chat, Wissensbasis, Social Media)
- [ ] Feedback-Kanal benannt (für Co-Creation-Zyklus)
- [ ] Backup eingerichtet: `postgres_data`- und `minio_data`-Volumes sichern

## Offene Punkte nach Pilot (bewusst nicht im Scope)

- Pentest + DSB-Freigabe (Go-Live-Kriterien §7 — blocking für Produktivbetrieb)
- P03 Drittsystem-Integrationen
- No-Code-Prompt-Management (admin-service, §5.2)
- Automatisches Social-Media-Publishing (Phase 4, erfordert DSB-Freigabe)
