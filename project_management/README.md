# Project Management Hub

This folder is the single source of truth for planning and execution.

## Structure

- `requirements_from_user.md`
  - Locked business and product decisions from stakeholder intake.
- `requirements_baseline/`
  - Stable baseline requirements (business, UX/demo, technical).
- `plan.md`
  - Execution strategy and phase sequencing.
- `checklist.md`
  - Gate-by-gate completion tracker.
- `status.md`
  - Current done/pending state with next actions.
- `hackathon-absolute-requirements.md`
  - Mandatory challenge submission constraints.

## Operating rules

1. Update `status.md` after any meaningful implementation or cloud change.
2. Mark items in `checklist.md` only after verification.
3. Keep requirement changes in `requirements_from_user.md` and `requirements_baseline/`.
4. Keep technical test instructions in `docs/testing/` (not duplicated here).
