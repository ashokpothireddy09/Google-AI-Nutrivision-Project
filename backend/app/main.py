from __future__ import annotations

import base64
import logging
import re
import uuid
from datetime import date
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .models import HudUpdateEvent, ProductIdentity, SearchCandidate, SimpleEvent, SpeechEvent
from .scoring import evaluate_ingredients_regulatory, normalize_and_score
from .tools import get_product_by_barcode, search_product_catalog

try:
    from google import genai
except Exception:  # pragma: no cover - optional runtime dependency branch
    genai = None

logger = logging.getLogger("nutrivision")
logging.basicConfig(level=settings.log_level)

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


def _extract_barcode(text: str) -> str | None:
    match = re.search(r"\b\d{8,14}\b", text)
    return match.group(0) if match else None


async def _gemini_refine_text(default_text: str, language: str) -> str:
    if genai is None:
        return default_text

    try:
        if settings.gemini_use_vertex:
            if not settings.gcp_project_id:
                return default_text
            client = genai.Client(
                vertexai=True,
                project=settings.gcp_project_id,
                location=settings.gcp_location,
            )
        else:
            if not settings.gemini_api_key:
                return default_text
            client = genai.Client(api_key=settings.gemini_api_key)
        instruction = (
            "Rewrite this shopping verdict in exactly 2 concise sentences, conservative legal tone, no medical advice. "
            f"Language: {'German' if language == 'de' else 'English'}. Text: {default_text}"
        )
        response = client.models.generate_content(model=settings.gemini_model, contents=instruction)
        text = (getattr(response, "text", "") or "").strip()
        return text or default_text
    except Exception:
        logger.exception("Gemini refinement failed; using deterministic text")
        return default_text


def _pick_language(language: str, de_text: str, en_text: str) -> str:
    return de_text if language == "de" else en_text


def _sanitize_preview(image_b64: str | None) -> bool:
    if not image_b64:
        return False
    try:
        payload = image_b64.split(",", 1)[-1]
        base64.b64decode(payload, validate=False)
        return True
    except Exception:
        return False


