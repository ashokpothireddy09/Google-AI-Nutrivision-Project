# Backend Testing Guide (Simple + Detailed)

This guide explains exactly how to verify the backend locally and in cloud.

## 1) What this backend includes right now

- FastAPI server with HTTP health endpoint: `/health`
- WebSocket endpoint: `/ws/live`
- Open Food Facts and Open Beauty Facts API integration
- Rule-based scoring + policy mapping
- Optional Gemini text refinement (Vertex mode or API-key mode)
- Unit tests for scoring, date guidance, and disambiguation logic

## 2) Prerequisites

Run these checks first:

```bash
python3 --version
which python3
```

Expected:

- Python 3.11 or 3.12
- A valid Python path

## 3) First-time local setup

From repo root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt pytest
```

If `pip install` fails because of network, fix network first and rerun.

## 4) Run tests

```bash
cd backend
source .venv/bin/activate
pytest -q
```

Expected success:

- `6 passed`

## 5) Start backend locally

### Option A: Vertex mode (recommended)

```bash
cd backend
source .venv/bin/activate
export GEMINI_USE_VERTEX=true
export GCP_PROJECT_ID=nutrivision-liveagent-2026
export GCP_LOCATION=europe-west3
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Option B: API-key mode

```bash
cd backend
source .venv/bin/activate
export GEMINI_USE_VERTEX=false
export GEMINI_API_KEY=YOUR_KEY
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## 6) Quick runtime checks

Open another terminal and run:

```bash
curl http://localhost:8000/health
```

Expected:

```json
{"status":"ok"}
```

## 7) WebSocket behavior checks (manual)

When frontend is connected and you send a query, backend should emit these event types:

- `session_state`
- `tool_call`
- `hud_update`
- `speech_text`
- `uncertain_match` (only when top candidates are close)
- `barge_ack` (when barge-in is sent)

## 8) API connection reality check

What is connected now:

- Open Food Facts: connected in `backend/app/tools.py`
- Open Beauty Facts: connected in `backend/app/tools.py`
- Gemini text refinement: connected in `backend/app/main.py` (`_gemini_refine_text`)

What is not fully connected yet:

- True Gemini live audio output streaming back to frontend
  - Backend currently receives `audio_chunk` but does not return model audio chunks.
  - Frontend currently speaks `speech_text` via browser TTS.

## 9) Common failures and fixes

### `ModuleNotFoundError: No module named app`

Run tests from `backend` folder and keep `backend/pytest.ini` + `backend/tests/conftest.py` in place.

### Permission warning for `.pytest_cache`

Handled by `cache_dir = /tmp/nutrivision_pytest_cache` in `backend/pytest.ini`.

### Gemini does not respond

- Check `GEMINI_USE_VERTEX` flag
- Check `GCP_PROJECT_ID` and `GCP_LOCATION`
- Confirm Cloud Run service account has `roles/aiplatform.user`

## 10) Done criteria for backend

- `pytest -q` passes
- `/health` returns ok
- Frontend receives `hud_update` and `speech_text`
- Uncertain-match flow appears when close candidates exist
