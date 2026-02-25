from __future__ import annotations

import asyncio
import base64
import io
import json
import logging
import os
import re
import time
import uuid
import wave
from dataclasses import dataclass
from datetime import date
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .models import HudUpdateEvent, MetricItem, ProductIdentity, SearchCandidate, SimpleEvent, SpeechAudioEvent, SpeechEvent, WarningItem
from .scoring import evaluate_ingredients_regulatory, normalize_and_score
from .tools import get_product_by_barcode, search_product_catalog

try:
    from google import genai
    from google.genai import types as genai_types
except Exception:  # pragma: no cover - optional runtime dependency branch
    genai = None
    genai_types = None

logger = logging.getLogger("nutrivision")
logging.basicConfig(level=settings.log_level)
_gemini_client_warning_emitted = False

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


def _warn_missing_live_client() -> None:
    global _gemini_client_warning_emitted
    if _gemini_client_warning_emitted:
        return
    _gemini_client_warning_emitted = True
    logger.warning(
        "Gemini Live client unavailable. Configure Vertex project credentials or GEMINI_API_KEY to enable native model voice."
    )


WHOLE_FOOD_PROFILES: tuple[dict[str, Any], ...] = (
    {
        "id": "fresh-apple",
        "name_en": "Apple",
        "name_de": "Apfel",
        "aliases": (
            "apple",
            "apples",
            "apfel",
            "aepfel",
            "appel",
            "red apple",
            "green apple",
            "fresh apple",
        ),
        "kcal_100g": 52,
        "carbs_g": 13.8,
        "fiber_g": 2.4,
        "sugar_g": 10.4,
        "protein_g": 0.3,
    },
    {
        "id": "fresh-banana",
        "name_en": "Banana",
        "name_de": "Banane",
        "aliases": ("banana", "bananas", "banane", "bananen"),
        "kcal_100g": 89,
        "carbs_g": 22.8,
        "fiber_g": 2.6,
        "sugar_g": 12.2,
        "protein_g": 1.1,
    },
    {
        "id": "fresh-orange",
        "name_en": "Orange",
        "name_de": "Orange",
        "aliases": ("orange", "oranges"),
        "kcal_100g": 47,
        "carbs_g": 11.8,
        "fiber_g": 2.4,
        "sugar_g": 9.4,
        "protein_g": 0.9,
    },
)

PACKAGED_HINT_TOKENS = {
    "chips",
    "packet",
    "pack",
    "drink",
    "cola",
    "cookie",
    "bar",
    "cereal",
    "yogurt",
    "chocolate",
    "snack",
    "bottle",
    "can",
}

AGENT_ECHO_MARKERS = (
    "i cannot determine a specific product",
    "i cannot find a specific product",
    "i can't find a specific product",
    "i cannot identify the product",
    "please bring the product",
    "please show the barcode",
    "please show the backside",
    "ich kann das produkt nicht",
    "zeige bitte die rueckseite",
    "bitte zeig die barcode",
)

QUERY_FILLER_TOKENS = {
    "hello",
    "hallo",
    "hi",
    "hey",
    "ok",
    "okay",
    "please",
    "bitte",
    "can",
    "could",
    "you",
    "ich",
    "bin",
    "the",
    "a",
    "an",
    "to",
    "for",
    "with",
    "your",
    "product",
    "camera",
    "packet",
    "pack",
    "package",
    "towards",
    "near",
    "show",
    "bring",
    "frage",
    "question",
    "nutrition",
    "agent",
    "ready",
    "help",
    "query",
}

LOW_SIGNAL_QUERY_TOKENS = {
    "product",
    "item",
    "this",
    "that",
    "thing",
    "food",
    "snack",
    "pack",
    "packet",
}

VOICE_NOISE_ACTION_TOKENS = {
    "show",
    "showing",
    "look",
    "looking",
    "see",
    "seeing",
    "camera",
    "packet",
    "product",
    "this",
    "that",
    "here",
    "you",
    "me",
    "it",
    "its",
    "please",
    "can",
    "could",
    "in",
    "front",
    "of",
    "is",
    "what",
    "towards",
    "near",
}

SOCIAL_GREETING_MARKERS = (
    "hello",
    "hallo",
    "hi",
    "hey",
    "good morning",
    "good afternoon",
    "good evening",
    "good day",
    "morning",
    "guten morgen",
    "guten tag",
    "guten abend",
    "servus",
)

SOCIAL_IDENTITY_MARKERS = (
    "who are you",
    "what are you",
    "what can you do",
    "who am i talking to",
    "introduce yourself",
    "wer bist du",
    "was bist du",
    "was kannst du",
    "wer spricht",
    "which country do you belong",
    "where are you from",
    "woher kommst du",
)

SOCIAL_CAMERA_MARKERS = (
    "what are you seeing",
    "what can you see",
    "do you see it",
    "can you see it",
    "what is it",
    "in front of me",
    "it is in front of me",
    "it's in front of me",
    "its in front of me",
    "can you see this",
    "do you see this",
    "what do you see",
    "was siehst du",
    "siehst du es",
)

NO_PRODUCT_MARKERS = (
    "i don't have it",
    "i don t have it",
    "i dont have it",
    "i do not have it",
    "i don't have the product",
    "i don t have the product",
    "not with me",
    "without the product",
    "cannot scan",
    "can't scan",
    "cant scan",
    "cannot show barcode",
    "can't show barcode",
    "barcode not visible",
    "habe es nicht",
    "nicht dabei",
    "kein produkt",
    "kann nicht scannen",
    "barcode nicht sichtbar",
)

SOCIAL_CONTEXT_TOKENS = {
    "hello",
    "hallo",
    "hi",
    "hey",
    "good",
    "morning",
    "afternoon",
    "evening",
    "who",
    "are",
    "you",
    "what",
    "can",
    "do",
    "wer",
    "bist",
    "was",
    "kannst",
    "du",
}

