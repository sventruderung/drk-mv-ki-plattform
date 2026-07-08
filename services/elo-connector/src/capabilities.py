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


def _fuzzy(value: str) -> str:
    """Text-/Namensfelder mit ELO-Wildcards versehen, damit unterschiedliche
    Schreibweisen matchen ('ST Computer' findet 'ST COMPUTER GmbH', 'ST-Computer').
    Reine Zahlen (Jahr, Rechnungsnr., Betrag) bleiben EXAKT. Bereits gesetzte
    Wildcards werden nicht angefasst.
    """
    v = (value or "").strip()
    if not v or "*" in v:
        return v
    # reine Zahl / Datum / Betrag -> exakt lassen
    if v.replace(".", "").replace(",", "").replace("-", "").isdigit():
        return v
    return "*" + v.replace(" ", "*") + "*"


def _date(item: dict[str, Any]) -> str | None:
    # dateCustom = ELO-Dokumentdatum (bei Rechnungen das Beleg-/Rechnungsdatum) —
    # aussagekräftiger als dateModified (oft Bulk-Reindex). Fallback: Ablagedatum.
    raw = item.get("dateCustom") or item.get("dateArchived") or item.get("dateModified")
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).date().isoformat()
    except ValueError:
        return None


def _iso_date(value: str | None):
    """ISO-Datumsstring (YYYY-MM-DD) -> date, sonst None (defensiv)."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value)[:10]).date()
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
    # Text-/Namensfelder unscharf machen (verschiedene Schreibweisen), Zahlen exakt.
    felder = {k: _fuzzy(v) for k, v in params.felder.items()}
    items = await client.search_keywording(felder)
    docs = [it for it in items if not it.get("isDir", False)]

    # Optionaler Zeitraumfilter (client-seitig, auf das Ablage-/Änderungsdatum).
    # Ergänzt die serverseitige Feldsuche — die Keywording-Suche kann keine
    # Datumsbereiche (nur exakte Feldwerte / das Jahresfeld INVOICE_FIN_YEAR).
    von, bis = _iso_date(params.datum_von), _iso_date(params.datum_bis)
    if von or bis:
        im_bereich = []
        for it in docs:
            d = _date(it)
            if not d:
                continue
            dd = datetime.fromisoformat(d).date()
            if (von and dd < von) or (bis and dd > bis):
                continue
            im_bereich.append(it)
        docs = im_bereich

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
    if von or bis:
        label += f" | Zeitraum {params.datum_von or '…'}–{params.datum_bis or '…'}"
    sources = [{"title": label, "ref": f"elo://{repo_hint}/search"}]
    # Beispiel-Treffer mitgeben, damit "finde …" auch eine Liste zeigen kann
    # (nicht nur eine Zahl). Begrenzt, um das Kontextfenster zu schonen.
    beispiele = []
    for it in docs[:10]:
        fid, name = it.get("id"), it.get("name", "")
        beispiele.append({"id": fid, "name": name, "datum": _date(it)})
        sources.append({"title": name, "ref": _ref(repo_hint, fid)})
    result["beispiele"] = beispiele
    return {"result": result, "sources": sources}


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
