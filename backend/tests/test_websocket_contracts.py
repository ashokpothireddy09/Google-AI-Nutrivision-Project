from __future__ import annotations

import asyncio

from fastapi import WebSocketDisconnect
import pytest

import app.main as main_module
from app.models import BarcodeToolResult, SearchCandidate, SearchToolResult


class _MockWebSocket:
    def __init__(self, incoming: list[dict]):
        self._incoming = list(incoming)
        self.accepted = False
        self.closed = False
        self.close_code: int | None = None
        self.sent: list[dict] = []

    async def accept(self) -> None:
        self.accepted = True

    async def receive_json(self) -> dict:
        if self._incoming:
            return self._incoming.pop(0)
        raise WebSocketDisconnect(code=1000)

    async def send_json(self, payload: dict) -> None:
        self.sent.append(payload)

    async def close(self, code: int = 1000) -> None:
        self.closed = True
        self.close_code = code


def _run(coro):
    return asyncio.run(coro)


def _events_by_type(events: list[dict], event_type: str) -> list[dict]:
    return [event for event in events if event.get("event_type") == event_type]


@pytest.fixture(autouse=True)
def _stub_model_speech(monkeypatch):
    async def fake_send_model_speech(
        websocket,
        *,
        session_id: str,
        turn_id: str,
        language: str,
        domain: str,
        prompt_text: str,
        latest_frame=None,
        latest_audio=None,
        user_query=None,
    ) -> str:
        await main_module._send_speech(
            websocket,
            session_id=session_id,
            turn_id=turn_id,
            text=prompt_text,
            language=language,
        )
        return prompt_text

    monkeypatch.setattr(main_module, "_send_model_speech", fake_send_model_speech)


def test_websocket_barcode_flow_emits_hud_text_and_audio(monkeypatch) -> None:
    async def fake_get_product_by_barcode(*, barcode: str, domain: str, locale_country: str, locale_language: str):
        return BarcodeToolResult(
            found=True,
            product_id=barcode,
            canonical_name="BiFi Original XXL",
            confidence=0.96,
            raw_payload_ref={
                "code": barcode,
                "product_name": "BiFi Original XXL",
                "brands": "BiFi",
                "nutriments": {
                    "sugars_100g": 0.9,
                    "salt_100g": 2.1,
                    "saturated-fat_100g": 6.2,
                    "proteins_100g": 18.0,
                },
                "ingredients_text": "pork, salt, nitrite",
                "additives_tags": ["en:e250"],
                "ingredients_tags": ["en:pork"],
            },
        )

    async def fake_search_product_catalog(*args, **kwargs):
        return SearchToolResult(candidates=[], selected_candidate=None)

    async def fake_refine_text(**kwargs):
        pcm_bytes = b"\x00\x00" * 480
        return main_module.GeminiLiveResult(
            text="Kurze Modellantwort.",
            audio_chunks=[("audio/pcm;rate=24000", pcm_bytes)],
        )

    monkeypatch.setattr(main_module, "get_product_by_barcode", fake_get_product_by_barcode)
    monkeypatch.setattr(main_module, "search_product_catalog", fake_search_product_catalog)
    monkeypatch.setattr(main_module, "_gemini_live_refine_text", fake_refine_text)

    websocket = _MockWebSocket(
        incoming=[
            {"type": "session_start", "domain": "food", "language": "de"},
            {"type": "user_query", "text": "", "barcode": "4251097401447", "domain": "food"},
        ]
    )

    _run(main_module.live_session(websocket))

    assert websocket.accepted is True

    event_types = [event.get("event_type") for event in websocket.sent]
    assert "session_state" in event_types
    assert "tool_call" in event_types
    assert "hud_update" in event_types
    assert "speech_text" in event_types
    assert "speech_audio" in event_types

    hud_event = _events_by_type(websocket.sent, "hud_update")[0]
    assert hud_event["product_identity"]["name"] == "BiFi Original XXL"
    assert len(hud_event["metrics"]) == 4
    assert 0 <= hud_event["confidence"] <= 1

    speech_audio_event = _events_by_type(websocket.sent, "speech_audio")[0]
    assert speech_audio_event["mime_type"].startswith("audio/")
    assert speech_audio_event["audio_b64"].startswith(f"data:{speech_audio_event['mime_type']};base64,")

    completion_events = [
        event
        for event in _events_by_type(websocket.sent, "session_state")
        if event.get("message") == "Turn complete"
    ]
    assert len(completion_events) == 1