PRODUCT_CONTEXT_TOKENS = {
    "product",
    "produkt",
    "barcode",
    "scan",
    "camera",
    "analyse",
    "analyze",
    "nutrition",
    "ingredients",
    "zutaten",
    "naehrwert",
    "carbs",
    "fat",
    "sugar",
    "protein",
}


def _normalized_words(text: str) -> list[str]:
    lowered = re.sub(r"[^a-z0-9 ]", " ", text.lower())
    return [token for token in re.split(r"\s+", lowered) if token]


def _lookup_whole_food_profile(query_text: str) -> dict[str, Any] | None:
    words = _normalized_words(query_text)
    if not words:
        return None
    if any(token in PACKAGED_HINT_TOKENS for token in words):
        return None
    if len(words) > 8:
        return None

    search_text = f" {' '.join(words)} "
    for profile in WHOLE_FOOD_PROFILES:
        aliases = profile.get("aliases", ())
        for alias in aliases:
            if f" {alias} " in search_text:
                return profile
    return None


def _looks_like_agent_echo(text: str) -> bool:
    normalized = re.sub(r"\s+", " ", (text or "").strip().lower())
    if not normalized:
        return False
    if any(marker in normalized for marker in AGENT_ECHO_MARKERS):
        return True
    words = normalized.split()
    if (
        len(words) >= 10
        and "product" in words
        and ("please" in words or "cannot" in words or "query" in words)
    ):
        return True
    return False


def _looks_like_lays_query(lowered_text: str) -> bool:
    normalized = (lowered_text or "").replace("lay’s", "lay's")
    if "lay's" in normalized or "lays" in normalized:
        return True

    words = set(_normalized_words(normalized))
    if "lays" in words:
        return True
    if "lay" in words and "chips" in words:
        return True
    if "lace" in words and ("chips" in words or "packet" in words or "pack" in words):
        return True
    if "leis" in words and ("chips" in words or "packet" in words or "pack" in words):
        return True
    if "chips" in words and ("classic" in words or "yellow" in words):
        return True
    return False


def _classify_social_intent(raw_text: str) -> str | None:
    words = _normalized_words(raw_text)
    if not words:
        return None

    normalized = " ".join(words)
    if _extract_barcode(normalized):
        return None

    if any(marker in normalized for marker in SOCIAL_CAMERA_MARKERS):
        return "camera_check"
    if any(marker in normalized for marker in NO_PRODUCT_MARKERS):
        return "no_product"
    if any(marker in normalized for marker in SOCIAL_IDENTITY_MARKERS):
        return "identity"
    if any(marker in normalized for marker in SOCIAL_GREETING_MARKERS):
        if normalized in {"hello", "hallo", "hi", "hey"}:
            return None
        return "greeting"

    word_set = set(words)
    if len(words) >= 2 and word_set.issubset(SOCIAL_CONTEXT_TOKENS):
        return "greeting"
    if word_set & PRODUCT_CONTEXT_TOKENS:
        return None
    if _lookup_whole_food_profile(normalized):
        return None
    return None


def _social_prompt(language: str, intent: str) -> str:
    if intent == "camera_check":
        return _pick_language(
            language,
            "Ich sehe das Livebild, aber das Produkt ist noch nicht eindeutig. Bitte halte die Vorderseite ruhig ins Licht und danach den Barcode oder die Rueckseite mit Zutaten und Naehrwerten.",
            "I can see the live camera feed, but the product is not clear yet. Please hold the front label steady in good light, then show the barcode or the backside ingredients and nutrition table.",
        )
    if intent == "no_product":
        return _pick_language(
            language,
            "Kein Problem. Nenne mir bitte den Produktnamen Wort fuer Wort und die Marke. Wenn moeglich, sag auch die Werte pro 100 Gramm fuer Kohlenhydrate, Fett, Zucker und Eiweiss; alternativ kannst du spaeter Foto oder Barcode senden.",
            "No problem. Please tell me the product name word by word and the brand. If possible, also share per-100g carbs, fat, sugar, and protein; you can also send a photo or barcode later.",
        )
    if intent == "identity":
        return _pick_language(
            language,
            "Ich bin NutriVision, dein Live-Nutrition-Agent. Ich erkenne Produkte per Kamera und gebe kurze, datenbasierte Hinweise zu Zutaten, Naehrwerten und Warnungen.",
            "I am NutriVision, your live nutrition agent. I identify products from the camera and give short, data-grounded guidance on ingredients, nutrition values, and warnings.",
        )
    return _pick_language(
        language,
        "Guten Tag. Ich bin bereit. Zeig mir einfach das Produkt oder nenne den Namen, dann starte ich die Analyse sofort.",
        "Good morning. I am ready. Show me the product or say its name and I will start the analysis right away.",
    )


def _normalize_catalog_query(raw_text: str) -> str:
    normalized = re.sub(r"\s+", " ", (raw_text or "").strip())
    if not normalized:
        return ""
    lowered = normalized.lower().replace("lay's", "lays").replace("lay’s", "lays")
    if _looks_like_agent_echo(lowered):
        return ""
    if lowered in {"hello", "hallo", "hi", "hey"}:
        return ""
    if _looks_like_lays_query(lowered):
        return "lays classic chips"

    tokens = [re.sub(r"[^a-z0-9]", "", token) for token in lowered.split()]
    filtered = [token for token in tokens if token and token not in QUERY_FILLER_TOKENS]
    if not filtered:
        return ""
    return " ".join(filtered[:6])


def _is_low_signal_query(query_text: str) -> bool:
    cleaned = re.sub(r"[^a-z0-9 ]", " ", (query_text or "").lower())
    tokens = [token for token in cleaned.split() if token]
    if not tokens:
        return True
    if len(tokens) == 1 and tokens[0] in LOW_SIGNAL_QUERY_TOKENS:
        return True
    if len(tokens) <= 2 and all(token in LOW_SIGNAL_QUERY_TOKENS for token in tokens):
        return True
    return False


