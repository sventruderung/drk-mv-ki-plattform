"""
title: DRK Social Media (P02)
author: ST COMPUTER GmbH
version: 0.1.0
description: Erstellt Social-Media-Entwürfe über den content-service.
             Pro Kanal ein eigenes 'Modell' in der Auswahl. Entwürfe landen
             im Freigabe-Workflow — nichts wird automatisch veröffentlicht.
requirements: httpx
"""

import httpx
from pydantic import BaseModel, Field

CHANNELS = {
    "facebook": "Facebook",
    "instagram": "Instagram",
    "linkedin": "LinkedIn",
    "webseite": "Webseite",
    "newsletter": "Newsletter",
}


class Pipe:
    class Valves(BaseModel):
        gateway_url: str = Field(
            default="http://api-gateway:8000",
            description="Basis-URL des DRK API-Gateways (Docker-intern)",
        )
        timeout_seconds: int = Field(default=300)

    def __init__(self):
        self.valves = self.Valves()

    def pipes(self):
        return [
            {"id": f"drk-content-{key}", "name": f"🔒 DRK Social Media ({label}, lokal)"}
            for key, label in CHANNELS.items()
        ]

    @staticmethod
    def _last_user_message(body: dict) -> str:
        for message in reversed(body.get("messages", [])):
            if message.get("role") == "user":
                content = message.get("content", "")
                if isinstance(content, list):
                    content = " ".join(
                        p.get("text", "") for p in content if p.get("type") == "text"
                    )
                return content
        return ""

    async def pipe(self, body: dict, __user__: dict, __request__) -> str:
        token = __request__.cookies.get("oauth_id_token")
        if not token:
            return (
                "⚠️ Kein OIDC-Token gefunden. Bitte über 'DRK Login' (Keycloak) "
                "anmelden."
            )

        # Kanal aus der Modell-ID ableiten (z.B. "...drk-content-facebook")
        model_id = body.get("model", "")
        channel = next((k for k in CHANNELS if model_id.endswith(k)), None)
        if channel is None:
            return "⚠️ Kanal konnte nicht ermittelt werden."

        topic = self._last_user_message(body)
        if not topic.strip():
            return (
                "Bitte Stichpunkte oder Rohdaten für den Beitrag eingeben "
                "(z.B. Anlass, Datum, Ort, Kernbotschaft)."
            )

        try:
            async with httpx.AsyncClient(
                timeout=self.valves.timeout_seconds
            ) as client:
                resp = await client.post(
                    f"{self.valves.gateway_url}/api/v1/content/",
                    json={"channel": channel, "topic": topic},
                    headers={"Authorization": f"Bearer {token}"},
                )
        except httpx.ConnectError:
            return "⚠️ DRK API-Gateway nicht erreichbar. Bitte Administrator informieren."

        if resp.status_code == 401:
            return "⚠️ Sitzung abgelaufen. Bitte ab- und wieder anmelden."
        if resp.status_code == 403:
            return (
                "⚠️ Keine Berechtigung: Für das Erstellen von Entwürfen wird "
                "die Rolle 'content-editor' benötigt."
            )
        if resp.status_code != 200:
            return f"⚠️ Fehler vom Gateway (HTTP {resp.status_code})."

        draft = resp.json()
        return (
            f"{draft['draft_text']}\n\n"
            f"---\n"
            f"📋 Entwurf gespeichert (ID: `{draft['id']}`, Kanal: "
            f"{CHANNELS[channel]}, Status: **{draft['status']}**).\n"
            f"Der Beitrag wird erst nach Freigabe durch eine zweite Person "
            f"veröffentlicht — nichts geht automatisch online.\n"
            f"🔒 *Lokal erstellt — Ihre Stichpunkte haben die DRK-Plattform "
            f"nicht verlassen.*"
        )