def test_websocket_fallback_flow_emits_uncertain_match(monkeypatch) -> None:
    async def fake_get_product_by_barcode(*args, **kwargs):
        return BarcodeToolResult(found=False)

    async def fake_search_product_catalog(*args, **kwargs):
        candidates = [
            SearchCandidate(id="111", name="Bio Muesli", confidence=0.74),
            SearchCandidate(id="222", name="Bio Haferflocken", confidence=0.70),
        ]
        return SearchToolResult(candidates=candidates, selected_candidate=candidates[0])

    async def fake_refine_text(**kwargs):
        return main_module.GeminiLiveResult(text="unused", audio_chunks=[])

    monkeypatch.setattr(main_module, "get_product_by_barcode", fake_get_product_by_barcode)
    monkeypatch.setattr(main_module, "search_product_catalog", fake_search_product_catalog)
    monkeypatch.setattr(main_module, "_gemini_live_refine_text", fake_refine_text)

    websocket = _MockWebSocket(
        incoming=[
            {"type": "session_start", "domain": "food", "language": "de"},
            {"type": "user_query", "text": "bio", "barcode": "", "domain": "food"},
        ]
    )

    _run(main_module.live_session(websocket))

    uncertain_events = _events_by_type(websocket.sent, "uncertain_match")
    assert len(uncertain_events) == 1
    uncertain = uncertain_events[0]
    assert len(uncertain["details"]["candidates"]) == 2
    assert uncertain["details"]["candidates"][0]["name"] == "Bio Muesli"
    speech_events = _events_by_type(websocket.sent, "speech_text")
    assert any("Treffer" in event["text"] for event in speech_events)


def test_websocket_empty_turn_emits_spoken_uncertainty(monkeypatch) -> None:
    async def fake_infer_query_from_frame(*args, **kwargs):
        return None

    async def fake_get_product_by_barcode(*args, **kwargs):
        raise AssertionError("Barcode lookup must not run for empty turn without inferred hint")

    async def fake_search_product_catalog(*args, **kwargs):
        raise AssertionError("Fallback search must not run for empty turn without inferred hint")

    monkeypatch.setattr(main_module, "_infer_query_from_frame", fake_infer_query_from_frame)
    monkeypatch.setattr(main_module, "get_product_by_barcode", fake_get_product_by_barcode)
    monkeypatch.setattr(main_module, "search_product_catalog", fake_search_product_catalog)

    websocket = _MockWebSocket(
        incoming=[
            {"type": "session_start", "domain": "food", "language": "en"},
            {"type": "user_query", "text": "", "barcode": "", "domain": "food"},
        ]
    )

    _run(main_module.live_session(websocket))

    uncertain_events = _events_by_type(websocket.sent, "uncertain_match")
    speech_events = _events_by_type(websocket.sent, "speech_text")
    assert len(uncertain_events) == 1
    assert len(speech_events) >= 1
    assert "identify the product" in uncertain_events[0]["message"].lower()
    assert any("identify the product" in event["text"].lower() for event in speech_events)


def test_websocket_frame_hint_drives_fallback_search(monkeypatch) -> None:
    captured_query: dict[str, str] = {}

    async def fake_infer_query_from_frame(*, latest_frame, domain: str, language: str):
        assert latest_frame is not None
        assert domain == "food"
        return "lays classic"

    async def fake_get_product_by_barcode(*args, **kwargs):
        return BarcodeToolResult(found=False)

    async def fake_search_product_catalog(*, query_text: str, **kwargs):
        captured_query["query_text"] = query_text
        candidate = SearchCandidate(id="9999999999999", name="Lay's Classic Chips", confidence=0.78)
        return SearchToolResult(candidates=[candidate], selected_candidate=candidate)

    async def fake_refine_text(**kwargs):
        return main_module.GeminiLiveResult(text="Model fallback verdict.", audio_chunks=[])

    monkeypatch.setattr(main_module, "_infer_query_from_frame", fake_infer_query_from_frame)
    monkeypatch.setattr(main_module, "get_product_by_barcode", fake_get_product_by_barcode)
    monkeypatch.setattr(main_module, "search_product_catalog", fake_search_product_catalog)
    monkeypatch.setattr(main_module, "_gemini_live_refine_text", fake_refine_text)

    websocket = _MockWebSocket(
        incoming=[
            {"type": "session_start", "domain": "food", "language": "en"},
            {"type": "frame", "image_b64": "data:image/jpeg;base64,AAAA"},
            {"type": "user_query", "text": "", "barcode": "", "domain": "food"},
        ]
    )

    _run(main_module.live_session(websocket))

    assert captured_query.get("query_text") == "lays classic chips"
    assert len(_events_by_type(websocket.sent, "hud_update")) == 1
    assert any(
        "Model fallback verdict." in event["text"]
        for event in _events_by_type(websocket.sent, "speech_text")
    )


