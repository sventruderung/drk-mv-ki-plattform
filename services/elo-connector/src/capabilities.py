"""Die drei Capabilities, gemappt auf den ELO REST Service.

Jede Funktion liefert ein normalisiertes `data`-Objekt mit Pflicht-`sources`.
Die Zusammenfassung erzeugt das Modell im LLM-Service; der Connector liefert
nur den extrahierten Text als Datenbasis.
"""

from datetime import datetime, timezone
from typing import Any

from .elo_client import EloClient
from .schemas import SearchParams, StatsParams, SummarizeParams


def _ref(repo_hint: str, file_id: Any) -> str:
    return f"elo://{repo_hint}/files/{file_id}"


def _date(item: dict[str, Any]) -> str | None:
    raw = item.get("dateArchived") or item.get("dateModified")
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).date().isoformat()
    except ValueError:
        return None


async def dokument_suchen(
    client: EloClient, params: SearchParams, repo_hint: str
) -> dict[str, Any]:
    """`dokument.suchen` -> GET /api/search."""
    items = await client.search(params.query, params.where, params.limit)
    results, sources = [], []
    for it in items:
        fid, name = it.get("id"), it.get("name", "")
        results.append({"id": fid, "name": name, "is_dir": it.get("isDir"), "datum": _date(it)})
        sources.append({"title": name, "ref": _ref(repo_hint, fid)})
    return {"result": results, "sources": sources}


async def dokument_zusammenfassen(
    client: EloClient, params: SummarizeParams, repo_hint: str
) -> dict[str, Any]:
    """`dokument.zusammenfassen` -> /api/files/{id}/info + /download."""
    info = await client.file_info(params.dokument_id)
    name = info.get("name", "")
    raw = await client.download(params.dokument_id)
    text = _extract_text(raw)[: params.max_chars]
    return {
        "result": {"id": params.dokument_id, "name": name, "text": text},
        "sources": [{"title": name, "ref": _ref(repo_hint, params.dokument_id)}],
    }


async def statistik_dokumente_zaehlen(
    client: EloClient, params: StatsParams, repo_hint: str
) -> dict[str, Any]:
    """`statistik.dokumente_zaehlen` -> POST /api/search/keywording + Zählung."""
    items = await client.search_keywording(params.felder)
    docs = [it for it in items if not it.get("isDir", False)]
    result: dict[str, Any] = {"gesamt": len(docs)}
    if params.aelter_als_tage is not None:
        today = datetime.now(timezone.utc).date()
        aelter = 0
        for it in docs:
            d = _date(it)
            if d and (today - datetime.fromisoformat(d).date()).days > params.aelter_als_tage:
                aelter += 1
        result[f"aelter_als_{params.aelter_als_tage}_tage"] = aelter
    label = "Keywording-Suche: " + ", ".join(f"{k}={v}" for k, v in params.felder.items())
    return {"result": result, "sources": [{"title": label, "ref": f"elo://{repo_hint}/search"}]}


def _extract_text(raw: bytes) -> str:
    """Text aus heruntergeladenem Inhalt gewinnen. PDF -> pypdf, sonst Best-effort."""
    if raw[:5] == b"%PDF-":
        try:
            import io

            from pypdf import PdfReader

            reader = PdfReader(io.BytesIO(raw))
            return "\n".join((page.extract_text() or "") for page in reader.pages)
        except Exception:
            return ""
    return raw.decode("utf-8", errors="replace")
