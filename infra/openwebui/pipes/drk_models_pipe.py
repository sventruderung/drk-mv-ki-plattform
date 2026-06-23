"""
title: Externe Modelle
author: ST COMPUTER GmbH
version: 0.1.0
description: Stellt vom Administrator aktivierte externe KI-Modelle (OpenAI,
             Anthropic) in der Modellauswahl bereit. Die Nutzung wird pro
             Nutzer am Gateway geprüft — nicht freigegebene Modelle liefern
             einen klaren Hinweis. Eingaben an externe Modelle verlassen die
             Plattform (DSB-Freigabe vorausgesetzt).
requirements: httpx
"""

import json

import httpx
from pydantic import BaseModel, Field


class Pipe:
    class Valves(BaseModel):
        gateway_url: str = Field(
            default="http://api-gateway:8000",
            description="Basis-URL des API-Gateways (Docker-intern)",
        )
        timeout_seconds: int = Field(default=300)

    def __init__(self):
        self.valves = self.Valves()

    def pipes(self):
        """Aktivierte externe Modelle vom Gateway holen (öffentliche Liste,
        nur IDs/Namen — die Berechtigung wird pro Anfrage geprüft)."""
        try:
            resp = httpx.get(
                f"{self.valves.gateway_url}/api/v1/models/public", timeout=10
            )
            resp.raise_for_status()
            models = [m for m in resp.json() if m["provider"] != "local"]
        except httpx.HTTPError:
            return [{"id": "drk-extern-offline", "name": "Externe Modelle (Gateway nicht erreichbar)"}]
        if not models:
            return [{"id": "drk-extern-none", "name": "Externe Modelle (keine Modelle aktiviert)"}]
        # Unmissverständliche Kennzeichnung in der Modellauswahl
        provider_label = {"openai": "OpenAI", "anthropic": "Anthropic"}
        return [
            {
                "id": f"drk-ext-{m['id']}",
                "name": f"🌐 EXTERN ({provider_label.get(m['provider'], m['provider'])}): "
                + m["display_name"].replace(" (extern!)", ""),
            }
            for m in models
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

    async def pipe(self, body: dict, __user__: dict, __request__):
        token = __request__.cookies.get("oauth_id_token")
        if not token:
            yield "⚠️ Bitte über den Login anmelden."
            return

        model_id = body.get("model", "")
        if "drk-ext-" not in model_id:
            yield "⚠️ Kein externes Modell aktiviert oder Gateway nicht erreichbar."
            return
        model = model_id.split("drk-ext-", 1)[1]

        question = self._last_user_message(body)
        if not question.strip():
            yield "Bitte eine Frage eingeben."
            return

        # Transparenz: Jede Antwort beginnt mit dem Extern-Hinweis
        yield (
            "> 🌐 **Externes Modell** — Ihre Eingabe wurde an einen "
            "Drittanbieter außerhalb der Plattform übertragen.\n\n"
        )

        try:
            async with httpx.AsyncClient(timeout=self.valves.timeout_seconds) as client:
                async with client.stream(
                    "POST",
                    f"{self.valves.gateway_url}/api/v1/chat/",
                    json={"message": question, "model": model},
                    headers={"Authorization": f"Bearer {token}"},
                ) as resp:
                    if resp.status_code == 403:
                        yield (
                            "⚠️ Dieses Modell ist für Sie nicht freigegeben. "
                            "Bitte wenden Sie sich an Ihren Administrator."
                        )
                        return
                    if resp.status_code == 401:
                        yield "⚠️ Sitzung abgelaufen. Bitte ab- und wieder anmelden."
                        return
                    if resp.status_code != 200:
                        yield f"⚠️ Fehler vom Gateway (HTTP {resp.status_code})."
                        return
                    async for line in resp.aiter_lines():
                        if not line.strip():
                            continue
                        try:
                            text = json.loads(line).get("response", "")
                            if text:
                                yield text
                        except ValueError:
                            yield line
        except httpx.ConnectError:
            yield "⚠️ API-Gateway nicht erreichbar. Bitte Administrator informieren."
