# Google-AI-Nutrivision-Project

NutriVision Live is a realtime multimodal shopping copilot (camera + voice + HUD) for the Gemini Live Agent Challenge.

## Stack
- Frontend: React + Vite
- Backend: FastAPI WebSocket proxy + tool orchestration
- Infra: Terraform for Cloud Run, Vertex AI API, Secret Manager, Artifact Registry

## Quick start
1. Backend: `cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && uvicorn app.main:app --reload`
2. Frontend: `cd frontend && pnpm install && pnpm run dev`

## Cloud deploy (Terraform)
Use the execution flow in `start.md` (Step C + Step D). It covers:
- required API enablement,
- two-phase Terraform apply,
- backend image build/push,
- secret payload injection via `TF_VAR_secret_payloads`.
