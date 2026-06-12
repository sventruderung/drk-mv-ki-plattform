#!/usr/bin/env python3
"""Smoke-Test nach dem Deployment: Sind alle Dienste erreichbar und gesund?

Auf dem DGX Spark ausführen:  python3 scripts/smoke_test.py
Abhängigkeit: pip install httpx
"""

import sys

import httpx

CHECKS = [
    ("API-Gateway",      "http://localhost:8000/api/v1/health"),
    ("RAG-Service",      "http://localhost:8001/api/v1/health"),
    ("LLM-Service",      "http://localhost:8002/api/v1/health"),
    ("Content-Service",  "http://localhost:8005/api/v1/health"),
    ("Ollama",           "http://localhost:11434/api/tags"),
    ("Keycloak (Realm)", "http://localhost:8080/auth/realms/drk-kv/.well-known/openid-configuration"),
    ("Open WebUI",       "http://localhost:3000/health"),
    ("MinIO",            "http://localhost:9000/minio/health/live"),
]

REQUIRED_MODELS = {"qwen3:32b", "nomic-embed-text"}


def main() -> None:
    failures = 0
    for name, url in CHECKS:
        try:
            resp = httpx.get(url, timeout=10)
            if resp.status_code == 200:
                print(f"✅ {name}")
            else:
                print(f"❌ {name}: HTTP {resp.status_code}")
                failures += 1
        except httpx.HTTPError as e:
            print(f"❌ {name}: {type(e).__name__}")
            failures += 1

    # Modelle vorhanden?
    try:
        tags = httpx.get("http://localhost:11434/api/tags", timeout=10).json()
        present = {m["name"].split(":latest")[0] for m in tags.get("models", [])}
        for model in REQUIRED_MODELS:
            base = model.split(":")[0]
            if any(p.startswith(base) for p in present):
                print(f"✅ Modell: {model}")
            else:
                print(f"❌ Modell fehlt: {model}  →  docker compose exec ollama ollama pull {model}")
                failures += 1
    except httpx.HTTPError:
        print("❌ Modell-Check: Ollama nicht erreichbar")
        failures += 1

    if failures:
        print(f"\n{failures} Problem(e) gefunden.")
        sys.exit(1)
    print("\nAlle Checks bestanden — System bereit. 🚀")


if __name__ == "__main__":
    main()
