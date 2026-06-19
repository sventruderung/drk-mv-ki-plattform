"""Anbindung einer Windows-Domäne (Active Directory) über Keycloak-LDAP-Federation.

Nur kv-admin (§4.1). Alle ändernden Aktionen werden auditiert. Die Konfiguration
inkl. Bind-Passwort liegt in Keycloak (verschlüsselt), nicht in der Plattform-DB —
das Passwort wird nie zurückgegeben. editMode ist READ_ONLY: Konten und Passwörter
bleiben im AD, die Plattform vergibt ausschließlich Rollen (siehe users.py).

Voraussetzung: der Keycloak-Service-Account besitzt die Rolle 'manage-realm'
(realm-management) — sonst liefern die Endpunkte einen entsprechenden Hinweis.
"""

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from drk_shared.logging import get_logger

from ....db import tenant_connection
from ....keycloak_admin import KeycloakAdmin, KeycloakAdminError

logger = get_logger(__name__)
router = APIRouter(prefix="/settings/ldap", tags=["ldap"])


def require_kv_admin(request: Request) -> None:
    if "kv-admin" not in request.state.roles:
        raise HTTPException(status_code=403, detail="Rolle 'kv-admin' erforderlich.")


def admin(request: Request) -> KeycloakAdmin:
    return KeycloakAdmin(request.app.state.settings)


async def audit(request: Request, action: str, info: str) -> None:
    async with tenant_connection(request.state.tenant_id) as conn:
        await conn.execute(
            """
            INSERT INTO audit_log (tenant_id, actor, action, object_type, object_id, info)
            VALUES ($1, $2, $3, 'settings', 'ad_federation', $4)
            """,
            request.state.tenant_id, request.state.user_id or "", action, info,
        )


class LdapConfig(BaseModel):
    enabled: bool = True
    connection_url: str = Field(min_length=3)          # ldap://dc.domain.local:389
    bind_dn: str = Field(min_length=3)                 # CN=svc-keycloak,OU=...,DC=...
    bind_credential: str | None = None                 # None = unverändert lassen
    users_dn: str = Field(min_length=3)                # OU=Benutzer,DC=domain,DC=local
    username_attr: str = "sAMAccountName"
    user_object_classes: str = "person, organizationalPerson, user"
    user_search_filter: str = ""                       # optionaler LDAP-Filter


class LdapTestRequest(LdapConfig):
    authenticate: bool = True


@router.get("")
async def get_ldap(request: Request):
    require_kv_admin(request)
    try:
        cfg = await admin(request).get_ldap_federation()
    except KeycloakAdminError as e:
        raise HTTPException(status_code=e.status_code, detail=_perm_hint(e))
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Keycloak nicht erreichbar: {type(e).__name__}")
    return {"configured": cfg is not None, "config": cfg}


@router.put("")
async def save_ldap(body: LdapConfig, request: Request):
    require_kv_admin(request)
    try:
        comp_id = await admin(request).save_ldap_federation(
            enabled=body.enabled,
            connection_url=body.connection_url.strip(),
            bind_dn=body.bind_dn.strip(),
            bind_credential=body.bind_credential,
            users_dn=body.users_dn.strip(),
            username_attr=body.username_attr.strip(),
            user_object_classes=body.user_object_classes.strip(),
            user_search_filter=body.user_search_filter.strip(),
        )
    except KeycloakAdminError as e:
        raise HTTPException(status_code=e.status_code, detail=_perm_hint(e))
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Keycloak nicht erreichbar: {type(e).__name__}")
    await audit(request, "ldap.save",
                f"AD-Anbindung gespeichert: {body.connection_url} ({body.users_dn})")
    logger.info("ldap.saved", enabled=body.enabled)
    return {"id": comp_id, "saved": True}


@router.post("/test")
async def test_ldap(body: LdapTestRequest, request: Request):
    require_kv_admin(request)
    try:
        await admin(request).test_ldap_connection(
            connection_url=body.connection_url.strip(),
            bind_dn=body.bind_dn.strip(),
            bind_credential=body.bind_credential,
            authenticate=body.authenticate,
        )
    except KeycloakAdminError as e:
        raise HTTPException(status_code=e.status_code, detail=_perm_hint(e))
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Keycloak nicht erreichbar: {type(e).__name__}")
    return {"ok": True}


@router.post("/sync")
async def sync_ldap(request: Request):
    require_kv_admin(request)
    try:
        result = await admin(request).sync_ldap_federation()
    except KeycloakAdminError as e:
        raise HTTPException(status_code=e.status_code, detail=_perm_hint(e))
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Keycloak nicht erreichbar: {type(e).__name__}")
    added = result.get("added", 0)
    updated = result.get("updated", 0)
    await audit(request, "ldap.sync",
                f"AD-Synchronisation: {added} neu, {updated} aktualisiert")
    return {"ok": True, "added": added, "updated": updated, "result": result}


@router.delete("")
async def delete_ldap(request: Request):
    require_kv_admin(request)
    try:
        removed = await admin(request).delete_ldap_federation()
    except KeycloakAdminError as e:
        raise HTTPException(status_code=e.status_code, detail=_perm_hint(e))
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Keycloak nicht erreichbar: {type(e).__name__}")
    if removed:
        await audit(request, "ldap.delete", "AD-Anbindung entfernt")
    return {"removed": removed}


def _perm_hint(e: KeycloakAdminError) -> str:
    """403/manage-users-Standardmeldung um den AD-spezifischen Rechte-Hinweis ergänzen."""
    if e.status_code in (403, 502) and "manage" in (e.detail or "").lower():
        return (
            "Keycloak verweigert den Zugriff — dem Service-Account fehlt die Rolle "
            "'manage-realm' (realm-management), die für die AD-Anbindung nötig ist."
        )
    return e.detail
