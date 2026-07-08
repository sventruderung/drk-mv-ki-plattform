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


# Belegdatum-Feld je Rechnungsart (beide Format JJJJMMTT) und maskenübergreifend
# nutzbare Felder. Für Belegdatum-Zeiträume werden BEIDE Felder durchsucht.
DATE_FIELDS = ("INVOICE_DATE", "E4S_BELEG_DATE")  # Eingang / Ausgang (Sage)
SHARED_FIELDS = {"COMPANY_NAME", "COMPANY_CODE"}


def _fits_mask(feld: str, date_field: str) -> bool:
    """Gehört ein felder-Schlüssel zur Maske des jeweiligen Datumsfeldes?"""
    if feld in SHARED_FIELDS:
        return True
    if date_field.startswith("INVOICE"):
        return feld.startswith(("INVOICE", "VENDOR"))
    return feld.startswith("E4S")


async def statistik_dokumente_zaehlen(
    client: EloClient, params: StatsParams, repo_hint: str
) -> dict[str, Any]:
    """`statistik.dokumente_zaehlen` -> POST /api/search/keywording + Zählung.

    belegdatum (JJJJMM/JJJJ) durchsucht beide Rechnungsarten serverseitig über
    ihr Belegdatum-Feld; felder filtert direkt; datum_von/-bis filtert zusätzlich
    client-seitig über das Ablagedatum.
    """
    if not params.felder and not params.belegdatum \
            and not params.datum_von and not params.datum_bis \
            and params.aelter_als_tage is None:
        return {
            "result": {"hinweis": "Bitte ein Filterkriterium angeben: ein Feld "
                       "(z.B. Kreditor/Kunde), einen Belegzeitraum (belegdatum) "
                       "oder ein Ablagedatum (datum_von/datum_bis)."},
            "sources": [{"title": "Hinweis", "ref": f"elo://{repo_hint}/hinweis"}],
        }

    if params.belegdatum:
        # Zeitraum über das Belegdatum: beide Masken abfragen und zusammenführen.
        pref = params.belegdatum.strip()
        merged: dict[Any, dict] = {}
        for date_field in DATE_FIELDS:
            query = {date_field: pref + "*"}
            for k, v in params.felder.items():
                if _fits_mask(k, date_field):
                    query[k] = _fuzzy(v)
            for it in await client.search_keywording(query):
                if not it.get("isDir", False):
                    merged[it.get("id")] = it
        docs = list(merged.values())
        label = f"Belegdatum {pref}*"
        if params.felder:
            label += " | " + ", ".join(f"{k}={v}" for k, v in params.felder.items())
    elif params.felder:
        # Reine Feldsuche (unscharf für Text, exakt für Zahlen/Datum).
        felder = {k: _fuzzy(v) for k, v in params.felder.items()}
        items = await client.search_keywording(felder)
        docs = [it for it in items if not it.get("isDir", False)]
        label = "Keywording: " + ", ".join(f"{k}={v}" for k, v in params.felder.items())
    else:
        # Kein Feldfilter (nur Ablagedatum/Alter): breite Volltextbasis holen,
        # dann unten client-seitig über das Ablagedatum eingrenzen.
        items = await client.search("*", "ANYWHERE", 10000)
        docs = [it for it in items if not it.get("isDir", False)]
        label = "Alle Dokumente"

    # Zusätzlicher Zeitraumfilter auf das ABLAGE-/Importdatum (client-seitig).
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
        label += f" | Ablage {params.datum_von or '…'}–{params.datum_bis or '…'}"

    result: dict[str, Any] = {"gesamt": len(docs)}
    if params.aelter_als_tage is not None:
        today = datetime.now(timezone.utc).date()
        aelter = 0
        for it in docs:
            d = _date(it)
            if d and (today - datetime.fromisoformat(d).date()).days > params.aelter_als_tage:
                aelter += 1
        result[f"aelter_als_{params.aelter_als_tage}_tage"] = aelter

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
