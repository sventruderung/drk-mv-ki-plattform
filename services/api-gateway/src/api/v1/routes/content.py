"""Proxy zum content-service (P02): generischer Forward mit Identitäts-Headern."""

from fastapi import APIRouter, Request, Response
import httpx

router = APIRouter(prefix="/content", tags=["content"])


@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_content(path: str, request: Request) -> Response:
    url = f"{request.app.state.settings.content_service_url}/api/v1/drafts/{path}"
    headers = {
        "X-Tenant-ID": request.state.tenant_id,
        "X-User-ID": request.state.user_id or "",
        "X-User-Roles": ",".join(request.state.roles),
        "Content-Type": request.headers.get("content-type", "application/json"),
    }
    body = await request.body()
    async with httpx.AsyncClient(timeout=300) as client:
        resp = await client.request(
            request.method, url,
            content=body or None,
            params=dict(request.query_params),
            headers=headers,
        )
    return Response(
        content=resp.content,
        status_code=resp.status_code,
        media_type=resp.headers.get("content-type"),
    )
