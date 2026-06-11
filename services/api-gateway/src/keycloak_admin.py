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

    async def set_enabled(self, user_id: str, enabled: bool) -> None:
        (await self._request(
            "PUT", f"/users/{user_id}", json={"enabled": enabled}
        )).raise_for_status()

    async def reset_password(self, user_id: str, password: str) -> None:
        (await self._request(
            "PUT", f"/users/{user_id}/reset-password",
            json={"type": "password", "value": password, "temporary": True},
        )).raise_for_status()