def test_websocket_low_signal_query_uses_frame_hint(monkeypatch) -> None:
    captured_query: dict[str, str] = {}

    async def fake_infer_query_from_frame(*, latest_frame, domain: str, language: str):
        assert latest_frame is not None
        return "Lay's Classic"

    async def fake_get_product_by_barcode(*args, **kwargs):
        return BarcodeToolResult(found=False)

    async def fake_search_product_catalog(*, query_text: str, **kwargs):
        captured_query["query_text"] = query_text
        candidate = SearchCandidate(id="9999999999999", name="Lay's Classic Chips", confidence=0.78)
        return SearchToolResult(candidates=[candidate], selected_candidate=candidate)

    async def fake_refine_text(**kwargs):
        return main_module.GeminiLiveResult(text="Model fallback verdict.", audio_chunks=[])

    monkeypatch.setattr(main_module, "_infer_query_from_frame", fake_infer_query_from_frame)
    monkeypatch.setattr(main_module, "get_product_by_barcode", fake_get_product_by_barcode)
    monkeypatch.setattr(main_module, "search_product_catalog", fake_search_product_catalog)
    monkeypatch.setattr(main_module, "_gemini_live_refine_text", fake_refine_text)

    websocket = _MockWebSocket(
        incoming=[
            {"type": "session_start", "domain": "food", "language": "en"},
            {"type": "frame", "image_b64": "data:image/jpeg;base64,AAAA"},
            {"type": "user_query", "text": "hello", "barcode": "", "domain": "food"},
        ]
    )

    _run(main_module.live_session(websocket))

    assert captured_query.get("query_text") == "lays classic chips"


def test_websocket_voice_noise_query_uses_frame_hint(monkeypatch) -> None:
    captured_query: dict[str, str] = {}

    async def fake_infer_query_from_frame(*, latest_frame, domain: str, language: str):
        assert latest_frame is not None
        return "Lay's Classic"

    async def fake_get_product_by_barcode(*args, **kwargs):
        return BarcodeToolResult(found=False)

    async def fake_search_product_catalog(*, query_text: str, **kwargs):
        captured_query["query_text"] = query_text
        candidate = SearchCandidate(id="9999999999999", name="Lay's Classic Chips", confidence=0.78)
        return SearchToolResult(candidates=[candidate], selected_candidate=candidate)

    async def fake_refine_text(**kwargs):
        return main_module.GeminiLiveResult(text="Model fallback verdict.", audio_chunks=[])

    monkeypatch.setattr(main_module, "_infer_query_from_frame", fake_infer_query_from_frame)
    monkeypatch.setattr(main_module, "get_product_by_barcode", fake_get_product_by_barcode)
    monkeypatch.setattr(main_module, "search_product_catalog", fake_search_product_catalog)
    monkeypatch.setattr(main_module, "_gemini_live_refine_text", fake_refine_text)

    websocket = _MockWebSocket(
        incoming=[
            {"type": "session_start", "domain": "food", "language": "en"},
            {"type": "frame", "image_b64": "data:image/jpeg;base64,AAAA"},
            {"type": "user_query", "text": "Maori showing you", "barcode": "", "domain": "food", "source": "voice"},
        ]
    )

    _run(main_module.live_session(websocket))

    assert captured_query.get("query_text") == "lays classic chips"
    tool_events = _events_by_type(websocket.sent, "tool_call")
    assert any("Voice query corrected by frame hint" in event["message"] for event in tool_events)


