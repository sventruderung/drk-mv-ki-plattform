from src.core.chunking import split_into_chunks


def test_short_text_single_chunk():
    chunks = split_into_chunks([(1, "Kurzer Text.")])
    assert len(chunks) == 1
    assert chunks[0].page == 1
    assert chunks[0].text == "Kurzer Text."


def test_long_text_is_split_with_overlap():
    text = "Satz Nummer eins. " * 200  # ~3600 Zeichen
    chunks = split_into_chunks([(None, text)], chunk_size=1000, overlap=200)
    assert len(chunks) > 2
    assert all(len(c.text) <= 1000 for c in chunks)
    # Indizes fortlaufend
    assert [c.index for c in chunks] == list(range(len(chunks)))


def test_page_numbers_preserved_across_pages():
    pages = [(1, "Inhalt Seite eins. " * 10), (2, "Inhalt Seite zwei. " * 10)]
    chunks = split_into_chunks(pages, chunk_size=500)
    assert {c.page for c in chunks} == {1, 2}


def test_empty_pages_produce_no_chunks():
    assert split_into_chunks([(1, "   ")]) == []
