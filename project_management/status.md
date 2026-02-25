# Project Status - 2026-02-25

This file is the single daily status view.

## 0) Developer Handoff (Read First)

### Runtime entrypoints

- Backend websocket runtime: `backend/app/main.py` (`live_session`).
- Backend Gemini Live integration: `backend/app/main.py` (`_gemini_live_refine_text`, `_send_model_speech`).
- Frontend live agent loop: `frontend/src/App.jsx` (`startSession`, `connectSocket`, `playServerAudio`, `startVoiceRecognitionLoop`).
- Test coverage for websocket contracts: `backend/tests/test_websocket_contracts.py`.

### What was fixed in the latest pass (2026-02-25)

- Removed Gemini SDK warning flood (`non-text parts ... inline_data`) by stopping `.text` accessor usage on streaming responses and parsing text parts explicitly.
- Coalesced Gemini model audio chunks before websocket emission:
  - PCM/L16 chunks are merged and wrapped once as WAV.
  - non-PCM responses are reduced to a single best chunk to avoid frontend playback thrash.
- Hardened frontend model-audio playback:
  - decode data URL/base64 to Blob + object URL,
  - clean object URL lifecycle/revocation,
  - browser TTS fallback if model-audio start fails.
- Prevented duplicate live-session startup races:
  - startup re-entry guard (`sessionStartingRef`),
  - stale websocket event guard in `onmessage/onerror/onclose`.
- Removed noisy backend `tool_call` spam on every incoming frame.
- Added anti-echo and low-signal filtering so the agent does not re-search its own spoken sentences:
  - frontend STT ignores transcripts while model audio is active/speaking,
  - backend drops assistant-echo query phrases before catalog search.
- Camera-first recognition improved for non-barcode flows:
  - low-signal queries (for example `hello`) trigger frame-based product hint inference,
  - normalized hint mapping for Lay's-style packets (`lays classic chips`),
  - secondary frame-hint retry when first catalog search misses.
- Conversational turn routing improved:
  - social/identity intents (for example `good morning`, `who are you`) now receive direct spoken agent responses instead of product-search uncertainty.
  - no-product intents (for example `I don't have it with me`) trigger structured step-by-step guidance (name word-by-word, brand, nutrition values, barcode/photo fallback).
- Catalog fallback robustness improved for snack products:
  - Lay's-style query variants are expanded automatically (`lays classic chips`, `lays chips`, `lays`),
  - locale fallback retry (`de` -> `en` -> `world/en`) is applied when initial search is empty.
- Whole-food fallback coverage improved for unpackaged fruit wording:
  - expanded aliases for apple/banana/orange variants (`apples`, `red apple`, `green apple`, etc.).
- Frontend speech playback handoff improved:
  - per-turn model-audio tracking reduces premature browser-TTS fallback,
  - longer fallback window gives Gemini native audio priority when network jitter is present.
- Gemini runtime defaults hardened for real-agent mode:
  - Vertex path enabled by default,
  - project auto-detection from Cloud Run env (`GOOGLE_CLOUD_PROJECT`/`GCP_PROJECT`),
  - native audio response path prioritized with retry when first response misses audio.

### Remaining blockers for next developer (explicit)

1. Field-verify model voice playback on target browser/device with real Vertex runtime.
   - Why still open: local build/tests pass, but browser codec/autoplay behavior is environment-specific.
   - Where to change if failing: `frontend/src/App.jsx` (`playServerAudio`, `speech_audio` handler), `backend/app/main.py` (`_coalesce_model_audio`).
2. Improve speech-to-text robustness in noisy room conditions.
   - Why still open: browser Web Speech API accuracy depends on mic/hardware/accent/noise.
   - Where to change: `frontend/src/App.jsx` (`startVoiceRecognitionLoop`, confidence filter in `onresult`).
3. Field-verify conversational quality and voice style in target demo environment.
   - Why still open: prompt routing is patched, but browser/device playback and perceived naturalness are environment-specific.
   - Where to change if needed: `backend/app/main.py` (`_classify_social_intent`, `_social_prompt`, `_gemini_live_refine_text`), `frontend/src/App.jsx` (`speech_audio`/TTS fallback handling).
