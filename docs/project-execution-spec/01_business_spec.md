# 01 - Business and Product Spec

## 1. Business Context

NutriVision Live targets a real and high-friction consumer behavior: at-shelf uncertainty during food and personal care purchase decisions. The product value is speed, trust, and clarity in a conversational, visual-first interface.

## 2. Target Users and Jobs-to-be-Done

### Persona P1: Busy shopper

- Job: "Tell me quickly if I should buy this."
- Pain: Manual scan and long text interpretation is slow.
- Success metric: Decision time reduced.

### Persona P2: Health-goal shopper

- Job: "Is this good for my diet and why?"
- Pain: Conflicting nutrition signals.
- Success metric: Understandable verdict with key metrics.

### Persona P3: Parent shopper

- Job: "Is this suitable for children?"
- Pain: Additive and warning-label confusion.
- Success metric: Fast warning signal and plain-language rationale.

### Persona P4: Sensitive-skin shopper

- Job: "Will this irritate my skin?"
- Pain: INCI complexity.
- Success metric: Top risk flags and safer alternative hint.

## 3. Value Proposition

- Zero-typing and low-friction usage
- Live voice + visual interpretation
- Grounded data with explainable risk labels
- Germany-first relevance

## 4. Product Positioning

- Category: AI shopping copilot (live multimodal)
- Differentiator: not static barcode results; dynamic, interruptible conversation with visual evidence
- Scope strategy: stable food MVP + innovative cosmetics Beta

## 5. UX Principles

- Keep spoken outputs short by default
- Show only high-signal visual indicators (not clutter)
- Ask a clarifying question when confidence is low
- Never present uncertain results as facts

## 6. Core User Journey (MVP)

1. User opens live mode.
2. User points camera at product.
3. System attempts barcode lookup.
4. If no barcode, system falls back to OCR/name lookup.
5. User asks question.
6. System returns spoken verdict + HUD summary.
7. User interrupts for details if needed.
8. System pivots instantly.

## 7. UX Output Contract

- Spoken response format:
  - Sentence 1: direct verdict
  - Sentence 2: top reason(s)
  - Optional sentence 3: warning/alternative
- HUD format:
  - Product identity
  - Grade/score indicator
  - 3 max warning chips
  - 4 compact metric bars

## 8. Trust and Legal Communication Contract

- Always use these user-facing categories:
  - Authorized
  - Restricted
  - Warning required
  - Not authorized
  - Uncertain
- Always include non-medical disclaimer in footer/help panel.

## 9. Business KPIs (MVP)

- KPI-001: Product identification success rate
- KPI-002: Median time to first verdict
- KPI-003: Barge-in success rate
- KPI-004: Session completion rate in demo script
- KPI-005: Qualitative trust score from internal reviewers

## 10. Demo Narrative Requirements

- Must demonstrate live multimodal interaction
- Must include interruption handling
- Must include one food warning example
- Must include expiration date interpretation
- Should include cosmetics Beta if stable
- Must show grounded tool-calling evidence

## 11. Business Assumptions to Validate

- A-001 Users prefer voice-first over manual scan-only flow
- A-002 Explainable warning chips improve trust
- A-003 Cosmetics Beta increases wow-factor without destabilizing MVP

## 12. Business Decision Locks Needed

- D-001 Final audience language mode for demo (German-only or bilingual)
- D-002 Mandatory/optional cosmetics scope for first submission
- D-003 Risk appetite for regulatory depth in spoken output
