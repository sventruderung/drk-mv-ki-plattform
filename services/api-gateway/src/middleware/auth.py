from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from jose import jwt, JWTError
import httpx

from drk_shared.tenant import set_roles, set_tenant_id
from drk_shared.logging import get_logger

logger = get_logger(__name__)

SKIP_PATHS = {"/api/v1/health", "/api/v1/tls/check"}
# Statisches Admin-UI: HTML/JS ohne Token ausliefern — alle API-Aufrufe
# aus dem UI heraus laufen weiterhin durch die JWT-Prüfung.
SKIP_PREFIXES = ("/admin",)


class JWTMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, settings) -> None:
        super().__init__(app)
        self.settings = settings
        self._jwks: dict | None = None

    async def dispatch(self, request: Request, call_next):
        if request.url.path in SKIP_PATHS or request.url.path.startswith(SKIP_PREFIXES):
            return await call_next(request)

        token = self._extract_token(request)
        if not token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token fehlt")

        try:
            claims = await self._verify_token(token)
        except JWTError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token ungültig")

        # TENANT-ISOLATION: tenant_id kommt ausschließlich aus JWT-Claims
        tenant_id = claims.get("tenant_id") or claims.get("azp")
        if not tenant_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Kein Tenant im Token")

        # ACL (§4.2): Rollen aus realm_access.roles — Basis für die rechtegeprüfte RAG-Suche
        roles = claims.get("realm_access", {}).get("roles", [])

        set_tenant_id(tenant_id)
        set_roles(roles)
        request.state.tenant_id = tenant_id
        request.state.user_id = claims.get("sub")
        request.state.roles = roles

        return await call_next(request)

    def _extract_token(self, request: Request) -> str | None:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            return auth[7:]
        return None

    async def _verify_token(self, token: str) -> dict:
        jwks = await self._get_jwks()
        return jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            audience=self.settings.keycloak_client_id,
        )

    async def _get_jwks(self) -> dict:
        if self._jwks is None:
            url = f"{self.settings.keycloak_url}/realms/{self.settings.keycloak_realm}/protocol/openid-connect/certs"
            async with httpx.AsyncClient() as client:
                resp = await client.get(url)
                resp.raise_for_status()
                self._jwks = resp.json()
        return self._jwks
