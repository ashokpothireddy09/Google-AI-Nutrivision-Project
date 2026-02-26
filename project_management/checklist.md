# NutriVision Live - Corrected Checklist (Spec-Driven)

Use this as a gate-based checklist. A gate closes only when all mandatory items are checked.

## New Dev Handoff Map (Read First)

- Backend live session orchestration: `backend/app/main.py` (`live_session`).
- Backend live model prompt/audio/text handling: `backend/app/main.py` (`_gemini_live_refine_text`, `_coalesce_model_audio`, `_send_model_speech`).
- Frontend session/socket/audio behavior: `frontend/src/App.jsx` (`startSession`, `connectSocket`, `playServerAudio`, `startVoiceRecognitionLoop`).
- Websocket behavior tests: `backend/tests/test_websocket_contracts.py`.

### Open blockers with exact change points

- [ ] Browser/device field validation for model voice playback and session reliability:
  - verify no repeated `Server audio playback failed` in real run.
  - files to adjust if still failing: `frontend/src/App.jsx`, `backend/app/main.py`.
- [ ] Voice recognition quality tuning in noisy environments:
  - adjust confidence thresholds/transcript filtering.
  - file: `frontend/src/App.jsx` (`startVoiceRecognitionLoop`).
- [ ] STT semantic-drift guard still needs field confirmation:
  - observed speech drift (`lays packet` -> `multi showing`, `see its in front of me`) can still drive wrong catalog matches on some runs.
  - patched in backend with noise guards/frame-priority, but not fully verified on target device yet.
  - file: `backend/app/main.py` (voice-noise + social camera intent handling).
- [x] Final conversational prompt polish (human-like, multilingual consistency) implemented in code:
  - updated natural-tone system prompt,
  - conversational intent routing (`good morning`, `who are you`, `I don't have it`),
  - richer multi-step clarification prompts.
  - files: `backend/app/main.py`, tests in `backend/tests/test_websocket_contracts.py`.
- [ ] Submission package finalization:
  - public repo link, final <4 min demo video, cloud proof capture.
  - files: `README.md`, `project_management/status.md`, `project_management/checklist.md`.

## Quick Status (Done / Not Done / TBD)

### Done

- [x] Core live agent runtime implemented (`/ws/live`, camera, voice, HUD, barge-in).
- [x] Gemini Live model integration implemented and cloud runtime calls verified by logs.
- [x] Barcode-optional camera fallback implemented (frame hint + catalog fallback).
- [x] Backside nutrition/ingredients prompt implemented for weak product data.
- [x] Conversational fallback upgraded:
  - social turns are handled directly (no forced product lookup loops),
  - no-product turns request name + brand + nutrition values word-by-word.
- [x] Lay's fallback robustness upgraded:
  - query alias expansion (`lays classic chips`, `lays chips`, `lays`),
  - locale retry path (`de` -> `en` -> `world/en`) on empty catalog responses.
- [x] Gemini real-agent runtime defaults hardened:
  - Vertex mode enabled by default,
  - Cloud Run project auto-detection,
  - native voice generation enabled (prebuilt voice left provider-managed for natural variation).
- [x] Local validation green:
  - [x] backend tests (`30 passed`)
  - [x] frontend build (`vite build`)

### Not Done

- [ ] Target-browser field validation sign-off (stable recognition + stable speaking loop).
- [ ] Field-verify patched Lay's and camera-intent fallback on target browser/device (code fix shipped; runtime confirmation pending).
- [ ] Public repo link finalized.
- [ ] Setup guide validated from clean environment.
- [ ] Demo video + visible cloud proof finalized.
- [ ] Budget/IAM/Secret least-privilege hardening sign-off.

### TBD

- [ ] Frontend deployment governance decision:
  - [ ] keep manual `gcloud` path, or
  - [ ] move frontend deployment fully into Terraform lifecycle.
