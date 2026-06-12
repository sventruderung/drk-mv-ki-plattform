from src.core.rerank import select_top


def test_select_top_orders_by_score():
    rows = ["a", "b", "c", "d"]
    scores = [0.1, 0.9, 0.5, 0.7]
    assert select_top(rows, scores, 2) == ["b", "d"]


def test_select_top_handles_fewer_rows_than_k():
    assert select_top(["a"], [0.3], 5) == ["a"]


def test_select_top_keeps_best_even_if_first_by_vector():
    # Vektor-Reihenfolge (rows) darf das Ergebnis nicht beeinflussen
    rows = ["vektor-1", "vektor-2", "vektor-3"]
    scores = [0.2, 0.1, 0.95]
    assert select_top(rows, scores, 1) == ["vektor-3"]
