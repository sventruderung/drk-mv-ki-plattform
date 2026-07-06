# Keycloak-Truststore (LDAPS zum Domänencontroller)

Ab **Windows Server 2019** erzwingt Active Directory standardmäßig LDAP-Signing.
Unsignierte, einfache Binds über **LDAP:389** werden dann abgelehnt:

    LDAP: error code 8 — The server requires binds to turn on integrity checking
    if SSL/TLS are not already active on the connection

Lösung: Keycloak spricht per **LDAPS (Port 636)** mit dem DC. Dazu muss Keycloak
dem LDAPS-Zertifikat des DC (bzw. dessen ausstellender CA) vertrauen.

## Zertifikat hinterlegen

Auf dem Server, im Repo-Root:

```bash
# LDAPS-Zertifikat des DC holen (IP/Port anpassen)
openssl s_client -connect 192.168.168.101:636 -showcerts </dev/null 2>/dev/null \
  | openssl x509 -out infra/keycloak/truststore/dc-ldaps.crt

# Keycloak mit dem Truststore neu starten
docker compose up -d --force-recreate keycloak
```

Danach in der Federation (Verwaltungs-UI → Einstellungen → AD **oder**
Keycloak-Konsole → User Federation → ad-federation) die **Connection URL** auf
`ldaps://192.168.168.101:636` stellen und speichern.

Liegt eine unternehmenseigene CA (AD Certificate Services) zugrunde, besser das
**CA-Zertifikat** statt des Server-Zertifikats hier ablegen (überlebt eine
Zertifikatserneuerung am DC). Mehrere `.crt`/`.pem`-Dateien sind erlaubt.

*.crt/*.pem in diesem Verzeichnis werden nicht committet (siehe .gitignore) —
sie sind installationsspezifisch.
