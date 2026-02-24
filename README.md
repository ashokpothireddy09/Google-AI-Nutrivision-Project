# Google-AI-Nutrivision-Project

NutriVision Live is a realtime multimodal shopping copilot (camera + voice + HUD) for the Gemini Live Agent Challenge.

## Stack

- Frontend: React + Vite
- Backend: FastAPI WebSocket proxy
- Infra: Terraform (Cloud Run, Vertex AI API, Secret Manager, Artifact Registry)

## Start Here

1. `start.md`
2. `project_management/README.md`
3. `project_management/status.md`
4. `docs/testing/README.md`

## Quick Local Run

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
pnpm install
pnpm run dev
```
