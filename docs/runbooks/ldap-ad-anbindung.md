# Runbook: LDAP/Active-Directory-Anbindung (optional)

Die Nutzerverwaltung funktioniert in beiden Betriebsarten — ohne Umbau:

| | Ohne AD (lokal) | Mit AD-Anbindung |
|---|---|---|
| Konto anlegen | Verwaltungs-UI (Tab 👥 Nutzer) | Im AD; erscheint nach erstem Login bzw. Sync automatisch |
| Passwort | Verwaltungs-UI (temporär, Pflichtänderung) | Im AD (Windows-Passwort) |
| Aktivieren/Deaktivieren | Verwaltungs-UI | Im AD |
| **Rollenvergabe (ACL!)** | **Verwaltungs-UI** | **Verwaltungs-UI** |
| Audit | vollständig | vollständig (Rollenänderungen) |

Das Verwaltungs-UI erkennt AD-Konten automatisch (Spalte „Quelle"):
bei AD-Konten werden Passwort- und Deaktivieren-Aktionen ausgeblendet und
serverseitig blockiert — mit klarem Hinweis. **Mischbetrieb ist möglich**
(z.B. lokale Konten für Ehrenamtliche ohne AD-Account).

## Einrichtung der AD-Föderation (Keycloak Admin UI)

1. Realm `drk-kv` → **User Federation → Add provider → ldap**
2. Verbindung:
   - Vendor: `Active Directory`
   - Connection URL: `ldaps://dc01.kv-name.drk.local:636` (LDAPS empfohlen)
   - Bind DN: Service-Konto mit Lesezugriff (z.B. `CN=svc-keycloak,OU=Service,...`)
   - Users DN: OU mit den Mitarbeitenden (z.B. `OU=Benutzer,DC=kv-name,...`)
3. Edit Mode: `READ_ONLY` (empfohlen — Passwörter und Konten bleiben im AD)
4. Sync Settings: Periodic Full Sync aktivieren (z.B. täglich)
5. Test: AD-Nutzer meldet sich in Open WebUI über „DRK Login" mit
   Windows-Zugangsdaten an → erscheint im Verwaltungs-UI mit Quelle „AD"
6. Rollen im Verwaltungs-UI zuweisen (mindestens `kv-alle`)

## Optional: Rollen aus AD-Gruppen ableiten

Statt manueller Rollenvergabe können AD-Gruppen automatisch auf Realm-Rollen
gemappt werden: User Federation → LDAP-Provider → **Mappers → Add →
role-ldap-mapper** (z.B. AD-Gruppe `DRK-Pflege` → Rolle `kv-pflege`).
Dann gilt: Gruppenpflege im AD ersetzt die Rollenvergabe im UI.
Empfehlung für den Piloten: erst manuell im UI starten, Gruppen-Mapping
im zweiten Schritt einführen.

## Hinweise

- `directAccessGrantsEnabled` (Login per Benutzername/Passwort über die API,
  z.B. upload_docs.py) funktioniert auch mit AD-Konten — Keycloak prüft
  das Passwort gegen das AD
- Bei `READ_ONLY` schlägt jede Schreiboperation Richtung AD fehl — das
  Verwaltungs-UI fängt das ab, bevor es passiert
- AD-Ausfall: lokale Konten (z.B. der Mandanten-Admin) funktionieren weiter —
  mindestens ein lokales kv-admin-Konto behalten (Break-Glass)
