"""Client für den ELO REST Service (read-only).

Ressourcen unter <base>/api/... . Auth per HTTP Basic. Welches Konto verwendet
wird (REST-API oder Tomcat), entscheidet config.get_elo_connection().

COMPLIANCE: Credentials nur im Speicher, nie geloggt. Nur lesende Aufrufe.
"""

from typing import Any

import httpx


class EloError(RuntimeError):
    """Fehler beim Zugriff auf den ELO REST Service."""


class EloClient:
    """Dünner Client für den ELO REST Service mit Basic-Auth."""

    def __init__(self, base_url: str, user: str, password: str, timeout_s: float) -> None:
        self._http = httpx.AsyncClient(
            base_url=base_url.rstrip("/"),
            auth=httpx.BasicAuth(user, password),
            timeout=timeout_s,
            headers={"Accept": "application/json"},
        )

    async def __aenter__(self) -> "EloClient":
        return self

    async def __aexit__(self, *_exc: object) -> None:
        await self._http.aclose()

    async def _get_json(self, path: str, params: dict[str, Any] | None = None) -> Any:
        try:
            resp = await self._http.get(path, params=params)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as exc:
            raise EloError(str(exc)) from exc

    async def search(self, words: str, where: str | None, limit: int) -> list[dict[str, Any]]:
        """GET /api/search — Volltext/Anywhere-Suche."""
        params: dict[str, Any] = {"words": words}
        if where:
            params["where"] = where
        result = await self._get_json("/api/search", params)
        items = result if isinstance(result, list) else result.get("items", [])
        return items[:limit]

    async def search_keywording(self, fields: dict[str, str]) -> list[dict[str, Any]]:
        """POST /api/search/keywording — Suche über Indexfelder (Metadaten)."""
        try:
            resp = await self._http.post("/api/search/keywording", json=fields)
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPError as exc:
            raise EloError(str(exc)) from exc
        return data if isinstance(data, list) else data.get("items", [])

    async def masks(self) -> Any:
        """GET /api/system/masks/_all — Masken + Indexfelder der Instanz (Diagnose)."""
        return await self._get_json("/api/system/masks/_all")

    async def file_info(self, file_id: int | str) -> dict[str, Any]:
        """GET /api/files/{id}/info — Basis-Infos eines Eintrags."""
        return await self._get_json(f"/api/files/{file_id}/info")

    async def download(self, file_id: int | str) -> bytes:
        """GET /api/files/{id}/download — Dokumentinhalt herunterladen."""
        try:
            resp = await self._http.get(f"/api/files/{file_id}/download")
            resp.raise_for_status()
            return resp.content
        except httpx.HTTPError as exc:
            raise EloError(str(exc)) from exc
