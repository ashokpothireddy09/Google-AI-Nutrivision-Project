# NutriVision Live - Corrected Project Plan (Spec-Driven)

This plan is corrected and aligned to the requirement sources in `docs/requirements/` and the execution pack in `docs/project-execution-spec/`.

## 1) Planning Baseline

- Delivery model: Spec-Driven Development (requirements -> design -> implementation -> verification).
- Primary scope: Food MVP first, Cosmetics as controlled Basic Beta moment.
- Mandatory challenge constraints:
  - Use a Gemini model.
  - Use Google GenAI SDK or ADK.
  - Use at least one Google Cloud service.
  - Deliver repo, architecture diagram, deployment proof, and demo video.

## Locked Decisions From Intake

- Hard deadline: Tuesday, 17 March 2026 @ 01:00 (CET, Europe/Berlin)
- Review/approval owner: Ashok Pothireddy
- GCP project ID: nutrivision-liveagent-2026
- Frontend: React (Vite)
- Backend: Python 3.11 + FastAPI
- SDK: ADK
- Cloud services: Cloud Run + Vertex AI + Secret Manager
- Optional performance add-on: Memorystore (Redis)
- Region preference: europe-west3
- Language mode: bilingual (German-first output)
- Demo strategy: stability-first with one cosmetics basic moment
- Legal tone: conservative spoken wording, detailed references in debug/HUD only
- Target performance:
  - <= 1.5s first verdict (barcode path)
  - <= 3.0s first verdict (fallback path)
  - <= 300ms barge-in pivot
- Primary demo products:
  - Nutella Haselnusscreme 450g
  - BiFi Original XXL (EAN: 4251097401447)
  - SweetDoughThings Honey Flavour Sugar-Free Candy Floss 12g (EAN: 5060764080149)
  - Alnatura Bio Haferflocken Grossblatt 500g
  - Head & Shoulders Classic Clean Shampoo 250ml
- Backup demo products:
  - Coca-Cola Zero Zucker 0,33l
  - Barilla Spaghetti No. 5 500g
  - Haribo Goldbaeren 200g
  - NIVEA Creme (blue tin)
  - Sensodyne toothpaste

## Current Implementation Baseline (2026-02-23)

- Frontend:
  - React/Vite UI with live camera stream (`getUserMedia`)
  - WebSocket client sending frame events and user queries
  - Dynamic HUD rendering from backend events
- Backend:
  - FastAPI websocket proxy (`/ws/live`)
  - Tool contracts implemented for barcode lookup, search fallback, policy evaluation, and score normalization
  - Optional Gemini text refinement path via Google GenAI SDK
- Infrastructure:
  - Terraform bootstrap/prod/module layout implemented for Cloud Run + Vertex AI API + Secret Manager + Artifact Registry
- Remaining to fully qualify:
  - Apply cloud deployment and validate live runtime
  - Publish remote public repository
  - Add architecture diagram and clean setup guide
  - Record under-4-minute demo with explicit Google Cloud proof

## 2) Phase Model with Entry/Exit Gates

## Phase 0 - Scope Lock and Environment Readiness

- Goal (business): lock demo story and success criteria.
- Goal (technical): lock stack, project, and credentials model.
- Core tasks:
  - Consolidate requirements and freeze MVP/Beta boundaries.
  - Confirm stack choices (frontend, backend, SDK).
  - Prepare GCP project and enable required services.
  - Configure secret strategy (server-side only).
  - Define non-goals and known exclusions.
- Entry criteria:
  - Requirement docs reviewed.
- Exit criteria:
  - Signed scope and acceptance criteria.
  - All P1 open questions answered.

## API Enablement Baseline (Gate 1)

Core APIs to enable:

- `aiplatform.googleapis.com` (Vertex AI; includes Gemini/Live usage)
- `run.googleapis.com` (Cloud Run backend)
- `secretmanager.googleapis.com` (secret storage)
- `cloudbuild.googleapis.com` (build/deploy pipeline)
- `artifactregistry.googleapis.com` (container image registry)
- `cloudresourcemanager.googleapis.com` (project/service management workflows)