def _is_voice_noise_query(query_text: str) -> bool:
    tokens = _normalized_words(query_text)
    if not tokens:
        return True

    normalized = " ".join(tokens)
    if _lookup_whole_food_profile(normalized):
        return False
    if _looks_like_lays_query(normalized):
        return False

    action_tokens = [token for token in tokens if token in VOICE_NOISE_ACTION_TOKENS]
    non_action_tokens = [token for token in tokens if token not in VOICE_NOISE_ACTION_TOKENS]
    if action_tokens and len(non_action_tokens) <= 1:
        return True
    if len(tokens) >= 4 and len(action_tokens) >= 2 and len(non_action_tokens) <= 2:
        return True
    if len(tokens) >= 6 and len(action_tokens) >= 3 and len(non_action_tokens) <= 3:
        return True
    if len(tokens) == 1 and len(tokens[0]) <= 5 and not tokens[0].isdigit():
        return True
    return False


def _metric_band_from_score(score: int) -> str:
    if score >= 75:
        return "green"
    if score >= 55:
        return "amber"
    if score >= 35:
        return "orange"
    return "red"


def _build_whole_food_hud(
    *,
    session_id: str,
    turn_id: str,
    domain: str,
    language: str,
    profile: dict[str, Any],
) -> HudUpdateEvent:
    kcal = float(profile["kcal_100g"])
    fiber = float(profile["fiber_g"])
    sugar = float(profile["sugar_g"])
    protein = float(profile["protein_g"])
    energy_score = max(30, min(95, int(100 - min(kcal, 120) * 0.6)))
    fiber_score = max(25, min(95, int(fiber * 20)))
    sugar_score = max(25, min(95, int(95 - min(sugar, 20) * 3)))
    protein_score = max(20, min(95, int(20 + min(protein, 10) * 7)))

    warnings: list[WarningItem] = [
        WarningItem(
            category="authorized",
            label=(
                "Whole-food profile used (package barcode not required)"
                if language != "de"
                else "Frischware-Profil genutzt (kein Barcode erforderlich)"
            ),
            severity="low",
        ),
    ]
    if sugar >= 12:
        warnings.append(
            WarningItem(
                category="warning_required",
                label=(
                    "Natural sugars present; portion-aware use recommended"
                    if language != "de"
                    else "Natuerlicher Zucker enthalten; auf Portionsgroesse achten"
                ),
                severity="low",
            )
        )

    metrics = [
        MetricItem(
            name="Calories",
            value=f"{int(round(kcal))} kcal/100g",
            band=_metric_band_from_score(energy_score),
            score=energy_score,
        ),
        MetricItem(
            name="Fiber",
            value=f"{fiber:.1f} g/100g",
            band=_metric_band_from_score(fiber_score),
            score=fiber_score,
        ),
        MetricItem(
            name="Natural sugars",
            value=f"{sugar:.1f} g/100g",
            band=_metric_band_from_score(sugar_score),
            score=sugar_score,
        ),
        MetricItem(
            name="Protein",
            value=f"{protein:.1f} g/100g",
            band=_metric_band_from_score(protein_score),
            score=protein_score,
        ),
    ]

    display_name = profile["name_de"] if language == "de" else profile["name_en"]
    spoken_summary = (
        f"{display_name} hat etwa {int(round(kcal))} Kilokalorien pro 100 Gramm und liefert natuerliche Ballaststoffe. "
        "Das ist meist eine gute Snack-Wahl; fuer laengere Saettigung kannst du es mit einer Eiweissquelle kombinieren."
        if language == "de"
        else f"{display_name} has about {int(round(kcal))} kcal per 100 grams and provides natural fiber. "
        "It is generally a good snack choice; pair it with a protein source for longer satiety."
    )

    return HudUpdateEvent(
        session_id=session_id,
        turn_id=turn_id,
        domain=domain,
        policy_version="whole_food_v1",
        product_identity=ProductIdentity(id=profile["id"], name=display_name, brand="Fresh produce"),
        grade_or_tier="authorized",
        warnings=warnings,
        metrics=metrics,
        confidence=0.86,
        data_sources=["whole_food_profile_v1"],
        explanation_bullets=[
            "Fallback profile for unpackaged produce query",
            "Values are per 100g reference, rounded for readability",
        ],
    )


def _build_whole_food_spoken_text(language: str, profile: dict[str, Any]) -> str:
    kcal = int(round(float(profile["kcal_100g"])))
    display_name = profile["name_de"] if language == "de" else profile["name_en"]
    return (
        f"{display_name} hat rund {kcal} Kilokalorien pro 100 Gramm und ist naehrstoffreich. "
        "Das passt im Regelfall gut als alltagsnaher Snack."
        if language == "de"
        else f"{display_name} has around {kcal} kcal per 100 grams and is nutrient-dense. "
        "It is generally a strong everyday snack option."
    )


def _build_gemini_client() -> Any | None:
    if genai is None:
        return None
    project_id = (
        settings.gcp_project_id
        or os.getenv("GOOGLE_CLOUD_PROJECT")
        or os.getenv("GCP_PROJECT")
        or os.getenv("PROJECT_ID")
    )
    if settings.gemini_use_vertex:
        if project_id:
            return genai.Client(
                vertexai=True,
                project=project_id,
                location=settings.gcp_location,
            )
        if settings.gemini_api_key:
            return genai.Client(api_key=settings.gemini_api_key)
        return None

    if project_id and not settings.gemini_api_key:
        return genai.Client(
            vertexai=True,
            project=project_id,
            location=settings.gcp_location,
        )
    if not settings.gemini_api_key:
        return None
    return genai.Client(api_key=settings.gemini_api_key)


