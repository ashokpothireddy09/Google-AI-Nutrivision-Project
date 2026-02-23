# 02 - Technical Spec

## 1. Architecture Overview

Client (camera + mic + HUD) -> Backend proxy/service -> Gemini Live session -> Tool layer -> External data sources -> Structured result + voice output -> Client playback + HUD updates

## 2. Architecture Components

### C1. Client App

- Capture audio stream
- Capture image/video frames
- Optional local barcode detection
- Render streaming HUD events
- Play model audio with interruption-safe buffer

### C2. Backend Proxy

- Manage authenticated live model session
- Execute tool calls deterministically
- Normalize and score external data
- Emit strict typed events to client

### C3. Tooling Layer

- Product-by-barcode fetch tool
- Product search fallback tool
- Regulatory classification tool
- Scoring normalization tool

### C4. Data/Cache Layer

- Cache product lookup responses
- Cache policy and taxonomy mappings
- TTL + invalidation strategy

### C5. Observability Layer

- Request logs
- Tool call logs
- Error/fallback logs
- Demo evidence logs

## 3. API and Tool Contracts (Spec First)

### 3.1 Tool: get_product_by_barcode

Inputs:
- barcode (string)
- domain (food|beauty)
- locale_country (string)
- locale_language (string)

Output:
- found (bool)
- product_id
- canonical_name
- confidence
- raw_payload_ref

### 3.2 Tool: search_product_catalog

Inputs:
- query_text
- domain
- locale_country
- locale_language
- max_results

Output:
- candidate list (id, name, confidence)
- selected candidate

### 3.3 Tool: evaluate_ingredients_regulatory

Inputs:
- domain
- ingredient/additive list
- policy_version

Output:
- flags[] with severity and category
- policy citations (internal)
- uncertainty markers

### 3.4 Tool: normalize_and_score

Inputs:
- product payload
- policy evaluation result

Output:
- spoken summary fields
- hud metrics
- confidence score
- explanation bullets

## 4. Recognition Orchestration Logic

1. Try barcode.
2. If barcode fails, OCR and text search.
3. If multiple close matches, ask user a single disambiguation question.
4. If still uncertain, return explicit uncertainty response.

## 5. Prompt and Response Policy

- Persona: strict but helpful, concise
- Output style: short, grounded, non-medical
- Do not output unsupported legal claims
- If uncertain, explicitly state low confidence
- On barge-in, stop current response and switch context

## 6. Structured Event Schema (HUD)

- event_type
- session_id
- turn_id
- product_identity
- grade_or_tier
- warnings[]
- metrics[]
- confidence
- data_sources[]

## 7. Error Handling Spec

- E1: No product recognized -> ask for better framing or hold still
- E2: Data source unavailable -> notify temporary limitation and keep partial analysis
- E3: Tool timeout -> return fallback concise message and retry strategy
- E4: Low confidence -> ask disambiguation question

## 8. Security and Privacy Baseline

- No client-side secret storage
- Service credentials only server-side
- Minimized logging of sensitive fields
- Environment-based config for keys

## 9. Performance Targets (Template)

- PT-001 Time to first partial feedback: <= 1.0s target
- PT-002 Time to first full verdict: <= 1.5s barcode, <= 3.0s fallback
- PT-003 Barge-in pivot latency: <= 300ms target
- PT-004 Cache hit ratio: >= 40% target during demo rehearsal

## 10. Test Strategy (Requirement-Aligned)

### Unit tests

- Scoring and policy classification
- Date interpretation paths
- Event schema validation

### Contract tests

- Tool schema input/output stability
- External API mapping correctness

### Integration tests

- End-to-end product identification flow
- Fallback and uncertainty behavior

### E2E demo tests

- Scripted 4-minute flow
- Interruption moments
- Failure fallback scenario

## 11. Deployment and Ops Spec

- Runtime: Cloud Run (backend), React static frontend
- Region: europe-west3
- Services deployed: Cloud Run, Vertex AI API, Secret Manager, Artifact Registry
- Secrets configured: `GEMINI_API_KEY`, `OFF_USER_AGENT` (server-side only)
- Logging dashboards: Cloud Logging filters for websocket sessions/tool calls/errors
- Rollback plan: redeploy previous tagged container image from Artifact Registry

## 12. Technical Open Risks

- External dataset inconsistency
- Real-time streaming instability on weak network
- Regulatory mapping drift over time

## 13. Endpoint Specification (Fillable, Pre-Implementation Lock)

### 13.1 Food product by barcode

- Base URL: `https://world.openfoodfacts.org/api/v2/product/{barcode}.json`
- Method: GET
- Query params:
  - `cc`: default `de`
  - `lc`: default `de`
  - `fields`: `code,product_name,brands,nutriments,nutriscore_grade,nova_group,ecoscore_grade,additives_tags,allergens_tags,ingredients_text,ingredients_tags`
- Required response fields:
  - product_name
  - brands
  - nutriments
  - nutriscore_grade
  - nova_group
  - ecoscore_grade
  - additives_tags
  - ingredients_text

### 13.2 Food product fallback search

- Base URL: `https://world.openfoodfacts.org/cgi/search.pl`
- Method: GET
- Query params:
  - `search_terms`: free text from OCR/user query
  - `page_size`: default 5
  - `cc`: default `de`
  - `lc`: default `de`
  - `fields`: same locked field list as barcode lookup