def _extract_any_date(text: str) -> date | None:
    patterns = [
        r"\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b",
        r"\b(20\d{2})[./-](\d{1,2})[./-](\d{1,2})\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if not match:
            continue
        parts = [int(item) for item in match.groups()]
        try:
            if len(str(parts[0])) == 4:
                year, month, day = parts
            else:
                day, month, year = parts
                if year < 100:
                    year += 2000
            return date(year, month, day)
        except ValueError:
            continue
    return None


def _expiry_guidance_from_text(text: str, language: str) -> str | None:
    normalized = text.lower().strip()
    if not normalized:
        return None

    is_mhd = any(key in normalized for key in ["mindestens haltbar", "mhd", "best before"])
    is_use_by = any(key in normalized for key in ["zu verbrauchen", "verbrauchsdatum", "use by"])
    if not (is_mhd or is_use_by):
        return None

    parsed_date = _extract_any_date(normalized)
    if not parsed_date:
        return (
            "Bitte nenne das Datum im Format TT.MM.JJJJ, dann erklaere ich MHD vs Verbrauchsdatum."
            if language == "de"
            else "Please provide the date in DD.MM.YYYY format and I will explain best-before vs use-by."
        )

    today = date.today()
    if is_use_by:
        if parsed_date < today:
            return (
                "Verbrauchsdatum ueberschritten: bitte aus Sicherheitsgruenden nicht mehr verwenden."
                if language == "de"
                else "Use-by date has passed: for safety, do not consume it."
            )
        return (
            "Verbrauchsdatum noch gueltig. Nach Ablauf bitte entsorgen."
            if language == "de"
            else "Use-by date is still valid. Discard after that date."
        )

    if parsed_date < today:
        return (
            "MHD ueberschritten: Aussehen, Geruch und Geschmack pruefen; bei Auffaelligkeiten entsorgen."
            if language == "de"
            else "Best-before date passed: check appearance, smell, and taste; discard if anything seems off."
        )
    return (
        "MHD noch gueltig. Nach Ablauf zuerst sensorisch pruefen."
        if language == "de"
        else "Best-before date is still valid. After that date, do a sensory check first."
    )


def _build_disambiguation(
    *,
    candidates: list[SearchCandidate],
    language: str,
) -> tuple[str, list[dict[str, Any]]] | None:
    if len(candidates) < 2:
        return None

    if (candidates[0].confidence - candidates[1].confidence) >= 0.08:
        return None

    top = candidates[:2]
    options_text = (" oder " if language == "de" else " or ").join(candidate.name for candidate in top)
    text = (
        f"Mehrere Treffer sind nah beieinander: {options_text}. Welches Produkt meinst du?"
        if language == "de"
        else f"Multiple close matches found: {options_text}. Which product do you mean?"
    )
    return text, [candidate.model_dump() for candidate in top]


async def _send_simple(
    websocket: WebSocket,
    *,
    session_id: str,
    turn_id: str | None,
    event_type: str,
    message: str,
    details: dict[str, Any] | None = None,
) -> None:
    event = SimpleEvent(
        event_type=event_type,
        session_id=session_id,
        turn_id=turn_id,
        message=message,
        details=details,
    )
    await websocket.send_json(event.model_dump())


@app.websocket("/ws/live")
async def live_session(websocket: WebSocket) -> None:
    await websocket.accept()
    session_id = f"S-{uuid.uuid4().hex[:8]}"
    turn_counter = 0
    domain = "food"
    language = "de"

    await _send_simple(
        websocket,
        session_id=session_id,
        turn_id=None,
        event_type="session_state",
        message="WebSocket connected",
    )

    try:
        while True:
            incoming = await websocket.receive_json()
            msg_type = incoming.get("type")

            if msg_type == "session_start":
                domain = incoming.get("domain", "food")
                language = incoming.get("language", "de")
                await _send_simple(
                    websocket,
                    session_id=session_id,
                    turn_id=None,
                    event_type="session_state",
                    message="Live session started",
                    details={"domain": domain, "language": language},
                )
                continue

            if msg_type == "frame":
                if _sanitize_preview(incoming.get("image_b64")):
                    await _send_simple(
                        websocket,
                        session_id=session_id,
                        turn_id=None,
                        event_type="tool_call",
                        message="Frame received for recognition pipeline",
                    )
                continue

            if msg_type == "audio_chunk":
                _sanitize_preview(incoming.get("audio_b64"))
                continue

            if msg_type == "barge_in":
                await _send_simple(
                    websocket,
                    session_id=session_id,
                    turn_id=None,
                    event_type="barge_ack",
                    message="Barge-in acknowledged; current response interrupted",
                )
                continue

            if msg_type == "session_end":
                await _send_simple(
                    websocket,
                    session_id=session_id,
                    turn_id=None,
                    event_type="session_state",
                    message="Live session stopped",
                )
                await websocket.close(code=1000)
                return

            if msg_type != "user_query":
                await _send_simple(
                    websocket,
                    session_id=session_id,
                    turn_id=None,
                    event_type="error",
                    message=f"Unsupported message type: {msg_type}",
                )
                continue

            turn_counter += 1
            turn_id = f"T-{turn_counter:03d}"
            query_text = str(incoming.get("text") or "").strip()
            barcode = str(incoming.get("barcode") or "").strip() or _extract_barcode(query_text)
            expiry_guidance = _expiry_guidance_from_text(query_text, language)
            if expiry_guidance and not barcode:
                speech = SpeechEvent(
                    session_id=session_id,
                    turn_id=turn_id,
                    text=expiry_guidance,
                    language="de" if language == "de" else "en",
                )
                await websocket.send_json(speech.model_dump())
                await _send_simple(
                    websocket,
                    session_id=session_id,
                    turn_id=turn_id,
                    event_type="session_state",
                    message="Expiration guidance returned",
                )
                continue

            await _send_simple(
                websocket,
                session_id=session_id,
                turn_id=turn_id,
                event_type="tool_call",
                message="Recognition orchestrator started",
                details={"mode": "barcode_first"},
            )

            product_payload: dict[str, Any] = {}
            identity = ProductIdentity(id="unknown", name="Unknown product", brand="Unknown brand")
            confidence = 0.45

            if barcode:
                barcode_result = await get_product_by_barcode(
                    barcode=barcode,
                    domain=domain,
                    locale_country=settings.locale_country,
                    locale_language=settings.locale_language,
                )
                if barcode_result.found and barcode_result.raw_payload_ref:
                    product_payload = barcode_result.raw_payload_ref
                    identity = ProductIdentity(
                        id=barcode_result.product_id or barcode,
                        name=barcode_result.canonical_name or "Unknown product",
                        brand=(barcode_result.raw_payload_ref.get("brands") or "Unknown brand"),
                    )
                    confidence = barcode_result.confidence

            if not product_payload:
                await _send_simple(
                    websocket,
                    session_id=session_id,
                    turn_id=turn_id,
                    event_type="tool_call",
                    message="Barcode miss, running catalog fallback search",
                )
                search_result = await search_product_catalog(
                    query_text=query_text,
                    domain=domain,
                    locale_country=settings.locale_country,
                    locale_language=settings.locale_language,
                    max_results=5,
                )

                if search_result.selected_candidate:
                    disambiguation = _build_disambiguation(candidates=search_result.candidates, language=language)
                    if disambiguation:
                        disambiguation_text, candidates_payload = disambiguation
                        await _send_simple(
                            websocket,
                            session_id=session_id,
                            turn_id=turn_id,
                            event_type="uncertain_match",
                            message=disambiguation_text,
                            details={"candidates": candidates_payload},
                        )
                        continue

                    chosen: SearchCandidate = search_result.selected_candidate
                    identity = ProductIdentity(id=chosen.id, name=chosen.name, brand="Catalog match")
                    confidence = chosen.confidence

                    barcode_retry = await get_product_by_barcode(
                        barcode=chosen.id,
                        domain=domain,
                        locale_country=settings.locale_country,
                        locale_language=settings.locale_language,
                    )
                    if barcode_retry.found and barcode_retry.raw_payload_ref:
                        product_payload = barcode_retry.raw_payload_ref
                    else:
                        product_payload = {
                            "code": chosen.id,
                            "product_name": chosen.name,
                            "brands": "Catalog match",
                            "ingredients_text": "",
                            "additives_tags": [],
                            "ingredients_tags": [],
                        }
                else:
                    uncertain_text = "Keine eindeutige Produktzuordnung" if language == "de" else "No clear product match"
                    await _send_simple(
                        websocket,
                        session_id=session_id,
                        turn_id=turn_id,
                        event_type="uncertain_match",
                        message=uncertain_text,
                    )
                    continue

            additives = product_payload.get("additives_tags") or []
            ingredients_tags = product_payload.get("ingredients_tags") or []
            ingredients_text = product_payload.get("ingredients_text") or ""
            ingredient_tokens = list(additives) + list(ingredients_tags)
            if ingredients_text:
                ingredient_tokens.extend([token.strip() for token in ingredients_text.split(",") if token.strip()])

            policy_result = evaluate_ingredients_regulatory(
                domain=domain,
                ingredients_or_additives=ingredient_tokens,
                policy_version="v1",
            )
            normalized = normalize_and_score(product_payload=product_payload, policy_result=policy_result, domain=domain)

            spoken_text = _pick_language(language, normalized.spoken_summary_de, normalized.spoken_summary_en)
            spoken_text = await _gemini_refine_text(spoken_text, language=language)

            hud = HudUpdateEvent(
                session_id=session_id,
                turn_id=turn_id,
                domain=domain,
                policy_version=normalized.policy_version,
                product_identity=ProductIdentity(
                    id=identity.id,
                    name=product_payload.get("product_name") or identity.name,
                    brand=product_payload.get("brands") or identity.brand,
                ),
                grade_or_tier=normalized.grade_or_tier,
                warnings=normalized.warnings,
                metrics=normalized.metrics,
                confidence=max(confidence, normalized.confidence),
                data_sources=normalized.data_sources,
                explanation_bullets=normalized.explanation_bullets,
            )
            await websocket.send_json(hud.model_dump())

            speech = SpeechEvent(
                session_id=session_id,
                turn_id=turn_id,
                text=spoken_text,
                language="de" if language == "de" else "en",
            )
            await websocket.send_json(speech.model_dump())

            await _send_simple(
                websocket,
                session_id=session_id,
                turn_id=turn_id,
                event_type="session_state",
                message="Turn complete",
            )

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected: %s", session_id)
    except Exception:
        logger.exception("Unhandled websocket session error")
        try:
            await _send_simple(
                websocket,
                session_id=session_id,
                turn_id=None,
                event_type="error",
                message="Unhandled backend error",
            )
        except Exception:
            pass