def _resolve_live_model_name() -> str:
    if settings.gemini_live_model:
        return settings.gemini_live_model
    return "gemini-live-2.5-flash-native-audio" if settings.gemini_use_vertex else "gemini-2.5-flash-native-audio-preview-12-2025"


SUPPORTED_LANGUAGE_CODES = {"de", "en", "es", "fr", "hi", "it", "pt"}

LANGUAGE_NAME_MAP = {
    "de": "German",
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "hi": "Hindi",
    "it": "Italian",
    "pt": "Portuguese",
}


def _event_language(language: str) -> str:
    code = (language or "").strip().lower()
    if code in SUPPORTED_LANGUAGE_CODES:
        return code
    return "de" if code.startswith("de") else "en"


def _pick_language(language: str, de_text: str, en_text: str) -> str:
    return de_text if language == "de" else en_text


def _nutrition_table_prompt(language: str) -> str:
    if language == "de":
        return (
            "Bitte zeig die Rueckseite mit Zutatenliste und Naehrwerttabelle "
            "(Kohlenhydrate, Fett, Zucker, Eiweiss), damit ich genauer analysieren kann."
        )
    return (
        "Please show the backside ingredients and nutrition table "
        "(carbs, fat, sugar, protein) so I can provide a more precise analysis."
    )


def _clarification_prompt(language: str, attempt: int) -> str:
    if attempt <= 1:
        return _pick_language(
            language,
            "Ich kann das Produkt noch nicht sicher erkennen. Bitte zeig die Vorderseite klar, nenne den Produktnamen oder zeig Rueckseite mit Zutaten und Naehrwerten (Kohlenhydrate, Fett, Zucker, Eiweiss).",
            "I cannot identify the product yet. Please show the front side clearly, say the product name, or show the backside with ingredients and nutrition values (carbs, fat, sugar, protein).",
        )
    if attempt == 2:
        return _pick_language(
            language,
            "Noch nicht eindeutig. Bitte nenne jetzt den Produktnamen Wort fuer Wort und danach die Marke. Wenn moeglich, lies mir die Naehrwerte pro 100 Gramm vor: Kohlenhydrate, Fett, Zucker, Eiweiss.",
            "Still not clear. Please say the product name word by word, then the brand. If possible, read the per-100g nutrition values: carbs, fat, sugar, protein.",
        )
    return _pick_language(
        language,
        "Wir haben weiter zu wenig Signal. Option 1: Barcode zeigen. Option 2: Rueckseite mit Zutaten und Naehrwerten zeigen. Option 3: Produktname und Marke langsam diktieren.",
        "We still do not have enough signal. Option 1: show the barcode. Option 2: show the backside ingredients and nutrition table. Option 3: dictate product name and brand slowly.",
    )


def _nutrition_detail_snippet(product_payload: dict[str, Any], language: str) -> str:
    nutriments = product_payload.get("nutriments") or {}
    calories = nutriments.get("energy-kcal_100g")
    sugar = nutriments.get("sugars_100g")
    fat = nutriments.get("fat_100g")
    protein = nutriments.get("proteins_100g")
    salt = nutriments.get("salt_100g")
    details: list[str] = []
    if calories is not None:
        details.append(f"{float(calories):.0f} kcal/100g")
    if sugar is not None:
        details.append(f"sugar {float(sugar):.1f} g/100g")
    if fat is not None:
        details.append(f"fat {float(fat):.1f} g/100g")
    if protein is not None:
        details.append(f"protein {float(protein):.1f} g/100g")
    if salt is not None:
        details.append(f"salt {float(salt):.2f} g/100g")
    if not details:
        return ""
    joined = ", ".join(details[:4])
    if language == "de":
        return f"Bekannte Naehrwerte: {joined}."
    return f"Known nutrition values: {joined}."


def _needs_backside_prompt(product_payload: dict[str, Any]) -> bool:
    nutriments = product_payload.get("nutriments") or {}
    keys = ("sugars_100g", "fat_100g", "proteins_100g", "salt_100g", "energy-kcal_100g")
    available = sum(1 for key in keys if nutriments.get(key) is not None)
    ingredients_text = str(product_payload.get("ingredients_text") or "").strip()
    return available < 3 or not ingredients_text


def _decode_data_url(value: str | None) -> tuple[str, bytes] | None:
    if not value:
        return None
    try:
        if "," in value:
            header, payload = value.split(",", 1)
            mime_match = re.match(r"data:([^;]+);base64", header)
            mime_type = mime_match.group(1).strip() if mime_match else "application/octet-stream"
        else:
            payload = value
            mime_type = "application/octet-stream"
        decoded = base64.b64decode(payload, validate=False)
        return mime_type, decoded
    except Exception:
        return None


def _encode_data_url(mime_type: str, payload: bytes) -> str:
    encoded = base64.b64encode(payload).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def _extract_sample_rate(mime_type: str, default: int = 24_000) -> int:
    match = re.search(r"rate=(\d+)", mime_type.lower())
    if not match:
        return default
    try:
        value = int(match.group(1))
        return value if value > 0 else default
    except ValueError:
        return default


def _pcm_to_wav_bytes(raw_pcm: bytes, sample_rate: int) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(raw_pcm)
    return buffer.getvalue()


def _normalize_model_audio(mime_type: str, payload: bytes) -> tuple[str, bytes]:
    normalized = (mime_type or "").lower()
    if normalized.startswith("audio/pcm") or normalized.startswith("audio/l16"):
        return "audio/wav", _pcm_to_wav_bytes(payload, sample_rate=_extract_sample_rate(mime_type))
    return mime_type or "application/octet-stream", payload