4. Complete hackathon submission artifacts (public repo link, final video, clean-env setup proof).
   - Where to change: `README.md`, `project_management/checklist.md`, submission package.

## 0A) Snapshot (Done / Not Done / TBD)

### Done (verified)

- Live backend websocket flow + Gemini Live integration are implemented and running.
- Camera-first + voice-first runtime exists (barcode optional fallback path active).
- Anti-echo protections are implemented (agent speech is filtered from re-query loop).
- Backside prompt flow is implemented when nutrition/ingredient data is incomplete.
- Local quality gates pass:
  - backend tests: `25 passed`,
  - frontend production build: success.
- Cloud deployment exists and is reachable (backend + frontend URLs already documented).

### Not Done (must finish for submission)

- Real field validation sign-off is still open in target browser/device:
  - prove stable product recognition + stable spoken behavior in end-to-end run.
- Public repository submission link is not finalized.
- Clean-environment setup validation is not finalized.
- Final demo video (<4 min) with visible Google Cloud proof is not finalized.
- Budget guardrail + IAM least-privilege verification still open.

### TBD (decision pending)

- Keep manual frontend deployment path vs full Terraform-managed frontend lifecycle.
- Optional APIs enablement decision (`redis`, `firebasehosting`, `speech`, `texttospeech`).
- Cosmetics beta expansion scope for submission narrative.
- Final quality threshold for demo product identification success rate.

## 1) Done

### Code and runtime

- Backend websocket flow implemented (`/ws/live`) with:
  - barcode-first lookup,
  - fallback search,
  - disambiguation event path,
  - date guidance (MHD/use-by),
  - HUD + speech events.
- Backend Gemini path upgraded to Live API usage (Google GenAI SDK `client.aio.live.connect`) with:
  - frame context handoff to Gemini Live,
  - optional audio chunk handoff,
  - model audio chunk extraction and websocket emission (`speech_audio`),
  - output-audio transcription capture for text fallback while prioritizing model voice,
  - deterministic fallback on timeout/errors,
  - text extraction path without `.text` accessor warning spam,
  - coalesced audio output to reduce playback failures on frontend.
- Live model defaults aligned to documented IDs:
  - Vertex: `gemini-live-2.5-flash-native-audio`
  - API-key: `gemini-2.5-flash-native-audio-preview-12-2025`
- Vertex model location default updated to `europe-west4` for Live model compatibility while keeping infra region at `europe-west3`.
- Frontend integrated with backend websocket events and state machine:
  - connecting, processing, speaking, interrupted, uncertain-match.
- Frontend runtime reliability improved with:
  - visible session start/stop control labels,
  - runtime diagnostics strip (`WS`, camera, scan mode, audio mode + error details),
  - camera fallback constraints when `facingMode=environment` is unavailable,
  - backend-model audio playback path (`speech_audio`) with browser TTS fallback only when needed,
  - optional on-device `BarcodeDetector` auto-scan query path,
  - browser-locale language default (`DE/EN/ES/FR/HI/IT/PT`) to reduce STT mismatch,
  - low-confidence speech-recognition guardrail for short/noisy transcripts,
  - throttled auto vision-probe turns (empty query) to trigger frame-based fallback without manual typing,
  - always-on microphone loop while session is active (no per-turn re-arm),
  - ambient/background audio fully suppressed during active live session,
  - delayed browser-TTS fallback so Gemini model audio is preferred first,
  - startup guard against duplicate websocket sessions.
- Backend uncertainty handling hardened:
  - spoken guidance is now emitted for uncertain/disambiguation states (not HUD-only silence),
  - frame-only turns can infer barcode/name hint via Gemini multimodal call before fallback search,
  - explicit backside prompt for ingredients + nutrition table when API fields are incomplete.
- Session behavior upgraded to conversational agent style:
  - Gemini-backed greeting on session start,
  - asks user to bring product closer and requests product name/barcode when vision is unclear.
