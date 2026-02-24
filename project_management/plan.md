# Project Plan (Execution Focus)

This plan is intentionally concise. Detailed operational state is tracked in `status.md` and `checklist.md`.

## 1) Planning Inputs

Source documents:

- `project_management/requirements_from_user.md`
- `project_management/requirements_baseline/*`
- `project_management/hackathon-absolute-requirements.md`
- `project_management/checklist.md`

## 2) Goal

Deliver a stable Live Agent submission with:

1. Working cloud-deployed backend.
2. Reliable live camera+voice+HUD flow.
3. Mandatory submission artifacts (public repo, architecture diagram, setup guide, demo video).

## 3) Phase Sequence

## Phase A - Cloud Foundation

- Confirm canonical project config and API enablement.
- Complete Terraform apply and backend image deployment.
- Validate cloud health endpoint and websocket reachability.

## Phase B - Runtime Reliability

- Validate barcode-first and fallback paths on demo products.
- Validate uncertain-match and barge-in behavior.
- Validate date guidance flow (MHD/use-by).

## Phase C - QA and Hardening

- Keep unit tests green.
- Add/execute missing contract/integration checks where needed.
- Measure critical latency and fallback behavior.

## Phase D - Submission Packaging

- Finalize architecture diagram.
- Verify setup guide from clean environment.
- Record <4 minute demo with visible cloud proof.
- Final checklist sign-off.

## 4) Execution Rule

- Do not close a phase until required checklist items are marked complete with evidence.
