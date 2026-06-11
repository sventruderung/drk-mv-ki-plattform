"""Chunking mit Überlappung; Seitenzuordnung bleibt für die Zitation erhalten."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Chunk:
    index: int
    text: str
    page: int | None


def split_into_chunks(
    pages: list[tuple[int | None, str]],
    chunk_size: int = 1000,
    overlap: int = 200,
) -> list[Chunk]:
    chunks: list[Chunk] = []
    index = 0
    for page, text in pages:
        text = text.strip()
        start = 0
        while start < len(text):
            end = start + chunk_size
            piece = text[start:end]
            # an Satz-/Wortgrenze kürzen, sofern nicht letzter Chunk der Seite
            if end < len(text):
                cut = max(piece.rfind(". "), piece.rfind("\n"), piece.rfind(" "))
                if cut > chunk_size // 2:
                    piece = piece[: cut + 1]
            stripped = piece.strip()
            if stripped:
                chunks.append(Chunk(index=index, text=stripped, page=page))
                index += 1
            if end >= len(text):
                break
            start += max(len(piece) - overlap, 1)
    return chunks
