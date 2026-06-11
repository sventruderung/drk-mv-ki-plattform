"""Nutzerverwaltung über die Keycloak-Admin-API — nur kv-admin (§4.1).

Alle Aktionen werden auditiert. Vergeben werden können ausschließlich die
fachlichen Rollen (ALLOWED_ROLES) — keine Keycloak-internen Rollen.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from drk_shared.logging import get_logger

from ....db import tenant_connection
from ....keycloak_admin import ALLOWED_ROLES, KeycloakAdmin, KeycloakAdminError

logger = get_logger(__name__)
router = APIRouter(prefix="/users", tags=["users"])

_admin: KeycloakAdmin | None = None


def get_admin(request: Request) -> KeycloakAdmin:
    global _admin
    if _admin is None:
        _admin = KeycloakAdmin(request.app.state.settings)
    return _admin


def require_kv_admin(request: Request) -> None:
    if "kv-admin" not in request.state.roles:
        raise HTTPException(status_code=403, detail="Rolle 'kv-admin' erforderlich.")


async def audit(request: Request, action: str, object_id: str, info: str) -> None:
    async with tenant_connection(request.state.tenant_id) as conn:
        await conn.execute(
            """
            INSERT INTO audit_log (tenant_id, actor, action, object_type, object_id, info)
            VALUES ($1, $2, $3, 'user', $4, $5)
            """,
            request.state.tenant_id, request.state.user_id or "", action, object_id, info,
        )


class CreateUserRequest(BaseModel):
    username: str = Field(min_length=2, max_length=64)
    email: str = ""
    first_name: str = ""
    last_name: str = ""
    password: str = Field(min_length=10)
    roles: list[str] = ["kv-alle"]


class RolesRequest(BaseModel):
    roles: list[str]


class EnabledRequest(BaseModel):
    enabled: bool


class PasswordRequest(BaseModel):
    password: str = Field(min_length=10)


@router.get("/roles")
async def list_assignable_roles(request: Request):
    require_kv_admin(request)
    return ALLOWED_ROLES


@router.get("/")
async def list_users(request: Request):
    require_kv_admin(request)
    try:
        return await get_admin(request).list_users()
    except KeycloakAdminError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


@router.post("/")
async def create_user(body: CreateUserRequest, request: Request):
    require_kv_admin(request)
    invalid = [r for r in body.roles if r not in ALLOWED_ROLES]
    if invalid:
        raise HTTPException(status_code=422, detail=f"Unzulässige Rollen: {invalid}")
    try:
        user_id = await get_admin(request).create_user(
            body.username, body.email, body.first_name, body.last_name,
            body.password, body.roles,
        )
    except KeycloakAdminError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    await audit(request, "user.create", user_id,
                f"{body.username} | Rollen: {', '.join(body.roles)}")
    return {"id": user_id, "username": body.username}


@router.put("/{user_id}/roles")
async def set_roles(user_id: str, body: RolesRequest, request: Request):
    require_kv_admin(request)
    invalid = [r for r in body.roles if r not in ALLOWED_ROLES]
    if invalid:
        raise HTTPException(status_code=422, detail=f"Unzulässige Rollen: {invalid}")
    try:
        await get_admin(request).set_user_roles(user_id, body.roles)
    except KeycloakAdminError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    await audit(request, "user.roles", user_id, f"Rollen: {', '.join(sorted(body.roles))}")
    return {"id": user_id, "roles": sorted(set(body.roles) & set(ALLOWED_ROLES))}


FEDERATED_MSG = (
    "Dieses Konto wird über LDAP/Active Directory verwaltet. "
    "{was} bitte im Verzeichnisdienst durchführen — die Rollenvergabe "
    "bleibt hier möglich."
)


@router.patch("/{user_id}")
async def set_enabled(user_id: str, body: EnabledRequest, request: Request):
    require_kv_admin(request)
    if user_id == request.state.user_id:
        raise HTTPException(status_code=409, detail="Das eigene Konto kann nicht deaktiviert werden.")
    try:
        if await get_admin(request).is_federated(user_id):
            raise HTTPException(
                status_code=409,
                detail=FEDERATED_MSG.format(was="Aktivierung/Deaktivierung"),
            )
        await get_admin(request).set_enabled(user_id, body.enabled)
    except KeycloakAdminError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    await audit(request, "user.enabled" if body.enabled else "user.disabled", user_id, "")
    return {"id": user_id, "enabled": body.enabled}


@router.post("/{user_id}/reset-password")
async def reset_password(user_id: str, body: PasswordRequest, request: Request):
    require_kv_admin(request)
    try:
        if await get_admin(request).is_federated(user_id):
            raise HTTPException(
                status_code=409,
                detail=FEDERATED_MSG.format(was="Passwort-Änderungen"),
            )
        await get_admin(request).reset_password(user_id, body.password)
    except KeycloakAdminError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    await audit(request, "user.password-reset", user_id,
                "Temporäres Passwort gesetzt (Änderung beim nächsten Login)")
    return {"id": user_id}
