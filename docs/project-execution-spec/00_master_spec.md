# 00 - Master Spec (Spec-Driven Delivery)

## 1. Project Identity

- Project name: NutriVision Live
- Goal: Build a real-time multimodal shopping copilot for Germany that evaluates food and cosmetics using camera + voice + grounded data + concise explainable outputs.
- Delivery context: Gemini Live Agent Challenge submission
- Scope mode: MVP first (Food), Cosmetics as controlled Beta

## 2. Challenge Constraint Lock (From Official Briefing)

- Track selected: Live Agent
- Mandatory stack constraints:
  - Use a Gemini model
  - Use Google GenAI SDK or ADK
  - Use at least one Google Cloud service
- Mandatory submission artifacts:
  - Public code repository
  - Architecture diagram + setup guide
  - Demo video under 4 minutes showing real-time behavior (no mockups)
  - Visible proof backend is running on Google Cloud (Cloud Run dashboard and/or live URL)
- Submission window:
  - Opens: February 16, 2026
  - Closes: March 16, 2026 at 5:00 PM PDT

## 3. Problem Statement

Current scan apps are friction-heavy and mostly static. Users need low-latency, hands-free decision support while shopping, with clear explanation quality and trustable regulatory framing.

## 4. Product Outcome Statement

When a user points the camera at a product and asks a question, the system must identify the product reliably (barcode first), fetch grounded data, produce a concise spoken verdict, and render an on-screen analysis overlay with top warnings.

## 5. Spec-Driven Principles

- Every requirement has an ID and acceptance criteria.
- Every feature maps to test cases.
- No implementation task is started without mapped requirement IDs.
- MVP and Beta scope are explicitly separated.
- Unverified claims are labeled as assumptions until verified.

## 6. In-Scope and Out-of-Scope

### In scope (MVP)

- Real-time camera + microphone loop
- Barge-in interruption handling
- Barcode-first product identification
- OCR/name fallback search
- Food evaluation: nutrition, NOVA, additives, eco signal
- German expiration label interpretation (MHD vs use-by)
- HUD overlay with compact metrics
- Spoken 2-3 sentence verdict
- Cloud deployment proof on GCP

### In scope (Beta)

- Cosmetics domain toggle
- INCI ingredient risk flags
- Restricted/prohibited signal framing based on curated regulatory mapping

### Out of scope (for first submission)

- Medical diagnosis or personalized medical treatment advice
- Full legal compliance automation for all SKUs globally
- Retailer integrations and affiliate commerce flows
- Full historical shopper profile system

## 7. Business Requirements (BR)

- BR-001: Reduce decision friction at shelf-level by enabling no-typing product understanding.
- BR-002: Demonstrate clear differentiation vs barcode-only static apps.
- BR-003: Prioritize Germany-first packaging and language context.
- BR-004: Keep user trust high with explainable and grounded outputs.
- BR-005: Align exactly with hackathon deliverables.
- BR-006: Make MVP demo robust under live conditions.

## 8. Product Requirements (PR)

- PR-001: User can start a live session in <= 3 steps.
- PR-002: Product recognition pipeline must try barcode first, then text search fallback.
- PR-003: Spoken verdict is concise (target 2-3 sentences unless asked for details).
- PR-004: HUD overlay updates during/after analysis with top indicators.
- PR-005: User interruption stops current response and pivots immediately.
- PR-006: Expiration labels in German are interpreted with different severity by label type.
- PR-007: Cosmetics mode is explicitly marked Beta.

## 9. Technical Requirements (TR)

- TR-001: Use Gemini model in live multimodal mode.
- TR-002: Use Google GenAI SDK or ADK.
- TR-003: Use at least one Google Cloud service in deployed architecture.
- TR-004: Backend proxy mediates model and tool access (no secret leakage to client).
- TR-005: Tool calls must be deterministic and schema-defined.
- TR-006: External product lookups should be cached to reduce latency spikes.
- TR-007: System must emit both voice response and structured UI event payloads.
- TR-008: Logging must support post-demo evidence and debugging.
- TR-009: Backend must be deployed to Google Cloud and demonstrable during video capture.

## 10. Data and Trust Requirements (DR)

- DR-001: All product verdicts include traceable source fields internally.
- DR-002: Legal framing must separate "authorized", "restricted", "warning required", "not authorized", and "uncertain".
- DR-003: If data confidence is low, system asks disambiguation question or says uncertain.
- DR-004: Regulatory language must avoid overclaiming.
- DR-005: User-facing disclaimer appears in app and demo narrative.

## 11. Non-Functional Requirements (NFR)

- NFR-001: Target low perceived latency for first useful response.
- NFR-002: Graceful handling of missing/offline data.
- NFR-003: Stable behavior under barge-in and rapid turn-taking.
- NFR-004: Observability for model output, tool calls, and failures.
- NFR-005: Security baseline for keys/secrets and transport.

## 12. Requirement Traceability Matrix (Starter)

| Requirement | Design Component | Test Category | Demo Evidence |
|---|---|---|---|
| PR-002 | Recognition Orchestrator | Integration | Live barcode + fallback clip |
| PR-005 | Session Controller | E2E + interruption | Barge-in demo moment |
| PR-006 | Expiry Parser + Prompt policy | Unit + E2E | MHD vs use-by clip |
| TR-005 | Tool schema contracts | Contract tests | Debug drawer with tool calls |
| DR-002 | Policy engine | Unit + review | Spoken risk classification |
| TR-009 | Cloud deployment | Deployment validation | Cloud Run dashboard + live URL in demo |

## 13. Acceptance Criteria by Gate

### Gate A: Spec freeze

- All BR/PR/TR/DR/NFR are reviewed and marked accepted.
- MVP vs Beta scope is frozen.
- Open questions priority 1 are resolved.

### Gate B: MVP functional complete

- Food flow works end to end with barcode and fallback.
- HUD and speech outputs are coherent and grounded.
- Barge-in works under manual test script.

### Gate C: Demo-ready

- Scripted 4-minute flow passes 3 consecutive dry runs.
- Failure fallback script prepared.
- Cloud proof artifacts ready.

### Gate D: Submission-ready

- Repo, architecture diagram, run instructions, demo video, and cloud proof all packaged.
- Final checklist signed.

## 14. Risks and Controls

- R-001 Data quality variance in open datasets
  - Control: confidence scoring + disambiguation prompts + uncertainty messaging
- R-002 Live latency causing poor UX
  - Control: caching + compact fields + constrained response style
- R-003 Overclaiming regulatory status
  - Control: curated policy labels + legal wording review
- R-004 Demo failure due to unstable network
  - Control: local fallback products + prepared backup narrative

## 15. Done Definition

The project is complete when all Gate D criteria are met, all blocking checklist items are checked, and unresolved high-priority risks are zero.
