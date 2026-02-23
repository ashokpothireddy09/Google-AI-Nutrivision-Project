from __future__ import annotations

from typing import Any

from .models import MetricItem, NormalizedScoreResult, PolicyFlag, PolicyToolResult, WarningItem

WARNING_COLORANTS = {"e102", "e104", "e110", "e122", "e124", "e129"}
NOT_AUTHORIZED_FOOD = {"e171"}


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def evaluate_ingredients_regulatory(
    domain: str,
    ingredients_or_additives: list[str],
    policy_version: str = "v1",
) -> PolicyToolResult:
    normalized = {item.lower().strip() for item in ingredients_or_additives if item}
    flags: list[PolicyFlag] = []

    if domain == "food":
        if normalized.intersection(NOT_AUTHORIZED_FOOD):
            flags.append(
                PolicyFlag(
                    category="not_authorized",
                    severity="critical",
                    message_short="E171 is not authorized in EU food context.",
                    policy_citation="EU food additive framework (E171 status)",
                )
            )

        if normalized.intersection(WARNING_COLORANTS):
            flags.append(
                PolicyFlag(
                    category="warning_required",
                    severity="high",
                    message_short="Contains colorants that can require warning labeling.",
                    policy_citation="EU warning-colorants list",
                )
            )

        if any("nitrite" in item or "e250" in item or "e249" in item for item in normalized):
            flags.append(
                PolicyFlag(
                    category="restricted",
                    severity="medium",
                    message_short="Nitrite preservative present; monitor intake frequency.",
                    policy_citation="EFSA nitrite context",
                )
            )
    else:
        if any("limonene" in item or "linalool" in item for item in normalized):
            flags.append(
                PolicyFlag(
                    category="warning_required",
                    severity="medium",
                    message_short="Fragrance allergens detected.",
                    policy_citation="EU cosmetics allergen labeling",
                )
            )

        if any("sodium laureth sulfate" in item or "sodium lauryl sulfate" in item for item in normalized):
            flags.append(
                PolicyFlag(
                    category="restricted",
                    severity="medium",
                    message_short="Strong surfactant may irritate sensitive skin.",
                    policy_citation="EU cosmetics irritation guidance",
                )
            )

        if any("formaldehyde" in item for item in normalized):
            flags.append(
                PolicyFlag(
                    category="warning_required",
                    severity="high",
                    message_short="Formaldehyde-related ingredient requires conservative handling.",
                    policy_citation="EU formaldehyde labeling update",
                )
            )

        if any("polyethylene" in item or "acrylates" in item for item in normalized):
            flags.append(
                PolicyFlag(
                    category="restricted",
                    severity="medium",
                    message_short="Potential microplastics signal found.",
                    policy_citation="EU microplastics restriction",
                )
            )

    if not flags:
        flags.append(
            PolicyFlag(
                category="uncertain",
                severity="low",
                message_short="No strong regulatory markers found from current fields.",
                policy_citation="Internal conservative fallback",
            )
        )

    uncertainty_markers = ["source_fields_incomplete"] if any(flag.category == "uncertain" for flag in flags) else []
    return PolicyToolResult(flags=flags, policy_version=policy_version, uncertainty_markers=uncertainty_markers)


def _band(score: int, reverse: bool = False) -> str:
    effective = 100 - score if reverse else score
    if effective >= 80:
        return "red"
    if effective >= 60:
        return "orange"
    if effective >= 35:
        return "amber"
    return "green"


def _grade(score: float) -> str:
    if score >= 80:
        return "A"
    if score >= 65:
        return "B"
    if score >= 50:
        return "C"
    if score >= 35:
        return "D"
    return "E"


