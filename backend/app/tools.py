from __future__ import annotations

import time
from typing import Any, TypeVar

import httpx

from .config import settings
from .models import BarcodeToolResult, SearchCandidate, SearchToolResult

FOOD_FIELDS = (
    "code,product_name,brands,nutriments,nutriscore_grade,nova_group,ecoscore_grade,"
    "additives_tags,allergens_tags,ingredients_text,ingredients_tags"
)

BEAUTY_FIELDS = "code,product_name,brands,ingredients_text,ingredients_tags,labels_tags"

_barcode_cache: dict[str, tuple[float, BarcodeToolResult]] = {}
_search_cache: dict[str, tuple[float, SearchToolResult]] = {}
T = TypeVar("T")


def _base_url(domain: str) -> str:
    if domain == "beauty":
        return "https://world.openbeautyfacts.org"
    return "https://world.openfoodfacts.org"


def _cache_get(cache: dict[str, tuple[float, T]], key: str) -> T | None:
    cached = cache.get(key)
    if not cached:
        return None
    expires_at, value = cached
    if expires_at < time.time():
        cache.pop(key, None)
        return None
    return value


def _cache_set(cache: dict[str, tuple[float, T]], key: str, value: T) -> None:
    cache[key] = (time.time() + settings.cache_ttl_seconds, value)


async def get_product_by_barcode(
    barcode: str,
    domain: str,
    locale_country: str,
    locale_language: str,
) -> BarcodeToolResult:
    barcode = barcode.strip()
    if not barcode:
        return BarcodeToolResult(found=False)

    cache_key = f"{domain}:{locale_country}:{locale_language}:{barcode}"
    cached = _cache_get(_barcode_cache, cache_key)
    if cached is not None:
        return cached

    fields = BEAUTY_FIELDS if domain == "beauty" else FOOD_FIELDS
    url = f"{_base_url(domain)}/api/v2/product/{barcode}.json"
    params = {"cc": locale_country, "lc": locale_language, "fields": fields}
    headers = {"User-Agent": settings.off_user_agent}

    try:
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()
            payload = response.json()
    except Exception:
        return BarcodeToolResult(found=False)

    status = payload.get("status")
    product = payload.get("product") or {}
    if status != 1 or not product:
        return BarcodeToolResult(found=False)

    name = product.get("product_name") or product.get("product_name_de") or barcode
    result = BarcodeToolResult(
        found=True,
        product_id=barcode,
        canonical_name=name,
        confidence=0.95,
        raw_payload_ref=product,
    )
    _cache_set(_barcode_cache, cache_key, result)
    return result


async def search_product_catalog(
    query_text: str,
    domain: str,
    locale_country: str,
    locale_language: str,
    max_results: int = 5,
) -> SearchToolResult:
    query_text = (query_text or "").strip()
    if not query_text:
        return SearchToolResult(candidates=[], selected_candidate=None)

    cache_key = f"{domain}:{locale_country}:{locale_language}:{max_results}:{query_text.lower()}"
    cached = _cache_get(_search_cache, cache_key)
    if cached is not None:
        return cached

    fields = BEAUTY_FIELDS if domain == "beauty" else FOOD_FIELDS
    url = f"{_base_url(domain)}/cgi/search.pl"
    params: dict[str, Any] = {
        "search_terms": query_text,
        "search_simple": 1,
        "action": "process",
        "json": 1,
        "cc": locale_country,
        "lc": locale_language,
        "page_size": max_results,
        "fields": fields,
    }
    headers = {"User-Agent": settings.off_user_agent}

    products: list[dict[str, Any]] = []
    try:
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()
            payload = response.json()
            products = payload.get("products") or []
    except Exception:
        products = []

    candidates: list[SearchCandidate] = []
    for index, product in enumerate(products[:max_results]):
        pid = str(product.get("code") or f"candidate-{index}")
        name = product.get("product_name") or product.get("product_name_de") or "Unknown product"
        confidence = max(0.35, 0.82 - (index * 0.09))
        candidates.append(SearchCandidate(id=pid, name=name, confidence=confidence))

    selected = candidates[0] if candidates else None
    result = SearchToolResult(candidates=candidates, selected_candidate=selected)
    _cache_set(_search_cache, cache_key, result)
    return result