- Candidate selection strategy:
  - top_n: 5
  - min_confidence: 0.35
  - tie-breaker rule: highest confidence, then retry barcode lookup by selected code

### 13.3 Beauty product by barcode

- Base URL: `https://world.openbeautyfacts.org/api/v2/product/{barcode}.json`
- Method: GET
- Query params: `cc=de`, `lc=de`, `fields=code,product_name,brands,ingredients_text,ingredients_tags,labels_tags`
- Required response fields:
  - product_name
  - brands
  - ingredients_text
  - ingredients_tags

## 14. Scoring Model Specification (Deterministic)

### 14.1 Food score template

- Score range: 0-100
- Component weights:
  - nutrition: 60%
  - processing: 15%
  - additives/allergens: 20%
  - eco: 5%
- Formula:
  - `food_score = nutrition_component - policy_penalty + protein_bonus`
- Grade mapping:
  - A: >= 80
  - B: 65-79
  - C: 50-64
  - D: 35-49
  - E: < 35

### 14.2 Beauty safety tier template

- Tier scale: A-E
- Component weights:
  - regulatory severity: 40%
  - sensitizer profile: 25%
  - irritant profile: 25%
  - eco/microplastics: 10%
- Severity labels:
  - Critical: immediate red-flag category
  - High: strong caution
  - Medium: moderate caution
  - Low: informational

## 15. Regulatory Classification Policy Contract

- `authorized`: listed as permitted in selected policy mapping
- `restricted`: allowed only with conditions/limits
- `warning_required`: requires explicit consumer warning label
- `not_authorized`: no longer authorized or prohibited
- `uncertain`: insufficient data or unresolved mapping

Rule format template:

```json
{
  "rule_id": "POL-FOOD-001",
  "domain": "food",
  "key": "e171",
  "category": "not_authorized",
  "severity": "critical",
  "message_short": "Not authorized in selected EU context.",
  "policy_version": "v1",
  "effective_date": "YYYY-MM-DD"
}
```

## 16. Event Payload Examples

### 16.1 HUD update event

```json
{
  "event_type": "hud_update",
  "session_id": "S-123",
  "turn_id": "T-09",
  "product_identity": {
    "name": "Example Product",
    "brand": "Example Brand"
  },
  "grade_or_tier": "C",
  "warnings": [
    {"category": "warning_required", "label": "Colorant warning"},
    {"category": "high_sugar", "label": "High sugar"}
  ],
  "metrics": [
    {"name": "sugar", "value": 12.3, "unit": "g/100g", "band": "red"},
    {"name": "salt", "value": 1.1, "unit": "g/100g", "band": "amber"}
  ],
  "confidence": 0.82
}
```

### 16.2 Uncertainty event

```json
{
  "event_type": "uncertain_match",
  "reason": "multiple_close_candidates",
  "candidates": [
    {"name": "Variant A", "confidence": 0.62},
    {"name": "Variant B", "confidence": 0.58}
  ],
  "suggested_prompt": "Do you mean Variant A or Variant B?"
}
```

## 17. Detailed Test Matrix (Template)

| Test ID | Requirement IDs | Scenario | Input | Expected Output | Status |
|---|---|---|---|---|---|
| T-001 | PR-002, TR-005 | Barcode recognized | Known barcode frame | Deterministic product match | [ ] |
| T-002 | PR-002, DR-003 | No barcode fallback | OCR text only | Search candidates + confidence | [ ] |
| T-003 | PR-005 | User barge-in mid speech | Interrupt audio stream | Response stops and pivots | [ ] |
| T-004 | PR-006 | MHD past date | Product with MHD past | Mild warning and sensory guidance | [ ] |
| T-005 | PR-006 | Use-by past date | Product with use-by past | Strong safety warning | [ ] |
| T-006 | DR-002 | Restricted vs not authorized | Ingredient list with mapped flags | Correct category labels | [ ] |
| T-007 | TR-006 | Cache behavior | Repeat same barcode | Faster response + cache hit | [ ] |
| T-008 | NFR-002 | External API timeout | Simulated outage | Graceful fallback message | [ ] |

## 18. Current Implementation Status (2026-02-23)

- Implemented:
  - Frontend realtime camera capture and websocket client (`frontend/src/App.jsx`)
  - Backend websocket session endpoint (`backend/app/main.py`)
  - Tool contracts in code:
    - `get_product_by_barcode` (`backend/app/tools.py`)
    - `search_product_catalog` (`backend/app/tools.py`)
    - `evaluate_ingredients_regulatory` (`backend/app/scoring.py`)
    - `normalize_and_score` (`backend/app/scoring.py`)
  - Optional Gemini text refinement via Google GenAI SDK (`backend/app/main.py`)
  - Terraform baseline for Cloud Run/Vertex/Secret Manager (`infra/terraform/*`)
- Still required to fully satisfy challenge expectations:
  - Validate live Gemini runtime calls on deployed backend
  - Deploy stack to Google Cloud and capture visible proof
  - Produce architecture diagram and under-4-minute live demo video
  - Publish remote public repository and finalize reproducible run guide
