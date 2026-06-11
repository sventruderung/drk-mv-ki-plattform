"""Textextraktion aus Upload-Formaten (§3.2: PDF, DOCX, XLSX, TXT).

Liefert Liste von (seite, text)-Tupeln; Seite=None wenn das Format
keine Seiten kennt (TXT, XLSX, DOCX).
"""

import io

from docx import Document as DocxDocument
from openpyxl import load_workbook
from pypdf import PdfReader

SUPPORTED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "text/plain": "txt",
}


def extract_text(data: bytes, content_type: str) -> list[tuple[int | None, str]]:
    kind = SUPPORTED_TYPES.get(content_type)
    if kind is None:
        raise ValueError(
            f"Nicht unterstütztes Format: {content_type}. "
            f"Unterstützt: PDF, DOCX, XLSX, TXT"
        )
    match kind:
        case "pdf":
            return _extract_pdf(data)
        case "docx":
            return _extract_docx(data)
        case "xlsx":
            return _extract_xlsx(data)
        case "txt":
            return [(None, data.decode("utf-8", errors="replace"))]
    raise AssertionError("unreachable")


def _extract_pdf(data: bytes) -> list[tuple[int | None, str]]:
    reader = PdfReader(io.BytesIO(data))
    return [
        (i + 1, text)
        for i, page in enumerate(reader.pages)
        if (text := page.extract_text() or "").strip()
    ]


def _extract_docx(data: bytes) -> list[tuple[int | None, str]]:
    doc = DocxDocument(io.BytesIO(data))
    text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    return [(None, text)] if text else []


def _extract_xlsx(data: bytes) -> list[tuple[int | None, str]]:
    wb = load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    parts: list[str] = []
    for sheet in wb.worksheets:
        rows = [
            " | ".join(str(c) for c in row if c is not None)
            for row in sheet.iter_rows(values_only=True)
            if any(c is not None for c in row)
        ]
        if rows:
            parts.append(f"[Tabelle: {sheet.title}]\n" + "\n".join(rows))
    text = "\n\n".join(parts)
    return [(None, text)] if text else []
