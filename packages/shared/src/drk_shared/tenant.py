from contextvars import ContextVar
from dataclasses import dataclass

_tenant_id_var: ContextVar[str | None] = ContextVar("tenant_id", default=None)
_roles_var: ContextVar[list[str] | None] = ContextVar("roles", default=None)


@dataclass(frozen=True)
class TenantContext:
    tenant_id: str
    user_id: str
    roles: list[str]


def get_tenant_id() -> str:
    # TENANT-ISOLATION: tenant_id kommt ausschließlich aus JWT-Claims, nie aus Request-Body
    tenant_id = _tenant_id_var.get()
    if tenant_id is None:
        raise RuntimeError("TenantContext nicht gesetzt — JWT-Middleware nicht aktiv?")
    return tenant_id


def set_tenant_id(tenant_id: str) -> None:
    _tenant_id_var.set(tenant_id)


def get_roles() -> list[str]:
    # ACL: Rollen kommen ausschließlich aus JWT-Claims (realm_access.roles)
    roles = _roles_var.get()
    if roles is None:
        raise RuntimeError("Rollen nicht gesetzt — JWT-Middleware nicht aktiv?")
    return roles


def set_roles(roles: list[str]) -> None:
    _roles_var.set(roles)
