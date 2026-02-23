# NutriVision Live - UX and Demo Requirements (Hackathon-Aligned)

## 1. UX Direction

- Primary mode: voice-first, camera-on.
- Secondary mode: text fallback for noisy environments/debug.
- Visual style: compact, high-signal HUD with minimal cognitive load.

## 2. Required Demo Moments

The final demo must show these moments in one coherent flow:

1. Hands-free scan with instant HUD update.
2. User interruption (barge-in) and immediate pivot.
3. Food additive warning example.
4. German date interpretation example (MHD vs use-by wording).
5. Cosmetics Basic Beta moment.

## 3. HUD Contract

Per analyzed product turn, the HUD must show:

- Product identity (name + brand)
- Grade/Tier indicator
- Max 3 warning chips
- 4 compact metric bars
- Confidence visibility (minimal)
- Data source tags

## 4. Voice Contract

- Spoken output must be concise and conservative.
- Default response length: 2-3 sentences.
- Must avoid medical/legal overclaiming.
- On interruption: stop current playback and prioritize new user intent.

## 5. Error and Uncertainty Contract

- If no reliable match: ask one clarifying question or emit explicit uncertainty.
- If source data is incomplete: show uncertainty instead of false certainty.
- If a data source is unavailable: degrade gracefully and keep session alive.

## 6. Platform Contract

- Delivery target is web application with mobile-first UX.
- Native iOS/Android app packaging is not required for submission.
- Camera/microphone permissions must be requested in-browser at session start.

## 7. Demo Video Constraints

- Maximum duration: 4:00.
- Must be live operation, no static mockup-only sequence.
- Must include visible Google Cloud proof.
