from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from jose import jwt, JWTError
from jose.exceptions import ExpiredSignatureError
import httpx

from drk_shared.tenant import set_roles, set_tenant_id
from drk_shared.logging import get_logger

logger = get_logger(__name__)

SKIP_PATHS = {
    "/api/v1/health", "/api/v1/tls/check",
    "/api/v1/models/public", "/api/v1/kbs/public",
}
# Nur lesend ohne Token: <img>-Tags senden kein Bearer-Token; das Logo ist
# ohnehin öffentlich sichtbar (Login-Seite). Upload/Reset (POST) bleiben geschützt.
SKIP_GET_PATHS = {"/api/v1/branding/logo"}
# Statisches Admin-UI: HTML/JS ohne Token ausliefern — alle API-Aufrufe
# aus dem UI heraus laufen weiterhin durch die JWT-Prüfung.
SKIP_PREFIXES = ("/admin",)


class JWTMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, settings) -> None:
        super().__init__(app)
        self.settings = settings
        self._jwks: dict | None = None

    async def dispatch(self, request: Request, call_next):
        if (request.url.path in SKIP_PATHS
                or request.url.path.startswith(SKIP_PREFIXES)
                or (request.method == "GET" and request.url.path in SKIP_GET_PATHS)):
            return await call_next(request)

        # HTTPException in Middleware würde als 500 enden — daher JSONResponse
        def reject(code: int, detail: str) -> JSONResponse:
            # Nur Ablehnungsgrund + Pfad — niemals Token-Inhalte loggen
            logger.info("auth.reject", path=request.url.path, status=code, reason=detail)
            return JSONResponse(status_code=code, content={"detail": detail})

        token = self._extract_token(request)
        if not token:
            return reject(status.HTTP_401_UNAUTHORIZED, "Token fehlt")

        try:
            claims = await self._verify_token(token)
        except ExpiredSignatureError:
            return reject(status.HTTP_401_UNAUTHORIZED, "Sitzung abgelaufen — bitte neu anmelden")
        except JWTError:
            return reject(status.HTTP_401_UNAUTHORIZED, "Token ungültig")

        # TENANT-ISOLATION: tenant_id kommt ausschließlich aus JWT-Claims
        tenant_id = claims.get("tenant_id") or claims.get("azp")
        if not tenant_id or tenant_id == "kv-CHANGE_ME":
            return reject(status.HTTP_403_FORBIDDEN,
                          "Kein gültiger Tenant im Token — tenant_id-Mapper in Keycloak prüfen")

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
        # Ausnahme für Dokument-Öffnen-Links (ELO-PDF, RAG-Quelldokument): werden
        # per anklickbarem Browser-Link aufgerufen (kein Bearer möglich), tragen aber
        # das von Open WebUI gesetzte OIDC-Cookie. Nur diese rein LESENDEN Pfade;
        # state-ändernde Endpunkte bleiben Bearer-only (CSRF-sicher).
        p = request.url.path
        if request.method == "GET" and (
            p.startswith("/api/v1/elo/document/")
            or (p.startswith("/api/v1/documents/") and p.endswith("/content"))
        ):
            return request.cookies.get("oauth_id_token")
        return None

    async def _verify_token(self, token: str) -> dict:
        jwks = await self._get_jwks()
        return jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            audience=self.settings.keycloak_client_id,
            # ID-Tokens tragen at_hash; ohne zugehöriges Access-Token lehnt
            # jose sonst ab. Signatur + Audience + Ablauf werden geprüft.
            options={"verify_at_hash": False},
        )

    async def _get_jwks(self) -> dict:
        if self._jwks is None:
            url = f"{self.settings.keycloak_url}/realms/{self.settings.keycloak_realm}/protocol/openid-connect/certs"
            async with httpx.AsyncClient() as client:
                resp = await client.get(url)
                resp.raise_for_status()
                self._jwks = resp.json()
        return self._jwks