- Food fallback coverage expanded:
  - unpackaged whole-food profile path (apple/banana/orange) with kcal-per-100g HUD metrics and spoken guidance.
- Uncertain-match candidate selection UI implemented from backend `details.candidates`.
- Frontend websocket URL now supports:
  - `VITE_BACKEND_WS_URL` override for cloud deployments,
  - dev fallback to `ws://<host>:8000/ws/live`,
  - prod fallback to same-origin `/ws/live`.
- Terraform architecture expanded with optional:
  - frontend Cloud Run service + dedicated frontend runtime service account,
  - monthly billing budget guardrail alerts (with notification routing support).
- Frontend production containerization added (`frontend/Dockerfile`, `frontend/nginx.conf`) for optional Terraform Cloud Run frontend deployment.
- Terraform cost defaults tightened:
  - backend memory reduced to `512Mi`,
  - backend max instances reduced to `1`,
  - backend concurrency set to `40`.
- Terraform bootstrap state bucket hardened with `prevent_destroy` safety.

### Tests

- Backend tests passing locally: `25 passed`.
  - includes websocket contract/integration tests,
  - tool schema + source-failure fallback tests,
  - cache behavior tests,
  - spoken-uncertainty + frame-hint fallback websocket tests,
  - backside guidance + whole-food fallback websocket tests.
- Frontend production build passing locally (`vite build`).

### Cloud deployment evidence (user-verified)

- Terraform apply completed in prod with outputs:
  - `cloud_run_service_name = nutrivision-backend`
  - `cloud_run_service_uri = https://nutrivision-backend-lhok5n7jnq-ey.a.run.app`
  - `runtime_service_account_email = nutrivision-backend-sa@light-client-488312-r3.iam.gserviceaccount.com`
  - enabled APIs include:
    - `aiplatform.googleapis.com`
    - `artifactregistry.googleapis.com`
    - `cloudbuild.googleapis.com`
    - `cloudresourcemanager.googleapis.com`
    - `run.googleapis.com`
    - `secretmanager.googleapis.com`
- Note:
  - root path (`/`) currently returns `404` by design,
  - health check endpoint is `/health`,
  - websocket endpoint is `/ws/live`.
- Smoke checks executed from this workspace:
  - `GET /health` returned `{"status":"ok"}`.
  - websocket upgrade to `/ws/live` returned `101 Switching Protocols` and initial `session_state`.
  - websocket turn test on `/ws/live` returned:
    - `tool_call`,
    - `hud_update` (BiFi barcode sample),
    - `speech_text`,
    - `session_state: Turn complete`.
- Runtime deployment updates executed from this workspace:
  - backend redeployed to revision `nutrivision-backend-00002-rng`
  - backend URL: `https://nutrivision-backend-1004241490697.europe-west3.run.app`
  - frontend deployed to Cloud Run:
    - service: `nutrivision-frontend`
    - URL: `https://nutrivision-frontend-1004241490697.europe-west3.run.app`
  - frontend bundle confirms backend websocket target:
    - `wss://nutrivision-backend-1004241490697.europe-west3.run.app/ws/live`
- User runtime logs confirm Gemini Live setup succeeded with real credentials:
  - repeated `setupComplete` session IDs from `google_genai.live` during active sessions.

### Failed field run evidence (user-reported, 2026-02-25 around 11:07-11:08 and 15:59-16:01)

- Observed logs from frontend:
  - `[11:07:49] Audio decoded: hallo Kenny Hermi`
  - `[11:08:06] Audio decoded: Kelly Family`
  - `[11:08:06] Kein Backend-Uplink.`
  - `[11:07:49] Kein Backend-Uplink.`
  - `[11:07:28] System initialisiert. Warte auf Video-Uplink.`
- User-observed functional failures:
  - microphone transcription quality is unstable/inaccurate,
  - no working backend uplink from frontend session,
  - no camera option available in active flow,
  - no scanning/HUD/Nutri score visible.
- Mitigation implemented in code:
  - stronger frontend uplink diagnostics,
  - explicit session controls and camera visibility fix,
  - backend audio playback and scanner auto-detection path.
