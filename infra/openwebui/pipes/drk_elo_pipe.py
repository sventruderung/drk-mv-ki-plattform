"""
title: Dokumentensystem (ELO)
author: ST COMPUTER GmbH
version: 0.1.0
description: Dokumentenassistent für das ELO-DMS über das API-Gateway. Das
             Modell wählt selbst ein Werkzeug (suchen, zusammenfassen, zählen);
             die Mandanten- und Rechteprüfung liegt im Gateway/Connector-Service.
             Reicht das OIDC-Token des eingeloggten Nutzers durch.
requirements: httpx
"""

import httpx
from pydantic import BaseModel, Field


class Pipe:
    """Open-WebUI-Pipe: erscheint als eigenes 'Modell' in der Modellauswahl.

    Voraussetzungen:
    - Login in Open WebUI via Keycloak-OIDC (setzt das oauth_id_token-Cookie)
    - Keycloak-Mapper liefern tenant_id im ID-Token
    - Gateway erreichbar unter valves.gateway_url (Docker-internes Netz)
    """

    class Valves(BaseModel):
        gateway_url: str = Field(
            default="http://api-gateway:8000",
            description="Basis-URL des API-Gateways (Docker-intern)",
        )
        timeout_seconds: int = Field(default=300)

    def __init__(self):
        self.valves = self.Valves()

    def pipes(self):
        return [{"id": "drk-dms-elo", "name": "🗂️ DMS (ELO)"}]

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

        token = __request__.cookies.get("oauth_id_token")
        if not token:
            yield (
                "⚠️ Kein OIDC-Token gefunden. Bitte über den Login "
                "anmelden — lokale Open-WebUI-Konten haben keinen Zugriff auf das "
                "Dokumentensystem."
            )
            return

        question = self._last_user_message(body)
        if not question.strip():
            yield "Bitte eine Frage zum Dokumentensystem eingeben."
            return

        await status("🗂️ Frage das ELO-Dokumentensystem (rechtegeprüft) …")
        try:
            async with httpx.AsyncClient(timeout=self.valves.timeout_seconds) as client:
                async with client.stream(
                    "POST",
                    f"{self.valves.gateway_url}/api/v1/elo/chat",
                    json={"message": question},
                    headers={"Authorization": f"Bearer {token}"},
                ) as resp:
                    if resp.status_code == 401:
                        yield "⚠️ Sitzung abgelaufen. Bitte ab- und wieder anmelden."
                        return
                    if resp.status_code != 200:
                        yield f"⚠️ Fehler vom Gateway (HTTP {resp.status_code})."
                        return
                    first = True
                    async for text in resp.aiter_text():
                        if not text:
                            continue
                        if first:
                            await status("✍️ Formuliere Antwort aus dem DMS …", done=True)
                            first = False
                        yield text
                    yield (
                        "\n\n---\n🔒 *Lokal verarbeitet — Frage und Dokumente "
                        "haben die Plattform nicht verlassen.*"
                    )
        except httpx.ConnectError:
            yield (
                "⚠️ API-Gateway nicht erreichbar. Bitte Administrator "
                "informieren (Dienst api-gateway prüfen)."
            )