- [ ] Optional API enablement decisions (`redis`, `firebasehosting`, `speech`, `texttospeech`).
- [ ] Cosmetics beta scope in final submission narrative.

## Gate 0 - Scope and Requirement Lock

- [x] Requirement sources reviewed (`project_management/requirements_baseline/*`).
- [x] Scope boundary locked (Food MVP mandatory, Cosmetics Basic Beta decision recorded).
- [x] Requirement IDs mapped to planned tasks.
- [x] Acceptance criteria defined for all critical flows.
- [x] Open blocking questions resolved (deadline, approver, project ID, product lists).

## Gate Q - Hackathon Qualification (Mandatory)

- [x] Selected challenge track: Live Agent (realtime multimodal).
- [x] Requirement lock from challenge transcript captured in docs.
- [x] Gemini integration path implemented in backend code (`backend/app/main.py`).
- [x] Google GenAI SDK dependency declared (`backend/requirements.txt`).
- [x] Gemini runtime call validated with real credentials in cloud (user log evidence: repeated `setupComplete` session IDs from Gemini Live).
- [x] At least one Google Cloud service is provisioned by IaC definition (Cloud Run/Vertex/Secret Manager via Terraform).
- [x] Cloud deployment is live and publicly demonstrable (Cloud Run URI created).
- [ ] Public code repository is available and linked.
- [x] Architecture diagram is created and included in repo (`README.md` mermaid diagram).
- [ ] Setup guide is complete and reproducible from clean environment.
- [ ] Demo video < 4:00 exists and shows real-time operation (no mockups).
- [ ] Demo video includes visible Google Cloud proof (Cloud Run dashboard and/or live URL).
- [ ] Submission package finalized before deadline: 2026-03-16 17:00 PDT.

## Gate 1 - Cloud and Runtime Foundation

- [x] GCP project selected and access verified (`light-client-488312-r3`).
- [x] Required cloud services enabled (Cloud Run, Vertex AI, Secret Manager).
- [x] Core APIs enabled:
  - [x] `aiplatform.googleapis.com`
  - [x] `run.googleapis.com`
  - [x] `secretmanager.googleapis.com`
  - [x] `cloudbuild.googleapis.com`
  - [x] `artifactregistry.googleapis.com`
  - [x] `cloudresourcemanager.googleapis.com`
- [ ] Optional APIs decision recorded:
  - [ ] `redis.googleapis.com` (Memorystore)
  - [ ] `firebasehosting.googleapis.com` (if frontend hosting requires it)
  - [ ] `speech.googleapis.com` (only if separate STT is used)
  - [ ] `texttospeech.googleapis.com` (only if separate TTS is used)
- [x] Secret handling strategy approved (server-side only).
- [x] Runtime configuration documented.
- [x] Baseline deployment smoke test passes.
- [x] Terraform bootstrap state backend created (GCS bucket with versioning).
- [x] Terraform prod environment initialized with remote backend.
- [ ] Terraform plan reviewed (no unintended resources).
- [x] Terraform apply completed for baseline stack.
- [ ] Budget guardrail configured (or explicitly skipped):
  - [ ] `enable_budget_alerts=true` with `billing_account_id` set, OR
  - [ ] documented decision to skip for hackathon.
- [ ] Cloud Run runtime service account IAM verified.
- [ ] Secret Manager access policy verified (least privilege).
- [x] Frontend hosting decision implemented:
  - [x] Frontend Cloud Run deployed (manual gcloud path), OR
  - [ ] external hosting configured with `VITE_BACKEND_WS_URL`.
- [x] Optional data layer decision implemented:
  - [x] In-memory only (MVP default) OR
  - [ ] Memorystore enabled OR
  - [ ] Cloud SQL enabled

## Gate 2 - Live Session and Streaming Core

