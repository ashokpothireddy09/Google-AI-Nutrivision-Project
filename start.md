# Start Guide

This is the shortest path to run and manage the project without confusion.

## 1) Read in This Order

1. `project_management/README.md`
2. `project_management/status.md`
3. `project_management/checklist.md`
4. `project_management/requirements_from_user.md`
5. `project_management/requirements_baseline/README.md`
6. `docs/testing/README.md`
7. `docs/terraform-deployment.md`

## 2) What Is Source of Truth

- Execution/progress: `project_management/status.md`
- Gate completion: `project_management/checklist.md`
- Locked decisions: `project_management/requirements_from_user.md`
- Baseline requirements: `project_management/requirements_baseline/*`
- Test procedures: `docs/testing/*`

## 3) Quick Local Run

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd frontend
pnpm install
# optional if backend is not localhost:8000
# export VITE_BACKEND_WS_URL=ws://localhost:8000/ws/live
pnpm run dev
```

## 4) Cloud Deploy Path

Use:

1. `docs/terraform-deployment.md`
2. `docs/testing/terraform-testing.md`
3. `project_management/status.md` (Next Steps section)

## 5) Project Rules

- Do not store secrets in code or frontend.
- Keep spoken legal/medical wording conservative.
- Stabilize Food flow first; Cosmetics remains controlled Beta.