Optional APIs (enable only if used):

- `redis.googleapis.com` (Memorystore Redis cache)
- `firebasehosting.googleapis.com` (if frontend is deployed to Firebase Hosting)
- `speech.googleapis.com` (only if using separate Speech-to-Text)
- `texttospeech.googleapis.com` (only if using separate Text-to-Speech)

Note:

- `Generative AI on Vertex AI` is not a separate API to enable; it runs through Vertex AI API.

## Terraform Infrastructure Plan (What Is Needed)

This section defines the Terraform scope to provision the full hackathon infrastructure baseline.

### A) Terraform project layout

- `infra/terraform/bootstrap`
  - One-time state backend resources (GCS state bucket + versioning + uniform access)
- `infra/terraform/environments/prod`
  - Main stack for this hackathon deployment
- `infra/terraform/modules/*`
  - Reusable modules for APIs, IAM, Cloud Run, secrets, and optional data services

### B) Resources to provision with Terraform

1. Core project/API enablement
- Enable required APIs listed in Gate 1:
  - `aiplatform.googleapis.com`
  - `run.googleapis.com`
  - `secretmanager.googleapis.com`
  - `cloudbuild.googleapis.com`
  - `artifactregistry.googleapis.com`
  - `cloudresourcemanager.googleapis.com`

2. Identity and IAM
- Create dedicated runtime service account for backend.
- Bind least-privilege roles:
  - Vertex AI user access for model calls
  - Secret accessor for runtime secret reads
  - Logging writer for structured logs

3. Container build/runtime foundation
- Artifact Registry Docker repository for backend image.
- Cloud Run service for FastAPI websocket backend:
  - Region: `europe-west3`
  - Runtime service account attached
  - Min/max instances, CPU/memory, timeout, concurrency
  - Public or restricted invoker policy (decision-based)

4. Secret management
- Create Secret Manager secrets (no plaintext values in `.tf` files).
- Optional bootstrap only for non-production placeholders.
- Map secrets to Cloud Run environment variables.

5. Database/data layer
- Required for MVP:
  - No relational database required for core MVP functionality.
  - Use stateless backend + external product APIs + in-memory process cache initially.
- Optional database/cache resources:
  - Memorystore (Redis) for low-latency product/policy cache.
  - Optional Cloud SQL Postgres only if persistent internal data is needed (session history, analytics store).

6. Observability and operations
- Cloud Logging integration through Cloud Run logs.
- Optional log-based metrics/alerts for demo stability (error count, restart spikes).

### C) Terraform variables to define

- `project_id`
- `region` (default `europe-west3`)
- `name_prefix` (default `nutrivision`)
- `backend_container_image`
- `backend_min_instances`, `backend_max_instances`
- `backend_cpu`, `backend_memory`
- `allow_unauthenticated`
- `secret_names` and `secret_env_mappings`
- `enable_memorystore` (bool)
- `enable_cloud_sql_postgres` (bool)

### D) Security rules (must enforce)

- No secret values in git.
- Use Secret Manager references in Cloud Run env.
- Use dedicated service account (no default compute service account for runtime).
- Grant only minimum required roles.

### E) Recommended Terraform sequence

1. Apply `bootstrap` stack (state bucket).
2. Configure remote backend for `environments/prod`.
3. Apply `prod` stack in this order:
  - APIs
  - IAM + service account
  - Artifact Registry
  - Secret Manager resources
  - Cloud Run service
  - Optional Redis / optional Cloud SQL
4. Run smoke tests and mark Gate 1 done.

### F) Acceptance criteria for Terraform completion

- `terraform plan` shows only intended resources.
- `terraform apply` succeeds without manual console edits.
- Cloud Run service is reachable and using correct runtime service account.
- Required APIs are enabled and visible in project services.
- Secrets are retrievable only by intended service account.
- Optional database resources are off by default unless explicitly enabled.

## Phase 1 - Realtime Foundation (Session + Streaming)

