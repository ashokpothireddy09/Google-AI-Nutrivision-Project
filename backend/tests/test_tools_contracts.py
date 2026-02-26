from __future__ import annotations

import asyncio

import httpx

from app import tools


class _FakeResponse:
    def __init__(self, payload: dict):
        self._payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return self._payload


class _FakeAsyncClient:
    def __init__(self, *, payload: dict | None = None, should_raise: Exception | None = None, calls: list | None = None, **_: object):
        self._payload = payload or {}
        self._should_raise = should_raise
        self._calls = calls if calls is not None else []

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def get(self, url: str, params: dict | None = None, headers: dict | None = None):
        self._calls.append((url, params, headers))
        if self._should_raise:
            raise self._should_raise
        return _FakeResponse(self._payload)


def _run(coro):
    return asyncio.run(coro)


def test_get_product_by_barcode_contract_and_cache(monkeypatch) -> None:
    calls: list[tuple] = []
    payload = {
        "status": 1,
        "product": {
            "code": "4251097401447",
            "product_name": "BiFi Original XXL",
            "brands": "BiFi",
            "nutriments": {
                "sugars_100g": 0.9,
                "salt_100g": 2.1,
                "saturated-fat_100g": 6.2,
                "proteins_100g": 18.0,
            },
            "ingredients_text": "meat, salt",
            "additives_tags": ["en:e250"],
            "ingredients_tags": ["en:pork"],
        },
    }

    monkeypatch.setattr(
        tools.httpx,
        "AsyncClient",
        lambda *args, **kwargs: _FakeAsyncClient(payload=payload, calls=calls, *args, **kwargs),
    )
    tools._barcode_cache.clear()

    first = _run(
        tools.get_product_by_barcode(
            barcode="4251097401447",
            domain="food",
            locale_country="de",
            locale_language="de",
        )
    )
    second = _run(
        tools.get_product_by_barcode(
            barcode="4251097401447",
            domain="food",
            locale_country="de",
            locale_language="de",
        )
    )

    assert first.found is True
    assert first.product_id == "4251097401447"
    assert first.canonical_name == "BiFi Original XXL"
    assert second.found is True
    assert len(calls) == 1


def test_get_product_by_barcode_source_failure_fallback(monkeypatch) -> None:
    monkeypatch.setattr(
        tools.httpx,
        "AsyncClient",
        lambda *args, **kwargs: _FakeAsyncClient(
            should_raise=httpx.TimeoutException("OFF timeout"), *args, **kwargs
        ),
    )
    tools._barcode_cache.clear()

    result = _run(
        tools.get_product_by_barcode(
            barcode="4251097401447",
            domain="food",
            locale_country="de",
            locale_language="de",
        )
    )

    assert result.found is False


def test_search_product_catalog_contract_and_cache(monkeypatch) -> None:
    calls: list[tuple] = []
    payload = {
        "products": [
            {"code": "111", "product_name": "Organic Oat Cereal"},
            {"code": "222", "product_name": "Organic Oat Cereal Honey"},
            {"code": "333", "product_name": "Organic Oat Cereal Cocoa"},
        ]
    }

    monkeypatch.setattr(
        tools.httpx,
        "AsyncClient",
        lambda *args, **kwargs: _FakeAsyncClient(payload=payload, calls=calls, *args, **kwargs),
    )
    tools._search_cache.clear()

    first = _run(
        tools.search_product_catalog(
            query_text="oat cereal",
            domain="food",
            locale_country="de",
            locale_language="de",
            max_results=5,
        )
    )
    second = _run(
        tools.search_product_catalog(
            query_text="oat cereal",
            domain="food",
            locale_country="de",
            locale_language="de",
            max_results=5,
        )
    )

    assert first.selected_candidate is not None
    assert first.selected_candidate.id == "111"
    assert len(first.candidates) == 3
    assert first.candidates[0].confidence > first.candidates[1].confidence > first.candidates[2].confidence
    assert len(calls) == 1
    assert second.selected_candidate is not None


def test_search_product_catalog_source_failure_fallback(monkeypatch) -> None:
    monkeypatch.setattr(
        tools.httpx,
        "AsyncClient",
        lambda *args, **kwargs: _FakeAsyncClient(
            should_raise=httpx.ConnectError("network down"), *args, **kwargs
        ),
    )
    tools._search_cache.clear()

    result = _run(
        tools.search_product_catalog(
            query_text="oat cereal",
            domain="food",
            locale_country="de",
            locale_language="de",
            max_results=5,
        )
    )

    assert result.selected_candidate is None
    assert result.candidates == []


def test_search_product_catalog_retries_query_variants(monkeypatch) -> None:
    calls: list[tuple] = []

    class _VariantAsyncClient(_FakeAsyncClient):
        async def get(self, url: str, params: dict | None = None, headers: dict | None = None):
            self._calls.append((url, params, headers))
            term = str((params or {}).get("search_terms") or "").lower()
            if term == "lays":
                return _FakeResponse(
                    {
                        "products": [
                            {"code": "999", "product_name": "Lay's Classic Chips"},
                        ]
                    }
                )
            return _FakeResponse({"products": []})

    monkeypatch.setattr(
        tools.httpx,
        "AsyncClient",
        lambda *args, **kwargs: _VariantAsyncClient(calls=calls, *args, **kwargs),
    )
    tools._search_cache.clear()

    result = _run(
        tools.search_product_catalog(
            query_text="lay chips classic",
            domain="food",
            locale_country="de",
            locale_language="de",
            max_results=5,
        )
    )

    assert result.selected_candidate is not None
    assert result.selected_candidate.name == "Lay's Classic Chips"
    assert any((params or {}).get("search_terms") == "lays" for _, params, _ in calls)
