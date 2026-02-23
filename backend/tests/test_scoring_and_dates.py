from datetime import date, timedelta

from app.main import _expiry_guidance_from_text
from app.scoring import evaluate_ingredients_regulatory, normalize_and_score


def test_food_policy_flags_include_not_authorized_and_warning_required() -> None:
    result = evaluate_ingredients_regulatory(
        domain="food",
        ingredients_or_additives=["E171", "E102"],
        policy_version="v1",
    )

    categories = {flag.category for flag in result.flags}
    assert "not_authorized" in categories
    assert "warning_required" in categories


def test_food_normalization_returns_metrics_and_grade() -> None:
    payload = {
        "product_name": "Demo Product",
        "brands": "Demo Brand",
        "nutriments": {
            "sugars_100g": 18.0,
            "salt_100g": 0.9,
            "saturated-fat_100g": 6.5,
            "proteins_100g": 7.5,
        },
        "ingredients_text": "sugar, cocoa butter",
        "ingredients_tags": ["en:sugar"],
        "additives_tags": ["en:e171"],
    }
    policy = evaluate_ingredients_regulatory(domain="food", ingredients_or_additives=["E171"], policy_version="v1")
    result = normalize_and_score(product_payload=payload, policy_result=policy, domain="food")

    assert result.grade_or_tier in {"A", "B", "C", "D", "E"}
    assert len(result.metrics) == 4
    assert len(result.warnings) >= 1


def test_expiry_guidance_use_by_expired_returns_discard_message() -> None:
    expired = date.today() - timedelta(days=1)
    text = f"Zu verbrauchen bis {expired.strftime('%d.%m.%Y')}"

    guidance = _expiry_guidance_from_text(text, language="de")

    assert guidance is not None
    assert "nicht mehr" in guidance


def test_expiry_guidance_mhd_future_returns_valid_message() -> None:
    future = date.today() + timedelta(days=30)
    text = f"MHD {future.strftime('%d.%m.%Y')}"

    guidance = _expiry_guidance_from_text(text, language="de")

    assert guidance is not None
    assert "MHD noch gueltig" in guidance