- Remaining action:
  - re-validate runtime from user browser/device against latest frontend build.
  - latest field run still showed STT semantic drift:
    - spoken intent like `lays packet`/`it is in front of me` became queries such as `multi showing` or `see its in front of me`,
    - backend then matched unrelated products (`Awesome Nut and Chew Bar`) in some turns.
  - mitigation added in code:
    - voice-noise query detection expanded,
    - camera-intent phrase routing (`what are you seeing`, `what is it`, `in front of me`),
    - frame-hint-first correction for noisy voice turns,
    - unresolved noisy turns now avoid blind OFF search and fall back to clarification flow.

### Documentation cleanup

- Requirements baseline moved under project management:
  - `project_management/requirements_baseline/*`
- Requirements baseline files numbered for fixed read order:
  - `01_business-requirements.md`
  - `02_ux-demo-requirements.md`
  - `03_technical-baseline.md`
- `README.md` simplified.
- `start.md` simplified and de-duplicated.
- `docs/README.md` and `project_management/README.md` clarified ownership.
- `hackathon-absolute-requirements.md` rewritten in clean structured format.
- Canonical project ID normalized in active execution docs:
  - `light-client-488312-r3`
- README expanded with:
  - architecture diagram (mermaid),
  - requirement-to-implementation mapping,
  - reproducible local/cloud steps,
  - cloud proof commands.

## 2) Pending

### P0 - Must finish for functional cloud readiness

1. Validate patched frontend runtime in user environment:
   - no `Kein Backend-Uplink` during session start/query,
   - camera permission prompt appears and stream starts,
   - scan->HUD->verdict path renders in live session,
   - always-on mic captures multiple turns without re-clicking mic,
   - no ambient music during active live session,
   - backside nutrition prompt appears when fields are incomplete.
   - explicit open issue from field run (2026-02-25 14:37 and 15:59-16:01 local): yellow Lay's packet not reliably recognized; STT drift can still push wrong catalog candidates.
   - status: backend fallback logic patched (query/locale retries + voice-noise guards + camera-intent routing); field validation still required.
2. Set budget guardrail settings (`enable_budget_alerts`, `billing_account_id`) and apply.
3. Optionally sync manual Cloud Run deploy with Terraform state strategy (or keep manual path for hackathon speed).

### P1 - Must finish for submission readiness

1. Public repo final check and link confirmation.
2. Setup guide validation from clean environment.
3. Final demo video (<4 minutes) with visible Google Cloud proof.
4. Public cloud proof recording (Cloud Run console and/or live URL walkthrough).

### P2 - Technical completeness gap

1. Validate scoring quality targets on demo dataset (food + cosmetics beta).
2. Confirm cloud runtime stability on three consecutive rehearsal runs.

## 3A) Neat TODOs (Execution Board)

### Now (Do Today)

1. Add secret payloads at apply-time (no secrets in files):
   - `off_user_agent` (required)
   - optional `gemini_api_key` (only if API-key mode)
2. Resolve frontend runtime blocker in user setup:
   - websocket URL/env verification,
   - browser permission reset (camera/mic),
   - session start flow to connected state.
3. Verify deployed backend:
   - `GET /health`
   - websocket handshake on `/ws/live`
4. Record cloud proof clip (Cloud Run page + live URI).

### Next (Do Tomorrow)

1. Pick frontend path and deploy:
   - `enable_frontend_cloud_run=true` with frontend image, or
   - external hosting with `VITE_BACKEND_WS_URL`.
2. Run cloud websocket smoke test and record evidence.
3. Enable monthly budget alert if billing account is available.

## 3) Immediate Next Actions (Execution Order)

1. Run backend image build/push.
2. Run Terraform plan/apply.
3. Smoke test cloud health endpoint.
4. End-to-end frontend-to-cloud websocket validation.
5. Capture cloud proof artifacts (console + live URL).
6. Update checklist with cloud evidence.

## 4) Known Risks

1. Frontend runtime still needs field validation on your target browser/device.
2. Submission artifacts still pending (cloud proof + final video + clean-environment validation).
