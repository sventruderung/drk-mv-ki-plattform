"""Dateiablage für Original-Dokumente (pro Tenant ein Unterordner).

Ersetzt den früheren MinIO-Objektspeicher: Die Originale liegen als normale
Dateien im Docker-Volume ``documents_data`` (gemountet nach ``documents_dir``).
Der Schlüssel bleibt unverändert ``<tenant_id>/<doc_id>/<dateiname>`` — die
``storage_key``-Spalte in der Datenbank muss also nicht migriert werden.
"""

import os
import tempfile
from pathlib import Path

from .config import Settings

_root: Path | None = None


def init_storage(settings: Settings) -> None:
    global _root
    _root = Path(settings.documents_dir).resolve()
    _root.mkdir(parents=True, exist_ok=True)


def _path(key: str) -> Path:
    """Schlüssel → Dateipfad. Verhindert Pfad-Ausbrüche (``..``, absolute Pfade)."""
    assert _root is not None
    path = (_root / key).resolve()
    if not path.is_relative_to(_root) or path == _root:
        raise ValueError(f"Ungültiger Speicher-Schlüssel: {key!r}")
    return path


def put_object(key: str, data: bytes, content_type: str) -> None:  # noqa: ARG001
    path = _path(key)
    path.parent.mkdir(parents=True, exist_ok=True)
    # Atomar schreiben: erst Temp-Datei im Zielordner, dann umbenennen
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=".upload-")
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(data)
        os.replace(tmp, path)
    except BaseException:
        Path(tmp).unlink(missing_ok=True)
        raise


def get_object(key: str) -> bytes:
    return _path(key).read_bytes()


def delete_object(key: str) -> None:
    path = _path(key)
    path.unlink(missing_ok=True)
    # Leere Elternordner (Dokument-Ordner, ggf. Unterordner) aufräumen,
    # aber nie den Tenant-Ordner oder die Wurzel selbst
    assert _root is not None
    parent = path.parent
    while parent != _root and parent.parent != _root:
        try:
            parent.rmdir()
        except OSError:
            break
        parent = parent.parent
