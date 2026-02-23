# NutriVision Live - Technical Requirement Baseline (Hackathon-Aligned)

## 1. Stack

- Frontend: React + Vite (mobile-first web app)
- Backend: FastAPI WebSocket proxy (Python 3.11+)
- Gemini integration: Google GenAI SDK (ADK optional future path)
- Cloud: Cloud Run + Vertex AI API + Secret Manager + Artifact Registry
- Optional: Memorystore (Redis)

## 2. Runtime Architecture

Client camera/mic + HUD -> WebSocket backend proxy -> Gemini + tool orchestration -> normalized event stream -> spoken output + HUD update.

## 3. Tooling Requirements

Backend must provide deterministic contracts for:

- get_product_by_barcode
- search_product_catalog
- evaluate_ingredients_regulatory
- normalize_and_score

## 4. Data Requirements

Approved external sources:

- Open Food Facts
- Open Beauty Facts
- Open Food Facts additive taxonomy

Required request hygiene:

- stable User-Agent for OFF/OBF calls
- short timeout and graceful fallback
- conservative confidence handling

## 5. Non-Functional Requirements

- Reliable websocket lifecycle.
- Barge-in path wired end-to-end.
- Strong secret isolation (server-side only).
- Structured events for UI rendering.
- Evidence-ready logging for demo troubleshooting.

## 6. Submission Artifacts

Repository must contain:

- reproducible setup guide
- architecture diagram
- deployment instructions and cloud proof trail
- infra automation (Terraform)

## 7. Current Gap Checklist (Must Close Before Submission)

- Validate real Gemini runtime in deployed cloud backend.
- Verify full cloud deployment live and public.
- Complete architecture diagram artifact.
- Record final <4 min demo with cloud proof visible.
- Complete automated test baseline (unit + integration + contract minimum).
