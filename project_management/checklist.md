# NutriVision Live - Corrected Checklist (Spec-Driven)

Use this as a gate-based checklist. A gate closes only when all mandatory items are checked.

## Gate 0 - Scope and Requirement Lock

- [x] Requirement sources reviewed (`docs/requirements/*`).
- [x] Scope boundary locked (Food MVP mandatory, Cosmetics Basic Beta decision recorded).
- [x] Requirement IDs mapped to planned tasks.
- [x] Acceptance criteria defined for all critical flows.
- [x] Open blocking questions resolved (deadline, approver, project ID, product lists).

## Gate Q - Hackathon Qualification (Mandatory)

- [x] Selected challenge track: Live Agent (realtime multimodal).
- [x] Requirement lock from challenge transcript captured in docs.
- [x] Gemini integration path implemented in backend code (`backend/app/main.py`).
- [x] Google GenAI SDK dependency declared (`backend/requirements.txt`).
- [ ] Gemini runtime call validated with real credentials in cloud.
- [x] At least one Google Cloud service is provisioned by IaC definition (Cloud Run/Vertex/Secret Manager via Terraform).
- [ ] Cloud deployment is live and publicly demonstrable.
- [ ] Public code repository is available and linked.
- [ ] Architecture diagram is created and included in repo.
- [ ] Setup guide is complete and reproducible from clean environment.
- [ ] Demo video < 4:00 exists and shows real-time operation (no mockups).
- [ ] Demo video includes visible Google Cloud proof (Cloud Run dashboard and/or live URL).
- [ ] Submission package finalized before deadline: 2026-03-16 17:00 PDT.

## Gate 1 - Cloud and Runtime Foundation

- [x] GCP project selected and access verified (`nutrivision-liveagent-2026`).
- [ ] Required cloud services enabled (Cloud Run, Vertex AI, Secret Manager).
- [ ] Core APIs enabled:
  - [ ] `aiplatform.googleapis.com`
  - [ ] `run.googleapis.com`
  - [ ] `secretmanager.googleapis.com`
  - [ ] `cloudbuild.googleapis.com`
  - [ ] `artifactregistry.googleapis.com`
  - [ ] `cloudresourcemanager.googleapis.com`
- [ ] Optional APIs decision recorded:
  - [ ] `redis.googleapis.com` (Memorystore)
  - [ ] `firebasehosting.googleapis.com` (if frontend hosting requires it)
  - [ ] `speech.googleapis.com` (only if separate STT is used)
  - [ ] `texttospeech.googleapis.com` (only if separate TTS is used)
- [x] Secret handling strategy approved (server-side only).
- [ ] Runtime configuration documented.
- [ ] Baseline deployment smoke test passes.
- [ ] Terraform bootstrap state backend created (GCS bucket with versioning).
- [ ] Terraform prod environment initialized with remote backend.
- [ ] Terraform plan reviewed (no unintended resources).
- [ ] Terraform apply completed for baseline stack.
- [ ] Cloud Run runtime service account IAM verified.
- [ ] Secret Manager access policy verified (least privilege).
- [ ] Optional data layer decision implemented:
  - [ ] In-memory only (MVP default) OR
  - [ ] Memorystore enabled OR
  - [ ] Cloud SQL enabled

## Gate 2 - Live Session and Streaming Core

- [x] Live session websocket backend implemented (`/ws/live`).
- [x] Frontend camera stream capture implemented (`getUserMedia`).
- [x] Video/frame pipeline wired (frontend sends 1 FPS JPEG frames to backend).
- [x] Barge-in event path wired frontend <-> backend.
- [ ] Audio input pipeline works end-to-end with model streaming.
- [ ] Audio output pipeline uses model audio stream (not only browser speech synthesis).
- [ ] Session reconnect behavior tested.
- [ ] Stable realtime loop demonstrated on cloud endpoint.

## Gate 3 - Product Identification Reliability

- [x] `get_product_by_barcode` implemented (`backend/app/tools.py`).
- [x] `search_product_catalog` fallback implemented (`backend/app/tools.py`).
- [x] Confidence score included in result payload.
- [ ] Disambiguation question path implemented for close candidates.
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
- [ ] Date interpretation logic validated:
  - [ ] MHD path
  - [ ] use-by path

## Gate 5 - UX and Explainability

- [x] Frontend HUD renders dynamic backend events and warnings.
- [x] Warning chips and metric bars render correctly from payload.
- [x] Low-confidence user messaging is explicit.
- [x] Disclaimer is visible and approved.
- [ ] Spoken output constrained to final 2-3 sentence policy under real model output.
- [ ] HUD schema contract tests added.

## Gate 6 - Quality and Reliability

- [ ] Unit tests pass for scoring/policy/date logic.
- [ ] Contract tests pass for tool input/output schema.
- [ ] Integration tests pass for barcode and fallback flows.
- [ ] Timeout and source-failure fallback behavior tested.
- [ ] Caching behavior measured and acceptable.
- [ ] No critical defects open.

## Gate 7 - Demo and Submission Readiness

- [ ] Demo script finalized and approved.
- [ ] Demo run passes three consecutive full rehearsals.
- [ ] Architecture diagram complete and accurate.
- [ ] Cloud deployment proof captured.
- [ ] Repo run instructions verified from clean environment.
- [ ] Final submission fields completed and reviewed.

## Quality Notes (Corrections Applied)

- [x] Do not assume OFF/OBF require private API keys for normal read access.
- [ ] Do not claim legal status without explicit policy mapping evidence.
- [ ] Do not treat Cosmetics Beta as MVP unless explicitly approved.
- [x] Keep spoken legal claims conservative; put details in debug/HUD.
