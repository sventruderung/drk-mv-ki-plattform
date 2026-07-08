"""Die drei Capabilities, gemappt auf den ELO REST Service.

Jede Funktion liefert ein normalisiertes `data`-Objekt mit Pflicht-`sources`.
Die Zusammenfassung erzeugt das Modell im LLM-Service; der Connector liefert
nur den extrahierten Text als Datenbasis.
"""

import asyncio
from datetime import datetime, timezone
from typing import Any

from .elo_client import EloClient, EloError
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


def _fmt_date(value: str | None) -> str:
    """ELO-Datum JJJJMMTT -> TT.MM.JJJJ (für die Anzeige)."""
    v = (str(value) if value else "")[:8]
    if len(v) == 8 and v.isdigit():
        return f"{v[6:8]}.{v[4:6]}.{v[0:4]}"
    return v


def _clean_status(value: str | None) -> str:
    """INVOICE_STATUS aufräumen: '7 - Gebucht' -> 'Gebucht'."""
    s = (str(value) if value else "").strip()
    if " - " in s:
        s = s.split(" - ", 1)[1].strip()
    return s


def _parse_amount(value: str | None) -> float | None:
    """Deutscher Betrag '1.648,15' -> 1648.15 (defensiv)."""
    s = (str(value) if value else "").strip()
    if not s:
        return None
    s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def _fmt_amount(value: float) -> str:
    """1648.15 -> '1.648,15' (deutsche Schreibweise)."""
    return f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _bezahlt(status: str | None) -> str:
    """INVOICE_STATUS -> bezahlt. Beim Kunden gilt 'Gebucht' (Status 7) als
    bezahlt; leer -> unbekannt, alle anderen Stände -> nein."""
    s = (str(status) if status else "").strip().lower()
    if not s:
        return "unbekannt"
    if "gebucht" in s or "bezahl" in s or "gezahl" in s:
        return "ja"
    return "nein"


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
# Obergrenze für die Detail-Liste (Schutz vor Extremfällen; Suche deckelt bei 1000).
MAX_BEISPIELE = 300
# Obergrenze für die Betrags-Summierung (liest pro Beleg die Verschlagwortung).
SUM_CAP = 5000
# Gleichzeitige /keywording-Abrufe begrenzen, um den ELO-Server nicht zu fluten.
_DETAIL_CONCURRENCY = 20


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

    monat_gedeckelt = False
    if params.belegdatum:
        # Zeitraum über das Belegdatum. rechnungsart bestimmt Maske/Feld:
        # eingang=INVOICE_DATE, ausgang=E4S_BELEG_DATE, sonst beide.
        art = (params.rechnungsart or "").strip().lower()
        if art.startswith("eing"):
            date_fields = ("INVOICE_DATE",)
        elif art.startswith("ausg"):
            date_fields = ("E4S_BELEG_DATE",)
        else:
            date_fields = DATE_FIELDS
        pref = params.belegdatum.strip()
        # Jahr (JJJJ) in 12 Monate zerlegen — jede Monatsabfrage bleibt unter dem
        # 1000er-Suchdeckel, die Vereinigung ist damit vollständig/exakt.
        monate = [f"{pref}{m:02d}" for m in range(1, 13)] if len(pref) == 4 else [pref]
        merged: dict[Any, dict] = {}
        for date_field in date_fields:
            feld_maske = {k: _fuzzy(v) for k, v in params.felder.items()
                          if _fits_mask(k, date_field)}
            for mp in monate:
                treffer = await client.search_keywording({date_field: mp + "*", **feld_maske})
                if len(treffer) >= 1000:
                    monat_gedeckelt = True   # ein einzelner Monat sprengt den Cap
                for it in treffer:
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
    if monat_gedeckelt:
        result["hinweis"] = ("Mindestens ein Monat überschritt 1000 Treffer — Zahl/"
                             "Summe evtl. unvollständig; Zeitraum enger fassen.")
    if params.aelter_als_tage is not None:
        today = datetime.now(timezone.utc).date()
        aelter = 0
        for it in docs:
            d = _date(it)
            if d and (today - datetime.fromisoformat(d).date()).days > params.aelter_als_tage:
                aelter += 1
        result[f"aelter_als_{params.aelter_als_tage}_tage"] = aelter

    # Optional: Beträge der Treffer summieren (für 'Gesamtsumme/wie hoch').
    if params.summe:
        sem_s = asyncio.Semaphore(_DETAIL_CONCURRENCY)

        async def _amount(it: dict) -> float | None:
            async with sem_s:
                try:
                    f = (await client.keywording(it.get("id"))).get("fields", {})
                except EloError:
                    return None
            return _parse_amount(f.get("INVOICE_TOTAL_AMOUNT") or f.get("E4S_BRUTTO"))

        betraege = await asyncio.gather(*(_amount(it) for it in docs[:SUM_CAP]))
        gueltig = [b for b in betraege if b is not None]
        result["summe"] = _fmt_amount(sum(gueltig))
        result["summe_waehrung"] = "EUR"
        result["summe_anzahl"] = len(gueltig)
        if len(docs) > SUM_CAP:
            result["hinweis"] = (f"Summe über {SUM_CAP} von {len(docs)} Treffern "
                                 "— bitte enger filtern.")

    sources = [{"title": label, "ref": f"elo://{repo_hint}/search"}]

    # Detail-Tabelle NUR bei Auflistungswunsch (liste=True). Reine Zählfragen
    # ('wie viele …') liefern nur 'gesamt' — keine (teure) Detailliste.
    if not params.liste:
        return {"result": result, "sources": sources}

    if len(docs) > MAX_BEISPIELE:
        result["hinweis"] = (f"Es werden {MAX_BEISPIELE} von {len(docs)} Treffern "
                             "aufgelistet — bitte den Zeitraum/Filter enger fassen.")

    # Alle Treffer (bis MAX_BEISPIELE) mit Details anreichern (von, Datum, Betrag,
    # Status). Pro-Dokument-Abfragen laufen parallel, aber gedrosselt.
    sem = asyncio.Semaphore(_DETAIL_CONCURRENCY)

    async def _detail(it: dict) -> dict:
        fid, name = it.get("id"), it.get("name", "")
        eintrag = {"id": fid, "name": name}
        try:
            async with sem:
                f = (await client.keywording(fid)).get("fields", {})
            if any(k.startswith("E4S") for k in f):   # Ausgangsrechnung (Sage)
                eintrag.update({
                    "von": f.get("E4S_KUNDEN_NAME") or "",
                    "rechnungsdatum": _fmt_date(f.get("E4S_BELEG_DATE")),
                    "betrag": f.get("E4S_BRUTTO") or "",
                    "status": "",
                    "bezahlt": "unbekannt",
                })
            else:                                      # Eingangsrechnung
                # INVOICE_PAYED ist leer; Stand steckt in INVOICE_STATUS.
                status = _clean_status(f.get("INVOICE_STATUS"))
                eintrag.update({
                    "von": f.get("VENDOR_NAME") or "",
                    "rechnungsdatum": _fmt_date(f.get("INVOICE_DATE")),
                    "betrag": f.get("INVOICE_TOTAL_AMOUNT") or "",
                    "status": status,
                    "bezahlt": _bezahlt(status),
                })
        except EloError:
            eintrag["datum"] = _date(it)
        return eintrag

    beispiele = await asyncio.gather(*(_detail(it) for it in docs[:MAX_BEISPIELE]))
    for eintrag in beispiele:
        sources.append({"title": eintrag.get("name", ""),
                        "ref": _ref(repo_hint, eintrag.get("id"))})
    result["beispiele"] = list(beispiele)
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