- [x] Live session websocket backend implemented (`/ws/live`).
- [x] Frontend camera stream capture implemented (`getUserMedia`).
- [x] Video/frame pipeline wired (frontend sends 1 FPS JPEG frames to backend).
- [x] Barge-in event path wired frontend <-> backend.
- [ ] User runtime validation passed (latest field run currently failed):
  - [ ] no `Kein Backend-Uplink` during session start/query.
  - [ ] camera permission prompt appears and stream starts.
  - [ ] scan/HUD/Nutri score path renders in live session.
- [x] Audio input pipeline works end-to-end with model streaming.
- [x] Audio output pipeline uses model audio stream (not only browser speech synthesis).
- [x] Gemini model-audio is preferred before browser TTS fallback.
- [x] Always-on voice loop active during live session (no per-turn mic re-arm).
- [x] Ambient/background audio is muted during active live session.
- [x] Backside nutrition-table prompt emitted when product fields are incomplete.
- [x] Multilingual session language path implemented (`DE/EN/ES/FR/HI/IT/PT`).
- [x] Camera-first low-signal fallback active (non-product/empty query triggers frame hint inference).
- [x] Assistant-echo transcript guard active (agent speech is filtered from product search path).
- [x] Session reconnect behavior tested.
- [x] Stable realtime loop demonstrated on cloud endpoint.

## Gate 3 - Product Identification Reliability

- [x] `get_product_by_barcode` implemented (`backend/app/tools.py`).
- [x] `search_product_catalog` fallback implemented (`backend/app/tools.py`).
- [x] Confidence score included in result payload.
- [x] Disambiguation question path implemented for close candidates.
- [x] Whole-food fallback path implemented for unpackaged produce (apple/banana/orange baseline).
- [ ] Demo product list identification success rate meets target.

## Gate 4 - Scoring and Policy Correctness

- [x] `evaluate_ingredients_regulatory` implemented (`backend/app/scoring.py`).
- [x] `normalize_and_score` implemented (`backend/app/scoring.py`).
- [x] Regulatory categories implemented in code:
  - [x] authorized
  - [x] restricted
  - [x] warning_required
  - [x] not_authorized
  - [x] uncertain
- [ ] Food score components validated with test dataset.
- [ ] Cosmetics safety tier components validated with test dataset.
- [x] Date interpretation logic validated:
  - [x] MHD path
  - [x] use-by path

## Gate 5 - UX and Explainability

- [x] Frontend HUD renders dynamic backend events and warnings.
- [x] Warning chips and metric bars render correctly from payload.
- [x] Low-confidence user messaging is explicit.
- [x] Disclaimer is visible and approved.
- [x] Agent asks for backside ingredients/nutrition view when API fields are incomplete.
- [x] Session-start conversational greeting implemented (agent asks for product/barcode guidance).
- [ ] Voice input quality acceptable in target demo environment (latest run had unstable transcription).
- [ ] Spoken output constrained to final 2-3 sentence policy under real model output.
- [x] HUD schema contract tests added.

## Gate 6 - Quality and Reliability

- [x] Unit tests pass for scoring/policy/date logic.
- [x] Contract tests pass for tool input/output schema.
- [x] Integration tests pass for barcode and fallback flows.
- [x] Timeout and source-failure fallback behavior tested.
- [x] Caching behavior measured and acceptable.
- [ ] No critical defects open.

## Gate 7 - Demo and Submission Readiness

- [ ] Demo script finalized and approved.
- [ ] Demo run passes three consecutive full rehearsals.
- [x] Architecture diagram complete and accurate.
- [ ] Cloud deployment proof captured.
- [ ] Repo run instructions verified from clean environment.
- [ ] Final submission fields completed and reviewed.

## Quality Notes (Corrections Applied)

- [x] Do not assume OFF/OBF require private API keys for normal read access.
- [ ] Do not claim legal status without explicit policy mapping evidence.
- [ ] Do not treat Cosmetics Beta as MVP unless explicitly approved.
- [x] Keep spoken legal claims conservative; put details in debug/HUD.
