"""
title: DRK Wissensbasis (RAG)
author: ST COMPUTER GmbH
version: 0.1.0
description: Rechtegeprüfte RAG-Suche über das DRK API-Gateway. Reicht das
             OIDC-Token des eingeloggten Nutzers durch, damit der ACL-Filter
             (§4.2 Lastenheft) pro Nutzer greift.
requirements: httpx
"""

import httpx
from pydantic import BaseModel, Field


class Pipe:
    """Open-WebUI-Pipe: erscheint als eigenes 'Modell' in der Modellauswahl.

    Voraussetzungen:
    - Login in Open WebUI via Keycloak-OIDC (setzt das oauth_id_token-Cookie)
    - Keycloak-Mapper liefern tenant_id und realm_access.roles auch im ID-Token
    - Gateway erreichbar unter valves.gateway_url (Docker-internes Netz)
    """

    class Valves(BaseModel):
        gateway_url: str = Field(
            default="http://api-gateway:8000",
            description="Basis-URL des DRK API-Gateways (Docker-intern)",
        )
        timeout_seconds: int = Field(default=300)

    def __init__(self):
        self.valves = self.Valves()

    def pipes(self):
        return [{"id": "drk-rag", "name": "🔒 DRK Wissensbasis (lokal)"}]

    @staticmethod
    def _last_user_message(body: dict) -> str:
        for message in reversed(body.get("messages", [])):
            if message.get("role") == "user":
                content = message.get("content", "")
                if isinstance(content, list):  # Multimodal-Format
                    content = " ".join(
                        p.get("text", "") for p in content if p.get("type") == "text"
                    )
                return content
        return ""

    async def pipe(self, body: dict, __user__: dict, __request__, __event_emitter__=None):
        async def status(text: str, done: bool = False):
            if __event_emitter__:
                await __event_emitter__(
                    {"type": "status", "data": {"description": text, "done": done}}
                )

        # OIDC-Token des Nutzers aus der Open-WebUI-Session (Cookie nach OAuth-Login)
        token = __request__.cookies.get("oauth_id_token")
        if not token:
            yield (
                "⚠️ Kein OIDC-Token gefunden. Bitte über 'DRK Login' (Keycloak) "
                "anmelden — lokale Open-WebUI-Konten haben keinen Zugriff auf "
                "die Wissensbasis."
            )
            return

        question = self._last_user_message(body)
        if not question.strip():
            yield "Bitte eine Frage eingeben."
            return

        await status("🔍 Durchsuche die Wissensbasis (rechtegeprüft) …")
        try:
            async with httpx.AsyncClient(
                timeout=self.valves.timeout_seconds
            ) as client:
                async with client.stream(
                    "POST",
                    f"{self.valves.gateway_url}/api/v1/rag/chat",
                    json={"message": question},
                    headers={"Authorization": f"Bearer {token}"},
                ) as resp:
                    if resp.status_code == 401:
                        yield (
                            "⚠️ Sitzung abgelaufen. Bitte ab- und wieder anmelden."
                        )
                        return
                    if resp.status_code != 200:
                        yield f"⚠️ Fehler vom Gateway (HTTP {resp.status_code})."
                        return
                    # Gateway streamt Ollama-NDJSON — Text-Tokens extrahieren
                    import json as _json

                    first = True
                    async for line in resp.aiter_lines():
                        if not line.strip():
                            continue
                        if first:
                            await status("✍️ Formuliere Antwort aus den Quellen …", done=True)
                            first = False
                        try:
                            chunk = _json.loads(line)
                            text = chunk.get("response", "")
                            if text:
                                yield text
                        except ValueError:
                            # Klartext (z.B. "keine freigegebenen Informationen")
                            yield line
                    # Transparenz: lokale Verarbeitung sichtbar machen
                    yield (
                        "\n\n---\n🔒 *Lokal verarbeitet — Frage und Dokumente "
                        "haben die DRK-Plattform nicht verlassen.*"
                    )
        except httpx.ConnectError:
            yield (
                "⚠️ DRK API-Gateway nicht erreichbar. Bitte Administrator "
                "informieren (Dienst api-gateway prüfen)."
            )
