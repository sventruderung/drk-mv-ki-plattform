"""Keycloak-Admin-API-Client (Service-Account des Clients drk-platform).

Voraussetzung (einmalig, Keycloak Admin UI): Service Accounts für den Client
aktivieren und dem Service-Account die Rollen 'view-users' und 'manage-users'
(Client realm-management) zuweisen — steht in der Pilot-Checkliste B.
"""

import time

import httpx

# Nur diese Rollen dürfen über das Admin-UI vergeben werden — niemals
# Keycloak-interne Rollen oder realm-management.
ALLOWED_ROLES = [
    "kv-admin",
    "kv-vorstand",
    "kv-pflege",
    "kv-rettungsdienst",
    "kv-alle",
    "content-editor",
    "content-approver",
]


class KeycloakAdminError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


class KeycloakAdmin:
    def __init__(self, settings):
        self._base = settings.keycloak_url.rstrip("/")
        self._realm = settings.keycloak_realm
        self._client_id = settings.keycloak_client_id
        self._client_secret = settings.keycloak_client_secret
        self._token: str | None = None
        self._token_expires: float = 0.0
        self._role_ids: dict[str, str] | None = None
        self._realm_uuid: str | None = None

    async def _realm_id(self) -> str:
        """Interne Realm-ID (UUID). Komponenten (z.B. LDAP-Federation) müssen als
        parentId diese ID tragen — NICHT den Realm-Namen, sonst erkennt Keycloak
        den Provider nicht (unsichtbar im UI, Sync schlägt fehl)."""
        if self._realm_uuid is None:
            resp = await self._request("GET", "")
            resp.raise_for_status()
            self._realm_uuid = resp.json()["id"]
        return self._realm_uuid

    async def _get_token(self) -> str:
        if self._token and time.monotonic() < self._token_expires - 10:
            return self._token
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{self._base}/realms/{self._realm}/protocol/openid-connect/token",
                data={
                    "grant_type": "client_credentials",
                    "client_id": self._client_id,
                    "client_secret": self._client_secret,
                },
            )
        if resp.status_code != 200:
            raise KeycloakAdminError(
                502,
                "Keycloak-Service-Account nicht nutzbar — sind Service Accounts "
                "für den Client aktiviert und die manage-users-Rolle zugewiesen?",
            )
        data = resp.json()
        self._token = data["access_token"]
        self._token_expires = time.monotonic() + data.get("expires_in", 60)
        return self._token

    async def _request(self, method: str, path: str, **kwargs) -> httpx.Response:
        token = await self._get_token()
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.request(
                method,
                f"{self._base}/admin/realms/{self._realm}{path}",
                headers={"Authorization": f"Bearer {token}"},
                **kwargs,
            )
        if resp.status_code == 403:
            raise KeycloakAdminError(
                502,
                "Keycloak verweigert den Zugriff — dem Service-Account fehlt "
                "die Rolle 'manage-users' (realm-management).",
            )
        return resp

    async def _role_map(self) -> dict[str, str]:
        if self._role_ids is None:
            resp = await self._request("GET", "/roles")
            resp.raise_for_status()
            self._role_ids = {
                r["name"]: r["id"] for r in resp.json() if r["name"] in ALLOWED_ROLES
            }
        return self._role_ids

    async def list_users(self, max_users: int = 200) -> list[dict]:
        resp = await self._request("GET", f"/users?max={max_users}")
        resp.raise_for_status()
        users = []
        for u in resp.json():
            roles = await self.get_user_roles(u["id"])
            users.append({
                "id": u["id"],
                "username": u.get("username", ""),
                "email": u.get("email", ""),
                "firstName": u.get("firstName", ""),
                "lastName": u.get("lastName", ""),
                "enabled": u.get("enabled", False),
                "roles": roles,
                # LDAP/AD-Föderation: Konto + Passwort werden im Verzeichnis-
                # dienst verwaltet — hier nur Rollen steuerbar
                "federated": bool(u.get("federationLink")),
            })
        return users

    async def is_federated(self, user_id: str) -> bool:
        resp = await self._request("GET", f"/users/{user_id}")
        resp.raise_for_status()
        return bool(resp.json().get("federationLink"))

    async def get_user_roles(self, user_id: str) -> list[str]:
        resp = await self._request("GET", f"/users/{user_id}/role-mappings/realm")
        resp.raise_for_status()
        return sorted(r["name"] for r in resp.json() if r["name"] in ALLOWED_ROLES)

    async def create_user(
        self, username: str, email: str, first_name: str, last_name: str,
        password: str, roles: list[str],
    ) -> str:
        resp = await self._request(
            "POST", "/users",
            json={
                "username": username,
                "email": email,
                "firstName": first_name,
                "lastName": last_name,
                "enabled": True,
                "credentials": [
                    {"type": "password", "value": password, "temporary": True}
                ],
                "requiredActions": ["UPDATE_PASSWORD"],
            },
        )
        if resp.status_code == 409:
            raise KeycloakAdminError(409, f"Nutzer '{username}' existiert bereits.")
        resp.raise_for_status()
        user_id = resp.headers["Location"].rsplit("/", 1)[-1]
        await self.set_user_roles(user_id, roles)
        return user_id

    async def set_user_roles(self, user_id: str, target_roles: list[str]) -> None:
        target = {r for r in target_roles if r in ALLOWED_ROLES}
        current = set(await self.get_user_roles(user_id))
        role_map = await self._role_map()
        to_add = [{"id": role_map[r], "name": r} for r in target - current if r in role_map]
        to_remove = [{"id": role_map[r], "name": r} for r in current - target if r in role_map]
        if to_add:
            (await self._request(
                "POST", f"/users/{user_id}/role-mappings/realm", json=to_add
            )).raise_for_status()
        if to_remove:
            (await self._request(
                "DELETE", f"/users/{user_id}/role-mappings/realm", json=to_remove
            )).raise_for_status()

    async def add_https_redirects(self, hostname: str) -> dict[str, list[str]]:
        """Ergänzt die HTTPS-Redirect-URIs + Web-Origins beider Clients.

        Idempotent: bestehende URIs (z.B. interne IP) bleiben erhalten, damit der
        Zugriff in beiden Netzen weiter funktioniert. Spiegelt scripts/set_host.py
        --https, ohne Secret/Mapper anzufassen. Voraussetzung: der Service-Account
        besitzt zusätzlich die Rolle 'manage-clients' (realm-management).

        Returns:
            Pro Client die neue, vollständige Redirect-URI-Liste.
        """
        targets = {
            "drk-platform": [f"https://{hostname}/*"],
            "drk-admin-ui": [f"https://{hostname}/admin/*"],
        }
        web_origin = f"https://{hostname}"
        result: dict[str, list[str]] = {}
        for client_id, uris in targets.items():
            resp = await self._request("GET", f"/clients?clientId={client_id}")
            resp.raise_for_status()
            arr = resp.json()
            if not arr:
                raise KeycloakAdminError(404, f"Keycloak-Client '{client_id}' nicht gefunden.")
            cl = arr[0]
            merged = sorted(set(cl.get("redirectUris", [])) | set(uris))
            origins = sorted(set(cl.get("webOrigins", [])) | {web_origin})
            # Volle Repräsentation zurückschreiben, aber Secret + Mapper auslassen
            payload = {k: v for k, v in cl.items() if k not in ("secret", "protocolMappers")}
            payload["redirectUris"] = merged
            payload["webOrigins"] = origins
            (await self._request("PUT", f"/clients/{cl['id']}", json=payload)).raise_for_status()
            result[client_id] = merged
        return result

    async def set_enabled(self, user_id: str, enabled: bool) -> None:
        (await self._request(
            "PUT", f"/users/{user_id}", json={"enabled": enabled}
        )).raise_for_status()

    async def reset_password(self, user_id: str, password: str) -> None:
        (await self._request(
            "PUT", f"/users/{user_id}/reset-password",
            json={"type": "password", "value": password, "temporary": True},
        )).raise_for_status()

    # ── Windows-Domäne / Active Directory (LDAP-User-Federation) ──────────────
    #
    # Keycloak verwaltet die AD-Anbindung als "Component" (UserStorageProvider).
    # Voraussetzung: der Service-Account hat zusätzlich die Rolle 'manage-realm'
    # (realm-management). editMode=READ_ONLY → Konten/Passwörter bleiben im AD,
    # die Plattform vergibt nur Rollen (passt zur federated-Behandlung in users.py).

    LDAP_NAME = "ad-federation"
    LDAP_TYPE = "org.keycloak.storage.UserStorageProvider"

    async def _raw_ldap_component(self) -> dict | None:
        resp = await self._request(
            "GET", f"/components?type={self.LDAP_TYPE}&parent={await self._realm_id()}"
        )
        resp.raise_for_status()
        for c in resp.json():
            if c.get("providerId") == "ldap" and c.get("name") == self.LDAP_NAME:
                return c
        return None

    async def get_ldap_federation(self) -> dict | None:
        """Aktuelle AD-Konfiguration (ohne Passwort) oder None."""
        comp = await self._raw_ldap_component()
        if not comp:
            return None
        cfg = comp.get("config", {})

        def first(key: str, default: str = "") -> str:
            v = cfg.get(key)
            return v[0] if v else default

        return {
            "id": comp["id"],
            "enabled": first("enabled", "true") == "true",
            "connectionUrl": first("connectionUrl"),
            "bindDn": first("bindDn"),
            "usersDn": first("usersDn"),
            "usernameLDAPAttribute": first("usernameLDAPAttribute", "sAMAccountName"),
            "userObjectClasses": first("userObjectClasses"),
            "customUserSearchFilter": first("customUserSearchFilter"),
            # Keycloak maskiert das Passwort beim Lesen — wir geben es nie zurück,
            # melden nur, OB eines hinterlegt ist.
            "bindCredentialSet": bool(cfg.get("bindCredential")),
        }

    async def save_ldap_federation(
        self, *, enabled: bool, connection_url: str, bind_dn: str,
        bind_credential: str | None, users_dn: str, username_attr: str,
        user_object_classes: str, user_search_filter: str,
    ) -> str:
        """AD-Federation anlegen oder aktualisieren. Gibt die Component-ID zurück.

        bind_credential=None bei Updates lässt das hinterlegte Passwort unangetastet.
        """
        existing = await self._raw_ldap_component()
        base_cfg: dict[str, list[str]] = dict(existing.get("config", {})) if existing else {}
        # Keycloak liefert das Bind-Passwort beim Lesen maskiert ("**********").
        # Diesen maskierten Wert NIE blind zurückschreiben — sonst wird das echte
        # Passwort durch die Maske ersetzt. Wir setzen bindCredential unten gezielt.
        base_cfg.pop("bindCredential", None)

        base_cfg.update({
            "enabled": ["true" if enabled else "false"],
            "vendor": ["ad"],
            "connectionUrl": [connection_url],
            "bindDn": [bind_dn],
            "usersDn": [users_dn],
            "usernameLDAPAttribute": [username_attr or "sAMAccountName"],
            "rdnLDAPAttribute": ["cn"],
            "uuidLDAPAttribute": ["objectGUID"],
            "userObjectClasses": [
                user_object_classes or "person, organizationalPerson, user"
            ],
            "editMode": ["READ_ONLY"],
            "importEnabled": ["true"],
            "syncRegistrations": ["false"],
            "searchScope": ["2"],
            "trustEmail": ["true"],
            "pagination": ["true"],
        })
        if user_search_filter:
            base_cfg["customUserSearchFilter"] = [user_search_filter]
        else:
            base_cfg.pop("customUserSearchFilter", None)
        # Neues Passwort gesetzt -> übernehmen. Kein neues Passwort bei bestehender
        # Anbindung -> Keycloaks Maske zurücksenden; Keycloak erkennt sie und lässt
        # das gespeicherte Passwort unverändert (so wird es nie versehentlich gelöscht).
        if bind_credential:
            base_cfg["bindCredential"] = [bind_credential]
        elif existing:
            base_cfg["bindCredential"] = ["**********"]

        body = {
            "name": self.LDAP_NAME,
            "providerId": "ldap",
            "providerType": self.LDAP_TYPE,
            "parentId": await self._realm_id(),
            "config": base_cfg,
        }
        if existing:
            body["id"] = existing["id"]
            (await self._request(
                "PUT", f"/components/{existing['id']}", json=body
            )).raise_for_status()
            return existing["id"]
        resp = await self._request("POST", "/components", json=body)
        if resp.status_code not in (201, 204):
            resp.raise_for_status()
        return resp.headers["Location"].rsplit("/", 1)[-1]

    async def delete_ldap_federation(self) -> bool:
        comp = await self._raw_ldap_component()
        if not comp:
            return False
        (await self._request("DELETE", f"/components/{comp['id']}")).raise_for_status()
        return True

    async def test_ldap_connection(
        self, *, connection_url: str, bind_dn: str, bind_credential: str | None,
        authenticate: bool,
    ) -> None:
        """Ruft Keycloaks testLDAPConnection auf. Wirft KeycloakAdminError bei Fehler.

        authenticate=False prüft nur die Erreichbarkeit, True zusätzlich den Bind.
        Ohne neues Passwort wird gegen das hinterlegte getestet (Keycloak-Maske).
        """
        action = "testAuthentication" if authenticate else "testConnection"
        payload = {
            "action": action,
            "connectionUrl": connection_url,
            "bindDn": bind_dn,
            "bindCredential": bind_credential or "**********",
            "useTruststoreSpi": "ldapsOnly",
            "connectionTimeout": "10000",
            "startTls": "false",
            "authType": "simple" if bind_dn else "none",
        }
        resp = await self._request(
            "POST", "/testLDAPConnection", json=payload
        )
        if resp.status_code not in (200, 204):
            detail = "LDAP-Test fehlgeschlagen — Adresse, Bind-DN oder Passwort prüfen."
            try:
                body = resp.json()
                detail = body.get("errorMessage") or body.get("error") or detail
            except Exception:
                pass
            raise KeycloakAdminError(resp.status_code, detail)

    async def sync_ldap_federation(self) -> dict:
        """Vollsynchronisation der AD-Nutzer anstoßen. Gibt Keycloaks Ergebnis zurück."""
        comp = await self._raw_ldap_component()
        if not comp:
            raise KeycloakAdminError(404, "Keine AD-Anbindung konfiguriert.")
        resp = await self._request(
            "POST",
            f"/user-storage/{comp['id']}/sync?action=triggerFullSync",
        )
        if resp.status_code >= 400:
            # Echte Keycloak-Meldung durchreichen statt sie hinter dem
            # Exception-Typ zu verstecken.
            detail = f"Keycloak meldete HTTP {resp.status_code}"
            try:
                body = resp.json()
                kc_msg = (body.get("errorMessage") or body.get("error_description")
                          or body.get("error"))
            except Exception:
                kc_msg = (resp.text or "").strip()[:300]
            if kc_msg:
                detail += f": {kc_msg}"
            raise KeycloakAdminError(resp.status_code, detail)
        return resp.json() if resp.content else {"status": "gestartet"}
