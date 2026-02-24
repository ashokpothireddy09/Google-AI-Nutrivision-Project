# Project Status - 2026-02-24

This file is the single daily status view.

## 1) Done

### Code and runtime

- Backend websocket flow implemented (`/ws/live`) with:
  - barcode-first lookup,
  - fallback search,
  - disambiguation event path,
  - date guidance (MHD/use-by),
  - HUD + speech events.
- Frontend integrated with backend websocket events and state machine:
  - connecting, processing, speaking, interrupted, uncertain-match.
- Disambiguation UI flow implemented with candidate selection.

### Tests

- Backend tests are passing (`6 passed`):
  - scoring and policy checks,
  - date guidance checks,
  - disambiguation decision logic checks.
- Pytest import/cache issues were fixed with:
  - `backend/tests/conftest.py`
  - `backend/pytest.ini`

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

## 2) Pending

### P0 - Must finish for functional cloud readiness

1. Build and push backend image to Artifact Registry.
2. Run full Terraform apply for prod environment.
3. Validate cloud endpoint (`/health`) and websocket flow against deployed backend.
4. Decide and provision frontend cloud hosting target (not yet in Terraform).

### P1 - Must finish for submission readiness

1. Public repo final check and link confirmation.
2. Architecture diagram creation and inclusion in repo.
3. Setup guide validation from clean environment.
4. Final demo video (<4 minutes) with visible Google Cloud proof.

### P2 - Technical completeness gap

1. Implement true Gemini live audio stream output (backend -> frontend audio) as primary path.
   - Current fallback: frontend uses browser TTS from text response.

## 3) Immediate Next Actions (Execution Order)

1. Run backend image build/push.
2. Run Terraform plan/apply.
3. Smoke test cloud health endpoint.
4. End-to-end frontend-to-cloud websocket validation.
5. Update checklist and this status file with evidence.

## 4) Known Risks

1. Frontend hosting path still undecided.
2. Live model audio output path not yet implemented.
3. Submission artifacts still pending (diagram + final video).
