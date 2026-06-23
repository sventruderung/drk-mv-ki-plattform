"""Strukturiertes JSON-Logging — niemals Inhalte, nur Metadaten (CLAUDE.md)."""

import json
import logging
import sys


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "level": record.levelname,
            "service": "elo-connector",
            "message": record.getMessage(),
        }
        for key in ("tenant_id", "request_id", "capability", "duration_ms", "status",
                    "connector_id"):
            if hasattr(record, key):
                payload[key] = getattr(record, key)
        return json.dumps(payload, ensure_ascii=False)


def configure_logging() -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.INFO)