def _extract_audio_parts(message: Any) -> list[tuple[str, bytes]]:
    server_content = getattr(message, "server_content", None)
    if not server_content:
        return []
    model_turn = getattr(server_content, "model_turn", None)
    if not model_turn or not getattr(model_turn, "parts", None):
        return []

    chunks: list[tuple[str, bytes]] = []
    for part in model_turn.parts:
        inline_data = getattr(part, "inline_data", None)
        if not inline_data:
            continue
        mime_type = getattr(inline_data, "mime_type", "") or "application/octet-stream"
        data = getattr(inline_data, "data", None)
        if isinstance(data, str):
            try:
                payload = base64.b64decode(data, validate=False)
            except Exception:
                continue
        elif isinstance(data, (bytes, bytearray)):
            payload = bytes(data)
            if len(payload) >= 16 and re.fullmatch(rb"[A-Za-z0-9+/=\s]+", payload.strip()):
                try:
                    decoded_payload = base64.b64decode(payload, validate=True)
                    if decoded_payload:
                        payload = decoded_payload
                except Exception:
                    pass
        else:
            continue
        if not payload:
            continue
        if not mime_type.startswith("audio/"):
            continue
        chunks.append((mime_type, payload))
    return chunks


def _extract_model_turn_text(message: Any) -> str:
    server_content = getattr(message, "server_content", None)
    if not server_content:
        return ""
    model_turn = getattr(server_content, "model_turn", None)
    if not model_turn or not getattr(model_turn, "parts", None):
        return ""
    texts: list[str] = []
    for part in model_turn.parts:
        part_text = getattr(part, "text", None)
        if isinstance(part_text, str) and part_text.strip():
            texts.append(part_text)
    return "".join(texts).strip()


def _extract_output_transcription(message: Any) -> str:
    server_content = getattr(message, "server_content", None)
    if not server_content:
        return ""
    output_transcription = getattr(server_content, "output_transcription", None)
    if not output_transcription:
        return ""
    text = getattr(output_transcription, "text", "")
    return str(text or "").strip()


def _extract_generate_content_text(response: Any) -> str:
    for candidate in getattr(response, "candidates", []) or []:
        content = getattr(candidate, "content", None)
        for part in getattr(content, "parts", []) or []:
            part_text = getattr(part, "text", None)
            if isinstance(part_text, str) and part_text.strip():
                return part_text.strip()
    return ""


def _coalesce_model_audio(chunks: list[tuple[str, bytes]]) -> list[tuple[str, bytes]]:
    if not chunks:
        return []
    lowered = [(mime_type or "").lower() for mime_type, _ in chunks]
    if all(mime.startswith("audio/pcm") or mime.startswith("audio/l16") for mime in lowered):
        merged_payload = b"".join(payload for _, payload in chunks)
        if not merged_payload:
            return []
        sample_rate = _extract_sample_rate(chunks[0][0])
        return [("audio/wav", _pcm_to_wav_bytes(merged_payload, sample_rate=sample_rate))]

    normalized = [_normalize_model_audio(mime_type, payload) for mime_type, payload in chunks if payload]
    if len(normalized) <= 1:
        return normalized
    largest = max(normalized, key=lambda item: len(item[1]))
    return [largest]


@dataclass
class GeminiLiveResult:
    text: str
    audio_chunks: list[tuple[str, bytes]]


def _sanitize_frame_hint(raw_text: str) -> str | None:
    if not raw_text:
        return None
    normalized_raw = raw_text.strip().strip("`")
    if normalized_raw.startswith("json"):
        normalized_raw = normalized_raw[4:].strip()

    if "{" in normalized_raw and "}" in normalized_raw:
        try:
            start_idx = normalized_raw.find("{")
            end_idx = normalized_raw.rfind("}") + 1
            payload = json.loads(normalized_raw[start_idx:end_idx])
            barcode_candidate = str(payload.get("barcode") or "").strip()
            barcode = _extract_barcode(barcode_candidate)
            if barcode:
                return barcode

            query_candidate = str(payload.get("query") or "").strip()
            if query_candidate:
                raw_text = query_candidate
            else:
                brand_candidate = str(payload.get("brand") or "").strip()
                product_candidate = str(payload.get("product") or payload.get("name") or "").strip()
                merged = " ".join(part for part in [brand_candidate, product_candidate] if part)
                if merged:
                    raw_text = merged
        except Exception:
            pass

    line_hint_match = re.search(r"(?:query|product|name|brand)\s*[:=-]\s*([^\n\r]+)", raw_text, re.IGNORECASE)
    if line_hint_match:
        raw_text = line_hint_match.group(1).strip()

    barcode = _extract_barcode(raw_text)
    if barcode:
        return barcode

    lowered = raw_text.lower()
    if "unknown" in lowered or "unclear" in lowered or "none" in lowered:
        return None

    cleaned = re.sub(r"\s+", " ", raw_text).strip(" \t\r\n.,:;!?\"'`")
    cleaned = re.sub(r"[^0-9A-Za-z\- ]", "", cleaned).strip()
    if len(cleaned) < 3:
        return None
    return cleaned[:64]


async def _infer_query_from_frame(
    *,
    latest_frame: tuple[str, bytes] | None,
    domain: str,
    language: str,
) -> str | None:
    if latest_frame is None:
        return None
    client = _build_gemini_client()
    if client is None or genai_types is None:
        _warn_missing_live_client()
        return None

    frame_mime, frame_bytes = latest_frame
    if not frame_mime.startswith("image/") or not frame_bytes:
        return None

    system_prompt = (
        "You extract product identifiers from one package image for product catalog search. "
        "Output strict JSON only with keys: barcode, brand, product, query. "
        "Use empty strings for unknown keys. "
        "If barcode is visible, include digits in barcode and keep query empty. "
        "If barcode is not visible, set query to '<brand> <product>' (max six words) using visible package text. "
        "If unpackaged produce is visible, set query to a single item name (apple, banana, or orange). "
        "Prefer exact visible brand/logo words over generic terms like snack or packet. "
        "Do not write full sentences."
    )
    user_prompt = (
        f"Domain: {domain}\n"
        f"Language: {LANGUAGE_NAME_MAP.get(_event_language(language), 'English')}\n"
        "Identify the visible product now."
    )

    try:
        config = genai_types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.0,
            max_output_tokens=48,
        )
        response = await client.aio.models.generate_content(
            model=settings.gemini_model,
            contents=[
                user_prompt,
                genai_types.Part.from_bytes(data=frame_bytes, mime_type=frame_mime),
            ],
            config=config,
        )
        raw_hint = _extract_generate_content_text(response)
        return _sanitize_frame_hint(raw_hint)
    except Exception:
        logger.debug("Frame hint inference failed; fallback to uncertain prompt", exc_info=True)
        return None


