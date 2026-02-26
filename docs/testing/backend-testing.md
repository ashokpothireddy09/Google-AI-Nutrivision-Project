# Backend Testing Guide (Simple + Detailed)

This guide explains exactly how to verify the backend locally and in cloud.

## 1) What this backend includes right now

- FastAPI server with HTTP health endpoint: `/health`
- WebSocket endpoint: `/ws/live`
- Open Food Facts and Open Beauty Facts API integration
- Rule-based scoring + policy mapping
- Gemini Live API refinement path (Vertex mode or API-key mode)
- Frame-only fallback hint extraction (barcode/name) before catalog search
- Whole-food fallback for unpackaged produce (apple/banana/orange baseline)
- Backside prompt when ingredients/nutrition fields are incomplete
- Session-start Gemini greeting prompt for conversational kickoff
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

- `30 passed` (or higher as new tests are added)

## 5) Start backend locally

### Option A: Vertex mode (recommended)

```bash
cd backend
source .venv/bin/activate
export GEMINI_USE_VERTEX=true
export GCP_PROJECT_ID=light-client-488312-r3
# Live model availability: use a supported Vertex region (e.g. europe-west4)
export GCP_LOCATION=europe-west4
# optional override (default is already this model in code)
export GEMINI_LIVE_MODEL=gemini-live-2.5-flash-native-audio
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Option B: API-key mode

```bash
cd backend
source .venv/bin/activate
export GEMINI_USE_VERTEX=false
export GEMINI_API_KEY=YOUR_KEY
# optional override (default is already this model in code)
export GEMINI_LIVE_MODEL=gemini-2.5-flash-native-audio-preview-12-2025
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

Verbose health (shows whether Gemini client is available and what config is active):

```bash
curl "http://localhost:8000/health?verbose=true"
```

Look for:

- `gemini.client_available=true` (required for native model voice via Gemini Live)
- `gemini.use_vertex` + `gemini.project_id` + `gemini.location` are correct

## 7) WebSocket behavior checks (manual)

When frontend is connected and you send a query, backend should emit these event types:

- `session_state`
- `tool_call`
- `hud_update`
- `speech_text`
- `speech_audio` (when Gemini returns audio chunks)
- `uncertain_match` (when top candidates are close OR when catalog candidates do not match the user query well enough)
- `speech_text` is also emitted for uncertain/disambiguation turns (no silent failures)
- `speech_text` prompt asks for backside ingredients/nutrition when data is incomplete
- startup greeting speech is emitted at session start (`turn_id = T-000`)
- `barge_ack` (when barge-in is sent)

## 8) API connection reality check

What is connected now:

- Open Food Facts: connected in `backend/app/tools.py`
- Open Beauty Facts: connected in `backend/app/tools.py`
- Gemini Live API text refinement with frame/audio context: connected in `backend/app/main.py` (`_gemini_live_refine_text`)
- Gemini Live audio output relay: connected in `backend/app/main.py` (`speech_audio` websocket event)
- Deterministic fallback path on source/model timeout/failure: covered by tests in `backend/tests/*`

## 9) Common failures and fixes

### `ModuleNotFoundError: No module named app`

Run tests from `backend` folder and keep `backend/pytest.ini` + `backend/tests/conftest.py` in place.

### Permission warning for `.pytest_cache`

Handled by `cache_dir = /tmp/nutrivision_pytest_cache` in `backend/pytest.ini`.

### Gemini does not respond

- Check `GEMINI_USE_VERTEX` flag
- Check `GCP_PROJECT_ID` and `GCP_LOCATION`
- Confirm Cloud Run service account has `roles/aiplatform.user`

### OFF/OBF lookup does not work (no products found)

Quick check:

```bash
curl -I --max-time 10 https://world.openfoodfacts.org
```

If DNS/network is blocked (for example `Could not resolve host`), product lookup will fail and backend will fall back to uncertainty prompts. Fix network/DNS, or verify Cloud Run egress/VPC settings.

## 10) Done criteria for backend

- `pytest -q` passes
- `/health` returns ok
- `/health?verbose=true` shows `gemini.client_available=true` in the target environment (cloud/device demo)
- Frontend receives `hud_update`, `speech_text`, and `speech_audio` (when available)
- Uncertain-match flow appears when close candidates exist
- Incomplete product fields trigger explicit backside nutrition-table guidance