- Goal (business): make interaction feel live and reliable.
- Goal (technical): establish stable bidirectional session architecture.
- Core tasks:
  - Build backend proxy for live model session.
  - Implement client audio/video capture and streaming.
  - Implement interruption (barge-in) behavior end-to-end.
  - Implement session lifecycle handling (start/turn/end/reconnect).
  - Add structured telemetry for session and failure states.
- Entry criteria:
  - Phase 0 signed.
- Exit criteria:
  - Stable realtime loop demonstrated on cloud environment.

## Phase 2 - Product Identification Pipeline

- Goal (business): trustable and fast identification.
- Goal (technical): deterministic cascade barcode -> fallback search -> clarification.
- Core tasks:
  - Implement `get_product_by_barcode`.
  - Implement `search_product_catalog` fallback.
  - Add candidate confidence handling and disambiguation prompt.
  - Add optional on-device barcode pre-detection.
  - Normalize product payloads to internal schema.
- Important correction:
  - Open Food Facts / Open Beauty Facts are generally public endpoints; API key is not the primary requirement. Strong `User-Agent` and sane request policy are required.
- Exit criteria:
  - Tested successful identification on planned demo products.

## Phase 3 - Scoring, Policy, and Explainability

- Goal (business): concise and defensible guidance.
- Goal (technical): deterministic evaluator + compliant phrasing.
- Core tasks:
  - Implement `evaluate_ingredients_regulatory` policy classification.
  - Implement `normalize_and_score` for food and beauty outputs.
  - Implement expiration interpretation logic (MHD vs use-by).
  - Implement uncertainty path for low-confidence data.
  - Version policy rules and log policy version in outputs.
- Legal wording guardrails:
  - Distinguish: authorized, restricted, warning-required, not-authorized, uncertain.
  - Avoid unsupported legal or medical claims.
- Exit criteria:
  - Deterministic scoring tests pass.
  - Regulatory category mapping tests pass.

## Phase 4 - HUD and UX Completion

- Goal (business): clear "why" in under a few seconds.
- Goal (technical): coherent speech + HUD event rendering.
- Core tasks:
  - Implement HUD event schema and rendering.
  - Add warning chips and metric bars.
  - Align spoken output style (2-3 sentence default).
  - Add confidence and clarification UX paths.
  - Validate German localization strings and date labels.
- Exit criteria:
  - End-to-end user flow works with no manual debug steps.

## Phase 5 - Hardening, Rehearsal, and Submission Package

- Goal (business): flawless demo narrative and submission quality.
- Goal (technical): reliability and artifact completeness.
- Core tasks:
  - Run full regression and scenario tests.
  - Tune latency and cache effectiveness.
  - Rehearse full demo sequence at least 3 consecutive passes.
  - Prepare architecture diagram and deployment evidence.
  - Finalize repository docs and submission text.
- Exit criteria:
  - Submission artifact checklist complete.

## 3) Requirement Trace Mapping

- Identification cascade -> PR-002 / TR-005
- Barge-in behavior -> PR-005 / NFR-003
- Expiration logic -> PR-006
- Policy classification -> DR-002 / DR-004
- Cloud deployment evidence -> TR-003 and submission constraints

## 4) Critical Risks and Mitigations

- Data inconsistency risk:
  - Mitigation: confidence scoring, disambiguation, uncertainty response.
- Latency spikes from external calls:
  - Mitigation: caching, compact field requests, timeout fallback.
- Overclaiming regulatory status:
  - Mitigation: strict category labels + approved wording list.
- Demo instability risk:
  - Mitigation: fixed product set + backup set + fallback narration.

## 5) Deliverables by End of Plan

- Stable Food MVP path (mandatory).
- Cosmetics Beta path (controlled, optional in final demo if unstable).
- Spec-linked checklist completion.
- Final submission pack with cloud proof.

## Pending Inputs (Blockers)

- None at this stage.

## Weekly Milestone Tracker (Active)

| Week | Focus | Planned Outcome | Status | Notes |
|---|---|---|---|---|
| Week 1 | Scope lock + cloud setup | Close Gate 0 and start Gate 1 | In progress | Intake blockers resolved; proceed with cloud enablement and baseline deploy |
