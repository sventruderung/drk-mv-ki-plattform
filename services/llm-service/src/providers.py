"""Provider-Streaming — einheitliches Ausgabeformat für alle Provider.

Jeder Provider liefert NDJSON-Zeilen im Ollama-Format {"response": "<text>"},
damit Gateway, Pipes und Open WebUI keinen Unterschied sehen.

COMPLIANCE: Externe Provider (openai/anthropic) übertragen den Prompt an
einen Drittanbieter. Nur für explizit freigegebene Modelle erreichbar
(Prüfung im Gateway). RAG/Social Media nutzen ausschließlich 'local'.
"""

import json
from collections.abc import AsyncIterator

import anthropic
import httpx


def _line(text: str, done: bool = False) -> bytes:
    return (json.dumps({"response": text, "done": done}) + "\n").encode()


async def stream_local(
    prompt: str, model: str, ollama_base_url: str
) -> AsyncIterator[bytes]:
    async with httpx.AsyncClient(timeout=300) as client:
        async with client.stream(
            "POST",
            f"{ollama_base_url}/api/generate",
            # think=False: Qwen3 wuerde sonst erst unsichtbar "nachdenken" —
            # der Nutzer saehe sekundenlang nichts (TTFT-Anforderung < 2 s)
            json={"model": model, "prompt": prompt, "stream": True, "think": False},
        ) as resp:
            resp.raise_for_status()
            async for chunk in resp.aiter_bytes():
                yield chunk


async def stream_anthropic(
    prompt: str, model: str, api_key: str
) -> AsyncIterator[bytes]:
    client = anthropic.AsyncAnthropic(api_key=api_key)
    try:
        async with client.messages.stream(
            model=model,
            max_tokens=16000,
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            async for text in stream.text_stream:
                yield _line(text)
        yield _line("", done=True)
    except anthropic.AuthenticationError:
        yield _line("⚠️ Anthropic-API-Key ungültig — bitte Administrator informieren.", done=True)
    except anthropic.APIError as e:
        yield _line(f"⚠️ Anthropic-API-Fehler: {e.__class__.__name__}", done=True)
    finally:
        await client.close()


async def stream_openai(
    prompt: str, model: str, api_key: str
) -> AsyncIterator[bytes]:
    async with httpx.AsyncClient(timeout=300) as client:
        async with client.stream(
            "POST",
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "stream": True,
            },
        ) as resp:
            if resp.status_code == 401:
                yield _line("⚠️ OpenAI-API-Key ungültig — bitte Administrator informieren.", done=True)
                return
            if resp.status_code != 200:
                yield _line(f"⚠️ OpenAI-API-Fehler (HTTP {resp.status_code})", done=True)
                return
            async for line in resp.aiter_lines():
                if not line.startswith("data: "):
                    continue
                payload = line[6:]
                if payload.strip() == "[DONE]":
                    break
                try:
                    delta = json.loads(payload)["choices"][0]["delta"]
                    if text := delta.get("content"):
                        yield _line(text)
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue
            yield _line("", done=True)