def normalize_and_score(product_payload: dict[str, Any], policy_result: PolicyToolResult, domain: str) -> NormalizedScoreResult:
    warnings = [
        WarningItem(category=flag.category, severity=flag.severity, label=flag.message_short)
        for flag in policy_result.flags[:3]
    ]

    if domain == "food":
        nutriments = product_payload.get("nutriments") or {}
        sugar = _to_float(nutriments.get("sugars_100g"), 0.0)
        salt = _to_float(nutriments.get("salt_100g"), 0.0)
        sat_fat = _to_float(nutriments.get("saturated-fat_100g"), 0.0)
        protein = _to_float(nutriments.get("proteins_100g"), 0.0)

        sugar_score = min(100, int((sugar / 22.5) * 100))
        salt_score = min(100, int((salt / 1.5) * 100))
        sat_fat_score = min(100, int((sat_fat / 5.0) * 100))
        protein_score = min(100, int((protein / 12.0) * 100))

        nutrition_component = max(0, 100 - int((sugar_score * 0.45) + (salt_score * 0.25) + (sat_fat_score * 0.3)))
        policy_penalty = 0
        for flag in policy_result.flags:
            if flag.severity == "critical":
                policy_penalty += 24
            elif flag.severity == "high":
                policy_penalty += 16
            elif flag.severity == "medium":
                policy_penalty += 8
            else:
                policy_penalty += 3

        total_score = max(0, min(100, nutrition_component - policy_penalty + int(protein_score * 0.1)))
        grade = _grade(total_score)

        verdict_de = (
            f"Score {grade}. Zucker, Salz und Zusatzstoffprofil sprechen fuer {'seltenen' if grade in {'D', 'E'} else 'moderaten'} Konsum. "
            "Hinweis nur informativ, keine medizinische Beratung."
        )
        verdict_en = (
            f"Score {grade}. Sugar, salt, and additive profile suggest {'occasional' if grade in {'D', 'E'} else 'moderate'} use. "
            "Informational only, not medical advice."
        )

        metrics = [
            MetricItem(name="Sugar", value=f"{sugar:.1f} g/100g", band=_band(sugar_score), score=sugar_score),
            MetricItem(name="Salt", value=f"{salt:.2f} g/100g", band=_band(salt_score), score=salt_score),
            MetricItem(name="Sat. fat", value=f"{sat_fat:.1f} g/100g", band=_band(sat_fat_score), score=sat_fat_score),
            MetricItem(name="Protein", value=f"{protein:.1f} g/100g", band=_band(protein_score, reverse=True), score=protein_score),
        ]

        bullets = [
            "Barcode/OCR source normalized",
            f"Policy mapping version: {policy_result.policy_version}",
            "Conservative language mode active",
        ]

        confidence = 0.84 if not policy_result.uncertainty_markers else 0.62
        return NormalizedScoreResult(
            spoken_summary_de=verdict_de,
            spoken_summary_en=verdict_en,
            policy_version=policy_result.policy_version,
            grade_or_tier=grade,
            confidence=confidence,
            warnings=warnings,
            metrics=metrics,
            explanation_bullets=bullets,
            data_sources=["Open Food Facts", "Policy ruleset v1"],
        )

    ingredients_text = (product_payload.get("ingredients_text") or "").lower()
    severity_penalty = 0
    for flag in policy_result.flags:
        if flag.severity == "critical":
            severity_penalty += 25
        elif flag.severity == "high":
            severity_penalty += 18
        elif flag.severity == "medium":
            severity_penalty += 10
        else:
            severity_penalty += 4

    base_safety = max(0, 86 - severity_penalty)
    tier = _grade(base_safety)

    sensitizer = 70 if ("limonene" in ingredients_text or "linalool" in ingredients_text) else 25
    irritation = 72 if ("sodium laureth sulfate" in ingredients_text or "sodium lauryl sulfate" in ingredients_text) else 28
    regulatory = 35 if any(flag.category in {"restricted", "warning_required"} for flag in policy_result.flags) else 15
    eco = 60 if ("polyethylene" in ingredients_text or "acrylates" in ingredients_text) else 24

    verdict_de = (
        f"Safety-Tier {tier}. Bei sensibler Haut auf Duftstoffe und starke Tenside achten. "
        "Hinweis nur informativ, keine medizinische Beratung."
    )
    verdict_en = (
        f"Safety tier {tier}. Sensitive skin should watch fragrance allergens and stronger surfactants. "
        "Informational only, not medical advice."
    )

    metrics = [
        MetricItem(name="Sensitizer", value="medium" if sensitizer >= 60 else "low", band=_band(sensitizer), score=sensitizer),
        MetricItem(name="Irritation", value="medium-high" if irritation >= 60 else "low", band=_band(irritation), score=irritation),
        MetricItem(name="Regulatory", value="watch" if regulatory >= 35 else "ok", band=_band(regulatory), score=regulatory),
        MetricItem(name="Microplastics", value="possible" if eco >= 60 else "low", band=_band(eco), score=eco),
    ]

    bullets = [
        "Cosmetics mode is Beta",
        f"Policy mapping version: {policy_result.policy_version}",
        "Conservative language mode active",
    ]

    confidence = 0.8 if not policy_result.uncertainty_markers else 0.58
    return NormalizedScoreResult(
        spoken_summary_de=verdict_de,
        spoken_summary_en=verdict_en,
        policy_version=policy_result.policy_version,
        grade_or_tier=tier,
        confidence=confidence,
        warnings=warnings,
        metrics=metrics,
        explanation_bullets=bullets,
        data_sources=["Open Beauty Facts", "EU 1223/2009 mapping", "Policy ruleset v1"],
    )
