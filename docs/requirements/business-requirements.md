# NutriVision Live - Business Requirements (Hackathon-Aligned)

## 1. Objective

Build a live multimodal shopping copilot for the Gemini Live Agent Challenge that delivers fast, grounded food/cosmetics guidance via camera + voice + HUD.

## 2. Mandatory Hackathon Constraints

The solution must satisfy all of the following:

- Use a Gemini model.
- Use Google GenAI SDK or ADK.
- Use at least one Google Cloud service.
- Run backend on Google Cloud (not local only).
- Submit all required artifacts:
  - Public repository
  - Setup guide
  - Architecture diagram
  - Demo video under 4 minutes
  - Cloud proof visible in demo (Cloud Run dashboard and/or live URL)

## 3. Product Positioning

- Category: Live Agent.
- Platform: mobile-first web app (responsive browser UI, optimized for smartphone camera flow).
- Value: zero-typing default interaction, interruptible responses, explainable visual overlay.

## 4. Scope Model

- Mandatory MVP path: Food flow must be reliable.
- Controlled Beta path: Cosmetics Basic flow, explicitly marked Beta.

Food MVP includes:

- barcode-first identification with fallback search
- concise spoken verdict (2-3 sentences)
- warning chips + 4-bar analysis HUD
- explicit low-confidence behavior
- conservative legal/medical phrasing

Cosmetics Basic Beta includes:

- INCI parsing from available fields
- fragrance allergen flags
- harsh surfactant flags
- formaldehyde-releaser keyword flags
- microplastics keyword flags

## 5. Compliance and Trust

User-facing wording categories:

- authorized
- restricted
- warning_required
- not_authorized
- uncertain

Mandatory disclaimer text:

Hinweis: Nur zu Informationszwecken. Keine medizinische Beratung. Bei Allergien/Erkrankungen bitte Arzt:in fragen.

## 6. Business KPIs for Submission Readiness

- Demo stability: 3 consecutive successful full rehearsals.
- First verdict latency target:
  - barcode <= 1.5s
  - fallback <= 3.0s
- Barge-in pivot target <= 300ms.
- Demo set identification target >= 85%.

## 7. Done Definition (Business)

Submission is ready only when:

- all mandatory artifacts exist in the repo,
- backend is publicly demonstrable on Google Cloud,
- live demo proves real-time behavior and interruption handling,
- narrative and UX are aligned with Live Agent judging criteria.