def test_websocket_voice_noise_without_frame_hint_skips_catalog_lookup(monkeypatch) -> None:
    async def fake_infer_query_from_frame(*, latest_frame, domain: str, language: str):
        assert latest_frame is not None
        return None

    async def fake_get_product_by_barcode(*args, **kwargs):
        raise AssertionError("Barcode lookup should not run for unresolved voice noise turn")

    async def fake_search_product_catalog(*args, **kwargs):
        raise AssertionError("Catalog lookup should not run for unresolved voice noise turn")

    monkeypatch.setattr(main_module, "_infer_query_from_frame", fake_infer_query_from_frame)
    monkeypatch.setattr(main_module, "get_product_by_barcode", fake_get_product_by_barcode)
    monkeypatch.setattr(main_module, "search_product_catalog", fake_search_product_catalog)

    websocket = _MockWebSocket(
        incoming=[
            {"type": "session_start", "domain": "food", "language": "en"},
            {"type": "frame", "image_b64": "data:image/jpeg;base64,AAAA"},
            {"type": "user_query", "text": "multi showing you the friend product packet", "barcode": "", "domain": "food"},
        ]
    )

    _run(main_module.live_session(websocket))

    session_events = _events_by_type(websocket.sent, "session_state")
    assert any("voice query unclear" in str(event.get("message", "")).lower() for event in session_events)
    assert len(_events_by_type(websocket.sent, "uncertain_match")) >= 1


def test_normalize_catalog_query_filters_agent_echo_text() -> None:
    echo_text = "I cannot determine a specific product match from your query."
    assert main_module._normalize_catalog_query(echo_text) == ""


def test_normalize_catalog_query_maps_lays_variants() -> None:
    assert main_module._normalize_catalog_query("lay chips classic") == "lays classic chips"
    assert main_module._normalize_catalog_query("its lace packet") == "lays classic chips"


def test_websocket_social_greeting_emits_conversational_reply(monkeypatch) -> None:
    async def fake_get_product_by_barcode(*args, **kwargs):
        raise AssertionError("Barcode lookup should not run for greeting turns")

    async def fake_search_product_catalog(*args, **kwargs):
        raise AssertionError("Catalog lookup should not run for greeting turns")

    monkeypatch.setattr(main_module, "get_product_by_barcode", fake_get_product_by_barcode)
    monkeypatch.setattr(main_module, "search_product_catalog", fake_search_product_catalog)

    websocket = _MockWebSocket(
        incoming=[
            {"type": "session_start", "domain": "food", "language": "en"},
            {"type": "user_query", "text": "good morning", "barcode": "", "domain": "food"},
        ]
    )

    _run(main_module.live_session(websocket))

    speech_events = _events_by_type(websocket.sent, "speech_text")
    assert any("show me the product" in event["text"].lower() for event in speech_events)
    assert len(_events_by_type(websocket.sent, "uncertain_match")) == 0
    assert len(_events_by_type(websocket.sent, "tool_call")) == 0


def test_websocket_social_identity_emits_agent_intro(monkeypatch) -> None:
    async def fake_get_product_by_barcode(*args, **kwargs):
        raise AssertionError("Barcode lookup should not run for identity turns")

    async def fake_search_product_catalog(*args, **kwargs):
        raise AssertionError("Catalog lookup should not run for identity turns")

    monkeypatch.setattr(main_module, "get_product_by_barcode", fake_get_product_by_barcode)
    monkeypatch.setattr(main_module, "search_product_catalog", fake_search_product_catalog)

    websocket = _MockWebSocket(
        incoming=[
            {"type": "session_start", "domain": "food", "language": "en"},
            {"type": "user_query", "text": "who are you", "barcode": "", "domain": "food"},
        ]
    )

    _run(main_module.live_session(websocket))

    speech_events = _events_by_type(websocket.sent, "speech_text")
    assert any("nutrition agent" in event["text"].lower() for event in speech_events)
    assert len(_events_by_type(websocket.sent, "uncertain_match")) == 0
    assert len(_events_by_type(websocket.sent, "tool_call")) == 0


def test_websocket_no_product_phrase_emits_structured_guidance(monkeypatch) -> None:
    async def fake_get_product_by_barcode(*args, **kwargs):
        raise AssertionError("Barcode lookup should not run for no-product guidance turns")

    async def fake_search_product_catalog(*args, **kwargs):
        raise AssertionError("Catalog lookup should not run for no-product guidance turns")

    monkeypatch.setattr(main_module, "get_product_by_barcode", fake_get_product_by_barcode)
    monkeypatch.setattr(main_module, "search_product_catalog", fake_search_product_catalog)

    websocket = _MockWebSocket(
        incoming=[
            {"type": "session_start", "domain": "food", "language": "en"},
            {"type": "user_query", "text": "I don't have it with me right now", "barcode": "", "domain": "food"},
        ]
    )

    _run(main_module.live_session(websocket))

    speech_events = _events_by_type(websocket.sent, "speech_text")
    assert any("word by word" in event["text"].lower() for event in speech_events)
    assert any("brand" in event["text"].lower() for event in speech_events)
    assert len(_events_by_type(websocket.sent, "uncertain_match")) == 0
    assert len(_events_by_type(websocket.sent, "tool_call")) == 0