async def _gemini_live_refine_text(
    *,
    default_text: str,
    language: str,
    domain: str,
    user_query: str,
    latest_frame: tuple[str, bytes] | None,
    latest_audio: tuple[str, bytes] | None,
) -> GeminiLiveResult:
    client = _build_gemini_client()
    if client is None or genai_types is None:
        _warn_missing_live_client()
        return GeminiLiveResult(text=default_text, audio_chunks=[])

    try:
        event_language = _event_language(language)
        language_name = LANGUAGE_NAME_MAP.get(event_language, "English")
        system_prompt = (
            "You are a world-class nutrition copilot for live shopping decisions. "
            f"Always answer in {language_name}. "
            "Use a natural, human tone and return exactly two short sentences. "
            "If the user greets you or asks who you are, reply briefly and then guide them back to product analysis. "
            "Avoid medical/legal absolutes, and keep every claim grounded in the provided product data."
        )

        response_modalities = (
            [genai_types.Modality.AUDIO]
            if settings.gemini_live_output_audio
            else [genai_types.Modality.TEXT]
        )

        config_kwargs: dict[str, Any] = {
            "response_modalities": response_modalities,
            "max_output_tokens": 140,
            "temperature": 0.3,
            "input_audio_transcription": {},
            "system_instruction": genai_types.Content(
                role="system",
                parts=[genai_types.Part.from_text(text=system_prompt)],
            ),
        }
        if settings.gemini_live_output_audio and settings.gemini_live_voice_name:
            config_kwargs["speech_config"] = genai_types.SpeechConfig(
                voice_config=genai_types.VoiceConfig(
                    prebuilt_voice_config=genai_types.PrebuiltVoiceConfig(
                        voice_name=settings.gemini_live_voice_name,
                    ),
                ),
            )
            config_kwargs["output_audio_transcription"] = {}
        elif settings.gemini_live_output_audio:
            config_kwargs["output_audio_transcription"] = {}
        session_config = genai_types.LiveConnectConfig(**config_kwargs)

        model_name = _resolve_live_model_name()

        async with client.aio.live.connect(model=model_name, config=session_config) as session:
            if latest_frame is not None:
                frame_mime, frame_bytes = latest_frame
                await session.send_realtime_input(
                    media=genai_types.Blob(data=frame_bytes, mime_type=frame_mime),
                )
            if latest_audio is not None:
                audio_mime, audio_bytes = latest_audio
                if audio_mime.startswith("audio/"):
                    try:
                        await session.send_realtime_input(
                            audio=genai_types.Blob(data=audio_bytes, mime_type=audio_mime),
                        )
                    except Exception:
                        logger.debug("Gemini Live audio chunk was ignored by API", exc_info=True)

            live_input = (
                f"Language: {language_name}\n"
                f"Domain: {domain}\n"
                f"User query: {user_query or '-'}\n"
                f"Draft verdict: {default_text}\n"
                "Rewrite the draft verdict."
            )
            await session.send_client_content(
                turns=genai_types.Content(
                    role="user",
                    parts=[genai_types.Part.from_text(text=live_input)],
                ),
                turn_complete=True,
            )

            chunks: list[str] = []
            audio_chunks: list[tuple[str, bytes]] = []
            async with asyncio.timeout(settings.gemini_live_timeout_seconds):
                async for message in session.receive():
                    model_text = _extract_model_turn_text(message)
                    if model_text and (not chunks or chunks[-1] != model_text):
                        chunks.append(model_text)
                    transcription_text = _extract_output_transcription(message)
                    if transcription_text and (not chunks or chunks[-1] != transcription_text):
                        chunks.append(transcription_text)
                    if settings.gemini_live_output_audio:
                        audio_chunks.extend(_extract_audio_parts(message))
                    server_content = message.server_content
                    if server_content and (server_content.turn_complete or server_content.generation_complete):
                        break
            refined = "".join(chunks).strip()
            coalesced_audio = _coalesce_model_audio(audio_chunks)
            return GeminiLiveResult(text=refined or default_text, audio_chunks=coalesced_audio)
    except TimeoutError:
        logger.warning("Gemini Live timeout; using deterministic text")
        return GeminiLiveResult(text=default_text, audio_chunks=[])
    except Exception:
        logger.exception("Gemini Live refinement failed; using deterministic text")
        return GeminiLiveResult(text=default_text, audio_chunks=[])


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


async def _send_speech(
    websocket: WebSocket,
    *,
    session_id: str,
    turn_id: str,
    text: str,
    language: str,
) -> None:
    speech = SpeechEvent(
        session_id=session_id,
        turn_id=turn_id,
        text=text,
        language=_event_language(language),
    )
    await websocket.send_json(speech.model_dump())


