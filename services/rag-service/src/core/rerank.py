"""Reranking der RAG-Treffer (§3.2: Halluzinationen minimieren).

Die Vektorsuche findet semantisch Ähnliches — der Cross-Encoder bewertet
zusätzlich, ob die Passage die FRAGE wirklich beantwortet. Läuft lokal
auf der CPU (mehrsprachiges mMARCO-Modell, beim Image-Build gebündelt).
"""

import asyncio
import threading

_model = None
_lock = threading.Lock()


def _get_model(model_name: str):
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                from sentence_transformers import CrossEncoder

                _model = CrossEncoder(model_name, max_length=512)
    return _model


def warmup(model_name: str) -> None:
    """Modell beim Service-Start laden, damit die erste Anfrage nicht wartet."""
    _get_model(model_name)


async def rerank_scores(
    question: str, passages: list[str], model_name: str
) -> list[float]:
    """Relevanz-Score je Passage (höher = besser); blockiert den Event-Loop nicht."""
    model = _get_model(model_name)
    pairs = [(question, p) for p in passages]
    loop = asyncio.get_event_loop()
    scores = await loop.run_in_executor(None, lambda: model.predict(pairs))
    return [float(s) for s in scores]


def select_top(rows: list, scores: list[float], top_k: int) -> list:
    """Zeilen nach Score absteigend sortieren und die besten top_k liefern."""
    ranked = sorted(zip(rows, scores), key=lambda x: x[1], reverse=True)
    return [row for row, _ in ranked[:top_k]]
