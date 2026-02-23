from app.main import _build_disambiguation
from app.models import SearchCandidate


def test_disambiguation_built_for_close_candidates_de() -> None:
    candidates = [
        SearchCandidate(id="111", name="Bio Muesli", confidence=0.74),
        SearchCandidate(id="222", name="Bio Haferflocken", confidence=0.70),
    ]

    result = _build_disambiguation(candidates=candidates, language="de")

    assert result is not None
    text, payload = result
    assert "Welches Produkt" in text
    assert len(payload) == 2
    assert payload[0]["name"] == "Bio Muesli"


def test_disambiguation_not_built_for_clear_winner() -> None:
    candidates = [
        SearchCandidate(id="111", name="Bio Muesli", confidence=0.90),
        SearchCandidate(id="222", name="Bio Haferflocken", confidence=0.60),
    ]

    result = _build_disambiguation(candidates=candidates, language="de")

    assert result is None