async def _send_model_speech(
    websocket: WebSocket,
    *,
    session_id: str,
    turn_id: str,
    language: str,
    domain: str,
    prompt_text: str,
    latest_frame: tuple[str, bytes] | None = None,
    latest_audio: tuple[str, bytes] | None = None,
    user_query: str | None = None,
) -> str:
    live_result = await _gemini_live_refine_text(
        default_text=prompt_text,
        language=language,
        domain=domain,
        user_query=user_query or prompt_text,
        latest_frame=latest_frame,
        latest_audio=latest_audio,
    )
    if settings.gemini_live_output_audio and not live_result.audio_chunks:
        retry_result = await _gemini_live_refine_text(
            default_text=live_result.text or prompt_text,
            language=language,
            domain=domain,
            user_query=user_query or prompt_text,
            latest_frame=latest_frame,
            latest_audio=None,
        )
        if retry_result.audio_chunks:
            live_result = retry_result
        elif retry_result.text:
            live_result = GeminiLiveResult(text=retry_result.text, audio_chunks=[])
    spoken_text = live_result.text or prompt_text
    for audio_mime, audio_payload in live_result.audio_chunks[:4]:
        audio_event = SpeechAudioEvent(
            session_id=session_id,
            turn_id=turn_id,
            audio_b64=_encode_data_url(audio_mime, audio_payload),
            mime_type=audio_mime,
            language=_event_language(language),
        )
        await websocket.send_json(audio_event.model_dump())
    await _send_speech(
        websocket,
        session_id=session_id,
        turn_id=turn_id,
        text=spoken_text,
        language=language,
    )
    return spoken_text


