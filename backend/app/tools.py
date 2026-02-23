from __future__ import annotations

from typing import Any
import httpx

from .config import settings
from .models import BarcodeToolResult, SearchCandidate, SearchToolResult

FOOD_FIELDS = (
    "code,product_name,brands,nutriments,nutriscore_grade,nova_group,ecoscore_grade,"
    "additives_tags,allergens_tags,ingredients_text,ingredients_tags"
)

BEAUTY_FIELDS = "code,product_name,brands,ingredients_text,ingredients_tags,labels_tags"


def _base_url(domain: str) -> str:
    if domain == "beauty":
        return "https://world.openbeautyfacts.org"
    return "https://world.openfoodfacts.org"


async def get_product_by_barcode(
    barcode: str,
    domain: str,
    locale_country: str,
    locale_language: str,
) -> BarcodeToolResult:
    barcode = barcode.strip()
    if not barcode:
        return BarcodeToolResult(found=False)

    fields = BEAUTY_FIELDS if domain == "beauty" else FOOD_FIELDS
    url = f"{_base_url(domain)}/api/v2/product/{barcode}.json"
    params = {"cc": locale_country, "lc": locale_language, "fields": fields}

    try:
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            payload = response.json()
    except Exception:
        return BarcodeToolResult(found=False)

    status = payload.get("status")
    product = payload.get("product") or {}
    if status != 1 or not product:
        return BarcodeToolResult(found=False)

    name = product.get("product_name") or product.get("product_name_de") or barcode
    return BarcodeToolResult(
        found=True,
        product_id=barcode,
        canonical_name=name,
        confidence=0.95,
        raw_payload_ref=product,
    )


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

    products: list[dict[str, Any]] = []
    try:
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            response = await client.get(url, params=params)
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
    return SearchToolResult(candidates=candidates, selected_candidate=selected)
