from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field


EventType = Literal[
    "session_state",
    "tool_call",
    "hud_update",
    "speech_text",
    "uncertain_match",
    "barge_ack",
    "error",
]

DomainType = Literal["food", "beauty"]


class ProductIdentity(BaseModel):
    id: str = "unknown"
    name: str = "Unknown product"
    brand: str = "Unknown brand"


class WarningItem(BaseModel):
    category: Literal["authorized", "restricted", "warning_required", "not_authorized", "uncertain"]
    label: str
    severity: Literal["low", "medium", "high", "critical"] = "medium"


class MetricItem(BaseModel):
    name: str
    value: str
    band: Literal["green", "amber", "orange", "red"]
    score: int = Field(ge=0, le=100)


class HudUpdateEvent(BaseModel):
    event_type: Literal["hud_update"] = "hud_update"
    session_id: str
    turn_id: str
    domain: DomainType
    policy_version: str = "v1"
    product_identity: ProductIdentity
    grade_or_tier: str
    warnings: list[WarningItem]
    metrics: list[MetricItem]
    confidence: float = Field(ge=0.0, le=1.0)
    data_sources: list[str] = Field(default_factory=list)
    explanation_bullets: list[str] = Field(default_factory=list)


class SpeechEvent(BaseModel):
    event_type: Literal["speech_text"] = "speech_text"
    session_id: str
    turn_id: str
    text: str
    language: Literal["de", "en"]


class SimpleEvent(BaseModel):
    event_type: EventType
    session_id: str
    turn_id: str | None = None
    message: str
    details: dict[str, Any] | None = None


class BarcodeToolResult(BaseModel):
    found: bool
    product_id: str | None = None
    canonical_name: str | None = None
    confidence: float = 0.0
    raw_payload_ref: dict[str, Any] | None = None


class SearchCandidate(BaseModel):
    id: str
    name: str
    confidence: float


class SearchToolResult(BaseModel):
    candidates: list[SearchCandidate]
    selected_candidate: SearchCandidate | None = None


class PolicyFlag(BaseModel):
    category: Literal["authorized", "restricted", "warning_required", "not_authorized", "uncertain"]
    severity: Literal["low", "medium", "high", "critical"]
    message_short: str
    policy_citation: str


class PolicyToolResult(BaseModel):
    flags: list[PolicyFlag]
    policy_version: str
    uncertainty_markers: list[str]


class NormalizedScoreResult(BaseModel):
    spoken_summary_de: str
    spoken_summary_en: str
    policy_version: str
    grade_or_tier: str
    confidence: float
    warnings: list[WarningItem]
    metrics: list[MetricItem]
    explanation_bullets: list[str]
    data_sources: list[str]
