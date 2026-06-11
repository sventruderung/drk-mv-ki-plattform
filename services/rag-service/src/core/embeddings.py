"""Embeddings via Ollama (nomic-embed-text, 768 Dimensionen)."""

import httpx

EXPECTED_DIM = 768


async def embed_texts(
    texts: list[str], base_url: str, model: str
) -> list[list[float]]:
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{base_url}/api/embed",
            json={"model": model, "input": texts},
        )
        resp.raise_for_status()
        embeddings: list[list[float]] = resp.json()["embeddings"]
    for emb in embeddings:
        if len(emb) != EXPECTED_DIM:
            raise ValueError(
                f"Embedding-Dimension {len(emb)} ≠ {EXPECTED_DIM} — "
                f"falsches Modell konfiguriert? (erwartet: nomic-embed-text)"
            )
    return embeddings


async def embed_query(text: str, base_url: str, model: str) -> list[float]:
    return (await embed_texts([text], base_url, model))[0]
