# Runbook: HTTPS mit Let's Encrypt (Caddy)

Die Plattform wird über Caddy als Reverse Proxy ausgeliefert. Zertifikate
kommen automatisch von Let's Encrypt und erneuern sich selbst.

## Architektur

```
Browser ── HTTPS (443) ──► Caddy
                             ├── /api/*, /admin*  → api-gateway:8000
                             ├── /auth*           → keycloak:8080
                             └── /                → open-webui:8080
```

Caddy nutzt **On-Demand-TLS**: Vor jeder Zertifikats-Ausstellung fragt es
`GET /api/v1/tls/check?domain=...` am Gateway an. Nur der im Admin-UI
hinterlegte Hostname wird akzeptiert — dadurch ist der Hostname **zur
Laufzeit änderbar**, ohne Caddy-Neustart und ohne Compose-Anpassung.

## Einrichtung

1. **DNS**: A-Record des gewünschten Hostnamens (z.B. `ki.kv-name.drk.de`)
   auf die öffentliche IP des Servers zeigen lassen
2. **Firewall**: Ports 80 und 443 eingehend freigeben (HTTP-01-Challenge)
3. **.env**: `ACME_EMAIL` setzen (Let's-Encrypt-Benachrichtigungen) und
   `KEYCLOAK_PUBLIC_URL=https://<hostname>/auth`
4. **Admin-UI** (`/admin` → Tab ⚙️ Einstellungen): Hostnamen eintragen,
   speichern — wird auditiert
5. **Keycloak** (`https://<hostname>/auth`): Redirect-URIs der Clients um
   die HTTPS-Adressen ergänzen:
   - `drk-admin-ui`: `https://<hostname>/admin/*`
   - `drk-platform`: `https://<hostname>/*`
6. Erster Aufruf von `https://<hostname>` stellt das Zertifikat aus
   (dauert wenige Sekunden)

## Internes Netz ohne Internet-Zugang

Let's Encrypt braucht eine aus dem Internet erreichbare HTTP-01-Challenge.
Falls der Server rein intern steht:

- In `infra/caddy/Caddyfile` die Zeile `local_certs` einkommentieren —
  Caddy stellt dann Zertifikate seiner eigenen lokalen CA aus
- Die Caddy-Root-CA (`/data/caddy/pki/authorities/local/root.crt` im
  Volume `caddy_data`) auf den Client-PCs als vertrauenswürdig installieren
  (per Gruppenrichtlinie verteilbar)

## Hinweise

- HTTP (Port 80) leitet automatisch auf HTTPS um
- Zertifikats-Erneuerung erfolgt automatisch (Caddy, ~30 Tage vor Ablauf)
- Hostname-Änderungen erscheinen im Audit-Protokoll (`settings.hostname`)
- Die internen Ports (8000, 3000, 8080 …) sollten in der Firewall nur
  noch lokal erreichbar sein, sobald Caddy läuft
