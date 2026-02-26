# Frontend Testing Guide (Simple + Detailed)

This guide explains exactly how to verify the React frontend.

## 1) What frontend does right now

- Opens camera and microphone
- Connects to backend WebSocket (`/ws/live`)
- Sends video frames (`frame`) every second
- Sends audio chunks (`audio_chunk`)
- Sends user text/barcode (`user_query`)
- Sends barge-in (`barge_in`)
- Runs always-on voice capture during active session (no per-utterance re-arm)
- Receives backend model audio (`speech_audio`) with model-audio-first playback and delayed browser TTS fallback
- Pauses/filters STT while agent audio is speaking to avoid self-transcription loops
- Optional automatic barcode scan via browser `BarcodeDetector` (when supported)
- Supports multilingual session language (`DE/EN/ES/FR/HI/IT/PT`)
- Renders HUD, warnings, metrics, confidence, uncertain-match overlay

## 2) Prerequisites

```bash
node -v
npm -v
```

Expected:

- Node 20+ recommended

## 3) Install dependencies

```bash
cd frontend
npm install
```

If install fails on WSL + OneDrive path with `EPERM` on `esbuild`, use one of these:

- Run the same command from Windows terminal (PowerShell/CMD) in this folder
- Copy repo to Linux-native path (example: `~/Google-AI-Project`) and run there

## 4) Set backend URL (optional)

If backend is not `localhost:8000`:

```bash
export VITE_BACKEND_WS_URL=wss://YOUR_HOST/ws/live
```

## 5) Run dev server

```bash
cd frontend
npm run dev
```

Open the URL shown by Vite (usually `http://localhost:5173`).

## 5A) Quick 3-terminal smoke test (local)

Terminal 1 (backend):

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Terminal 2 (frontend):

```bash
cd frontend
npm run dev
```

Terminal 3 (sanity checks):

```bash
curl http://localhost:8000/health
curl "http://localhost:8000/health?verbose=true"
```

In the browser (use only one tab):

1. Click `Session starten`.
2. Say: `how are you` (expect a short response).
3. Say: `which country are you` (expect an identity response).
4. Show the Lay's packet and say: `what are you seeing` (expect a frame-based correction or a barcode/backside prompt).
5. Type: `lays` and click `Senden` (expect correct Lay's match or `uncertain_match`, never a random generic chips match).

## 6) Manual functional test plan

### Test A: Session start

1. Click `Session starten`.
2. Allow camera and microphone.
3. Confirm state changes:
   - `connecting` then `listening`
   - WS status becomes `connected`
4. Confirm language defaults to browser locale (supported: `DE/EN/ES/FR/HI/IT/PT`) before session start.
5. Confirm runtime strip shows:
   - `WS` target URL
   - `CAM READY`
   - `SCAN AUTO` or `SCAN MANUAL`
6. Confirm ambient/background music stops once live session starts.
7. Confirm microphone enters `Armed`/`Listening` state automatically without pressing mic every turn.
8. Confirm startup greeting is spoken by the agent.

### Test A2: Social + camera-intent routing (voice)

1. Say: `how are you`
2. Expected:
   - short conversational response, then guidance to show the product
   - no random product match/HUD update from this phrase alone
3. Say: `which country are you`
4. Expected:
   - identity response (who/what the agent is and where it runs), then guidance back to product analysis
5. With the product clearly in view, say: `what are you seeing`
6. Expected:
   - the event log should show a frame-based correction (`Voice query corrected by frame hint` or `Frame fallback inferred product name`)
   - then either a correct `Target acquired: ...` or a spoken prompt to show barcode/backside

### Test B: Query flow

1. Enter text question and click `Senden`.
2. Confirm UI state goes to analyzing/processing.
3. Confirm HUD updates with product/warnings/metrics (metrics show per-100g values; bars represent internal scores).
4. Confirm spoken output text appears.
5. Confirm backend audio playback is heard when `speech_audio` is emitted.

### Test B1: Lay's sanity check (typed)

1. Type: `lays` and click `Senden` while showing the Lay's packet.
2. Expected:
   - if OFF results do not actually match Lay's tokens, backend should emit `uncertain_match` (manual selection) instead of picking a generic product.
   - if the backend is outdated, you may see false positives like `Target acquired: do whats natural`; treat that as a redeploy-needed bug.

### Test B2: Camera-only fallback (no typing)

1. Start session and point camera at package front (name visible).
2. Wait up to 8-10 seconds.
3. Confirm one of these happens:
   - HUD updates with identified product (frame hint -> fallback search), or
   - explicit spoken uncertainty asks for barcode side or product name.
4. Confirm if product cannot be matched, agent asks for backside ingredients + nutrition values (`carbs/fat/sugar/protein`).

### Test B3: Backside nutrition prompt

1. Show a product where barcode lookup returns weak/incomplete fields.
2. Confirm spoken prompt asks for backside ingredients and nutrition table (`carbs/fat/sugar/protein`).

### Test B4: Whole-food fallback

1. Ask by voice or text: `banana` (or `apple`) without barcode.
2. Confirm HUD shows whole-food profile and calories per 100g.
3. Confirm spoken response mentions calorific value and practical nutrition guidance.

### Test C: Barge-in flow

1. While speaking, click `Barge-in`.
2. Confirm state changes to `interrupted` then back to `listening`.

### Test D: Uncertain match flow

1. Use ambiguous product query.
2. Confirm `uncertain_match` overlay appears (close candidates OR low-match gating).
3. Click one candidate chip.
4. Confirm query is resent and flow continues.

### Test E: Low confidence message

1. Trigger low-confidence product response.
2. Confirm disclaimer area shows low-confidence note.

## 7) Build test

```bash
cd frontend
npm run build
```

Expected:

- Build completes without errors

## 8) Browser checks

- Chrome latest
- Edge latest

Check for:

- Camera permission prompt works
- Microphone permission prompt works
- No uncaught errors in browser console

## 9) Done criteria for frontend

- Session can start and stop
- WebSocket connects and receives events
- Runtime diagnostics strip reflects live endpoint + camera/scan/audio state
- Mic works hands-free across multiple utterances in one session
- Ambient music is not playing during active live session
- HUD updates render correctly
- Barge-in works
- Uncertain-match overlay works
- Build succeeds