@app.websocket("/ws/live")
async def live_session(websocket: WebSocket) -> None:
    await websocket.accept()
    session_id = f"S-{uuid.uuid4().hex[:8]}"
    turn_counter = 0
    domain = "food"
    language = "de"
    latest_frame: tuple[str, bytes] | None = None
    latest_audio: tuple[str, bytes] | None = None
    last_turn_signature: tuple[str, str] | None = None
    last_turn_signature_at = 0.0
    uncertain_streak = 0

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
                language = _event_language(str(incoming.get("language", "de")))
                latest_frame = None
                latest_audio = None
                uncertain_streak = 0
                await _send_simple(
                    websocket,
                    session_id=session_id,
                    turn_id=None,
                    event_type="session_state",
                    message="Live session started",
                    details={"domain": domain, "language": language},
                )
                session_prompt = (
                    "Hallo, ich bin dein Live-Nutrition-Agent. "
                    "Halte das Produkt vor die Kamera; falls der Barcode nicht sichtbar ist, zeig bitte die Rueckseite oder nenne den Produktnamen."
                    if language == "de"
                    else "Hello, I am your live nutrition agent. "
                    "Bring the product to the camera; if the barcode is not visible, show the backside or tell me the product name."
                )
                await _send_model_speech(
                    websocket,
                    session_id=session_id,
                    turn_id="T-000",
                    language=language,
                    domain=domain,
                    prompt_text=session_prompt,
                )
                continue

            if msg_type == "frame":
                decoded_frame = _decode_data_url(incoming.get("image_b64"))
                if decoded_frame:
                    latest_frame = decoded_frame
                continue

            if msg_type == "audio_chunk":
                decoded_audio = _decode_data_url(incoming.get("audio_b64"))
                if decoded_audio:
                    latest_audio = decoded_audio
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
            raw_query_text = str(incoming.get("text") or "").strip()
            query_source = str(incoming.get("source") or "manual").strip().lower()
            query_text = _normalize_catalog_query(raw_query_text)
            barcode = str(incoming.get("barcode") or "").strip() or _extract_barcode(raw_query_text)
            voice_noise_detected = _is_voice_noise_query(raw_query_text)
            should_use_frame_hint = (
                not barcode
                and latest_frame is not None
                and (
                    _is_low_signal_query(query_text)
                    or voice_noise_detected
                )
            )
            if should_use_frame_hint:
                inferred_hint = await _infer_query_from_frame(
                    latest_frame=latest_frame,
                    domain=domain,
                    language=language,
                )
                if inferred_hint:
                    inferred_barcode = _extract_barcode(inferred_hint)
                    if inferred_barcode:
                        barcode = inferred_barcode
                        await _send_simple(
                            websocket,
                            session_id=session_id,
                            turn_id=turn_id,
                            event_type="tool_call",
                            message="Frame fallback inferred barcode",
                            details={"barcode": inferred_barcode},
                        )
                    else:
                        query_text = _normalize_catalog_query(inferred_hint) or inferred_hint
                        await _send_simple(
                            websocket,
                            session_id=session_id,
                            turn_id=turn_id,
                            event_type="tool_call",
                            message=(
                                "Voice query corrected by frame hint"
                                if query_source == "voice" or voice_noise_detected
                                else "Frame fallback inferred product name"
                            ),
                            details={"query_text": query_text, "source": query_source},
                        )
                elif voice_noise_detected:
                    query_text = ""
                    await _send_simple(
                        websocket,
                        session_id=session_id,
                        turn_id=turn_id,
                        event_type="session_state",
                        message="Voice query unclear; waiting for clearer product signal",
                    )

            turn_signature = ((barcode or "").strip(), (query_text or "").strip().lower())
            now_monotonic = time.monotonic()
            if last_turn_signature == turn_signature and (now_monotonic - last_turn_signature_at) < 4.0:
                await _send_simple(
                    websocket,
                    session_id=session_id,
                    turn_id=turn_id,
                    event_type="session_state",
                    message="Duplicate query ignored",
                )
                continue
            last_turn_signature = turn_signature
            last_turn_signature_at = now_monotonic

            expiry_guidance = _expiry_guidance_from_text(query_text, language)
            if expiry_guidance and not barcode:
                await _send_speech(
                    websocket,
                    session_id=session_id,
                    turn_id=turn_id,
                    text=expiry_guidance,
                    language=language,
                )
                await _send_simple(
                    websocket,
                    session_id=session_id,
                    turn_id=turn_id,
                    event_type="session_state",
                    message="Expiration guidance returned",
                )
                continue

            social_intent = _classify_social_intent(raw_query_text) if raw_query_text and not barcode else None
            if social_intent:
                uncertain_streak = 0
                conversational_prompt = _social_prompt(language, social_intent)
                await _send_model_speech(
                    websocket,
                    session_id=session_id,
                    turn_id=turn_id,
                    language=language,
                    domain=domain,
                    prompt_text=conversational_prompt,
                    latest_frame=latest_frame,
                    latest_audio=latest_audio,
                    user_query=raw_query_text,
                )
                await _send_simple(
                    websocket,
                    session_id=session_id,
                    turn_id=turn_id,
                    event_type="session_state",
                    message="Turn complete",
                )
                continue

            if not barcode and not query_text:
                uncertain_streak += 1
                no_match_prompt = _clarification_prompt(language, uncertain_streak)
                await _send_simple(
                    websocket,
                    session_id=session_id,
                    turn_id=turn_id,
                    event_type="uncertain_match",
                    message=no_match_prompt,
                )
                await _send_model_speech(
                    websocket,
                    session_id=session_id,
                    turn_id=turn_id,
                    language=language,
                    domain=domain,
                    prompt_text=no_match_prompt,
                    latest_frame=latest_frame,
                    latest_audio=latest_audio,
                    user_query=raw_query_text,
                )
                continue

            whole_food_profile = _lookup_whole_food_profile(query_text) if not barcode else None
            if whole_food_profile:
                uncertain_streak = 0
                await _send_simple(
                    websocket,
                    session_id=session_id,
                    turn_id=turn_id,
                    event_type="tool_call",
                    message="Whole-food nutrition fallback selected",
                )
                produce_hud = _build_whole_food_hud(
                    session_id=session_id,
                    turn_id=turn_id,
                    domain=domain,
                    language=language,
                    profile=whole_food_profile,
                )
                default_spoken_text = _build_whole_food_spoken_text(language, whole_food_profile)
                live_result = await _gemini_live_refine_text(
                    default_text=default_spoken_text,
                    language=language,
                    domain=domain,
                    user_query=query_text,
                    latest_frame=latest_frame,
                    latest_audio=latest_audio,
                )
                spoken_text = live_result.text

                await websocket.send_json(produce_hud.model_dump())
                for audio_mime, audio_payload in live_result.audio_chunks[:4]:
                    audio_event = SpeechAudioEvent(
                        session_id=session_id,
                        turn_id=turn_id,
                        audio_b64=_encode_data_url(audio_mime, audio_payload),
                        mime_type=audio_mime,
                        language=_event_language(language),
                    )
                    await websocket.send_json(audio_event.model_dump())

                await _send_speech(
                    websocket,
                    session_id=session_id,
                    turn_id=turn_id,
                    text=spoken_text,
                    language=language,
                )
                if latest_audio:
                    latest_audio = None
                await _send_simple(
                    websocket,
                    session_id=session_id,
                    turn_id=turn_id,
                    event_type="session_state",
                    message="Turn complete",
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
                if not search_result.selected_candidate and not barcode and latest_frame is not None:
                    inferred_retry_hint = await _infer_query_from_frame(
                        latest_frame=latest_frame,
                        domain=domain,
                        language=language,
                    )
                    retry_query = _normalize_catalog_query(inferred_retry_hint or "")
                    if retry_query and retry_query.lower() != query_text.lower():
                        query_text = retry_query
                        await _send_simple(
                            websocket,
                            session_id=session_id,
                            turn_id=turn_id,
                            event_type="tool_call",
                            message="Catalog fallback retry with frame hint",
                            details={"query_text": query_text},
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
                        await _send_model_speech(
                            websocket,
                            session_id=session_id,
                            turn_id=turn_id,
                            language=language,
                            domain=domain,
                            prompt_text=disambiguation_text,
                            latest_frame=latest_frame,
                            latest_audio=latest_audio,
                            user_query=raw_query_text or query_text,
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
                    uncertain_streak += 1
                    uncertain_text = _clarification_prompt(language, uncertain_streak)
                    await _send_simple(
                        websocket,
                        session_id=session_id,
                        turn_id=turn_id,
                        event_type="uncertain_match",
                        message=uncertain_text,
                    )
                    await _send_model_speech(
                        websocket,
                        session_id=session_id,
                        turn_id=turn_id,
                        language=language,
                        domain=domain,
                        prompt_text=uncertain_text,
                        latest_frame=latest_frame,
                        latest_audio=latest_audio,
                        user_query=raw_query_text or query_text,
                    )
                    continue

            uncertain_streak = 0
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

            default_spoken_text = _pick_language(language, normalized.spoken_summary_de, normalized.spoken_summary_en)
            nutrition_detail = _nutrition_detail_snippet(product_payload, language)
            backside_prompt_needed = _needs_backside_prompt(product_payload)
            backside_prompt = _nutrition_table_prompt(language) if backside_prompt_needed else ""
            if nutrition_detail:
                default_spoken_text = f"{default_spoken_text} {nutrition_detail}"
            if backside_prompt:
                default_spoken_text = f"{default_spoken_text} {backside_prompt}"
            live_result = await _gemini_live_refine_text(
                default_text=default_spoken_text,
                language=language,
                domain=domain,
                user_query=query_text,
                latest_frame=latest_frame,
                latest_audio=latest_audio,
            )
            spoken_text = live_result.text

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
                explanation_bullets=normalized.explanation_bullets
                + ([nutrition_detail] if nutrition_detail else [])
                + ([backside_prompt] if backside_prompt else []),
            )
            await websocket.send_json(hud.model_dump())

            for audio_mime, audio_payload in live_result.audio_chunks[:4]:
                audio_event = SpeechAudioEvent(
                    session_id=session_id,
                    turn_id=turn_id,
                    audio_b64=_encode_data_url(audio_mime, audio_payload),
                    mime_type=audio_mime,
                    language=_event_language(language),
                )
                await websocket.send_json(audio_event.model_dump())

            await _send_speech(
                websocket,
                session_id=session_id,
                turn_id=turn_id,
                text=spoken_text,
                language=language,
            )
            if latest_audio:
                latest_audio = None

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
