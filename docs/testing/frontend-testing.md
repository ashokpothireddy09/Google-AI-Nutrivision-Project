# Frontend Testing Guide (Simple + Detailed)

This guide explains exactly how to verify the React frontend.

## 1) What frontend does right now

- Opens camera and microphone
- Connects to backend WebSocket (`/ws/live`)
- Sends video frames (`frame`) every second
- Sends audio chunks (`audio_chunk`)
- Sends user text/barcode (`user_query`)
- Sends barge-in (`barge_in`)
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
export VITE_BACKEND_WS_URL=ws://YOUR_HOST:8000/ws/live
```

## 5) Run dev server

```bash
cd frontend
npm run dev
```

Open the URL shown by Vite (usually `http://localhost:5173`).

## 6) Manual functional test plan

### Test A: Session start

1. Click `Session starten`.
2. Allow camera and microphone.
3. Confirm state changes:
   - `connecting` then `listening`
   - WS status becomes `connected`

### Test B: Query flow

1. Enter text question and click `Senden`.
2. Confirm UI state goes to analyzing/processing.
3. Confirm HUD updates with product/warnings/metrics.
4. Confirm spoken output text appears.

### Test C: Barge-in flow

1. While speaking, click `Barge-in`.
2. Confirm state changes to `interrupted` then back to `listening`.

### Test D: Uncertain match flow

1. Use ambiguous product query.
2. Confirm `uncertain_match` overlay appears.
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
- HUD updates render correctly
- Barge-in works
- Uncertain-match overlay works
- Build succeeds