def test_websocket_whole_food_fallback_emits_calorie_hud(monkeypatch) -> None:
    async def fake_get_product_by_barcode(*args, **kwargs):
        return BarcodeToolResult(found=False)

    async def fake_search_product_catalog(*args, **kwargs):
        raise AssertionError("Catalog search should be skipped for whole-food fallback")

    async def fake_refine_text(**kwargs):
        return main_module.GeminiLiveResult(
            text="Banana has around 89 kcal per 100 grams and is a good snack option.",
            audio_chunks=[],
        )

    monkeypatch.setattr(main_module, "get_product_by_barcode", fake_get_product_by_barcode)
    monkeypatch.setattr(main_module, "search_product_catalog", fake_search_product_catalog)
    monkeypatch.setattr(main_module, "_gemini_live_refine_text", fake_refine_text)

    websocket = _MockWebSocket(
        incoming=[
            {"type": "session_start", "domain": "food", "language": "en"},
            {"type": "user_query", "text": "banana", "barcode": "", "domain": "food"},
        ]
    )

    _run(main_module.live_session(websocket))

    hud_event = _events_by_type(websocket.sent, "hud_update")[0]
    assert hud_event["product_identity"]["name"] == "Banana"
    assert any("kcal/100g" in metric["value"] for metric in hud_event["metrics"])
    assert any(
        "89 kcal" in event["text"]
        for event in _events_by_type(websocket.sent, "speech_text")
    )


def test_websocket_requests_backside_when_nutrition_fields_missing(monkeypatch) -> None:
    captured_default_text: dict[str, str] = {}

    async def fake_get_product_by_barcode(*, barcode: str, domain: str, locale_country: str, locale_language: str):
        return BarcodeToolResult(
            found=True,
            product_id=barcode,
            canonical_name="Mystery Snack",
            confidence=0.9,
            raw_payload_ref={
                "code": barcode,
                "product_name": "Mystery Snack",
                "brands": "TestBrand",
                "nutriments": {},
                "ingredients_text": "",
                "additives_tags": [],
                "ingredients_tags": [],
            },
        )

    async def fake_search_product_catalog(*args, **kwargs):
        raise AssertionError("Catalog search should not run for found barcode")

    async def fake_refine_text(**kwargs):
        captured_default_text["value"] = kwargs["default_text"]
        return main_module.GeminiLiveResult(
            text="Please show the backside ingredients and nutrition table for a precise readout.",
            audio_chunks=[],
        )

    monkeypatch.setattr(main_module, "get_product_by_barcode", fake_get_product_by_barcode)
    monkeypatch.setattr(main_module, "search_product_catalog", fake_search_product_catalog)
    monkeypatch.setattr(main_module, "_gemini_live_refine_text", fake_refine_text)

    websocket = _MockWebSocket(
        incoming=[
            {"type": "session_start", "domain": "food", "language": "en"},
            {"type": "user_query", "text": "", "barcode": "12345678", "domain": "food"},
        ]
    )

    _run(main_module.live_session(websocket))

    assert "backside ingredients and nutrition table" in captured_default_text.get("value", "").lower()
    speech_events = _events_by_type(websocket.sent, "speech_text")
    assert any("backside ingredients" in event["text"].lower() for event in speech_events)


def test_websocket_unsupported_message_type_emits_error() -> None:
    websocket = _MockWebSocket(
        incoming=[
            {"type": "unsupported_message"},
        ]
    )

    _run(main_module.live_session(websocket))

    error_events = _events_by_type(websocket.sent, "error")
    assert len(error_events) == 1
    assert "unsupported" in error_events[0]["message"].lower()


def test_websocket_can_reconnect_after_session_end() -> None:
    first = _MockWebSocket(
        incoming=[
            {"type": "session_end"},
        ]
    )
    _run(main_module.live_session(first))

    second = _MockWebSocket(incoming=[])
    _run(main_module.live_session(second))

    first_state = _events_by_type(first.sent, "session_state")
    second_state = _events_by_type(second.sent, "session_state")

    assert any("stopped" in event.get("message", "").lower() for event in first_state)
    assert any("connected" in event.get("message", "").lower() for event in second_state)
