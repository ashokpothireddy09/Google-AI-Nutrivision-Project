# Requirements From User - Finalized Intake (Locked + Pending)

This file captures your finalized decisions and remaining blockers.

## A) Schedule and Ownership

- Hard deadline (date + timezone): Tuesday, 17 March 2026 @ 01:00 (CET, Europe/Berlin)
- Submission owner: Ashok Pothireddy
- Technical owner: Ashok Pothireddy
- Review/approval owner: Ashok Pothireddy

## B) Scope Decisions

- Cosmetics in MVP: No (Food MVP mandatory; cosmetics shown as controlled Beta)
- Cosmetics depth: Basic
- Basic cosmetics scope definition:
  - Parse INCI (OBF or OCR fallback)
  - Flag fragrance allergens
  - Flag harsh surfactants
  - Flag formaldehyde-releaser keywords
  - Flag microplastics keywords
  - Emit short sensitive-skin verdict
- Must-have demo moments:
  1. Hands-free scan with instant HUD (grade + 4-bar chart)
  2. Barge-in interruption and pivot
  3. Food additive warning moment
  4. German date read (MHD vs use-by)
  5. Cosmetics basic risk moment
- Explicit out-of-scope:
  - Medical diagnosis or treatment advice
  - Broad legal-compliance engine for all products
  - Guaranteed legal/illegal claims without explicit evidence
  - Personal health profile storage
  - Retailer checkout/price integrations
  - Offline mode

## C) Stack and Platform Decisions

- Frontend stack: React (Vite), mobile-first web app
- Backend stack: Python 3.11 + FastAPI (WebSocket proxy)
- SDK preference: Google GenAI SDK (ADK optional future migration)
- Cloud services: Cloud Run + Vertex AI (Gemini Live) + Secret Manager
- Optional cloud service: Memorystore (Redis)
- Preferred region: europe-west3

## D) Cloud Access and Security

- GCP Project ID: nutrivision-liveagent-2026
- IAM level available: Owner OR Editor + IAM Admin (preferred)
- Can enable services and create service accounts: Yes
- Secret strategy approved: Yes
- Security posture:
  - Secrets in Secret Manager
  - Dedicated Cloud Run service account
  - No secrets in client

## E) Data and Policy Inputs

- Approved data sources:
  - Open Food Facts API
  - Open Beauty Facts API
  - Open Food Facts additives taxonomy
- Approved regulatory framing sources:
  - EU food additive framework references
  - EU Cosmetics Regulation 1223/2009 + CosIng (info-only)
  - EU microplastics restriction references
- Approved wording constraints:
  - Use: authorized, restricted, warning-required, not-authorized (when confirmed), uncertain
  - Avoid absolute medical/legal claims without direct support
  - Always include informational-only disclaimer
- Approved disclaimer text:
  - Hinweis: Nur zu Informationszwecken. Keine medizinische Beratung. Bei Allergien/Erkrankungen bitte Arzt:in fragen.

## F) Demo Asset Inputs

- Primary demo products (exact SKUs):
  - Nutella Haselnusscreme 450g
  - BiFi Original XXL (EAN: 4251097401447)
  - SweetDoughThings Honey Flavour Sugar-Free Candy Floss 12g (EAN: 5060764080149)
  - Alnatura Bio Haferflocken Grossblatt 500g
  - Head & Shoulders Classic Clean Shampoo 250ml
- Backup demo products:
  - Coca-Cola Zero Zucker 0,33l
  - Barilla Spaghetti No. 5 500g
  - Haribo Goldbaeren 200g
  - NIVEA Creme (blue tin)
  - Sensodyne toothpaste
- Recording setup: Laptop screen recording + phone/webcam feed in quiet environment
- Demo language mode: Bilingual (German primary, optional English captions/debug)

## G) Performance and Quality Targets

- Target time-to-first-verdict:
  - <= 1.5s for barcode hit
  - <= 3.0s for OCR/search fallback
- Target interruption pivot latency: <= 300ms
- Minimum identification success rate:
  - >= 85% on demo set
  - >= 70% general retail
- Reliability expectation:
  - Zero visible crashes during demo
  - Graceful fallback allowed when identification fails

## H) Tooling and Local Environment

- Node.js: 20 LTS
- Python: 3.11
- Package manager: pnpm (frontend), pip/uv/poetry (backend)
- Docker installed: Yes
- gcloud installed/authenticated: Yes

## I) Clarifications Locked

1. Output language mode: Bilingual
2. Submission strategy: Stability first, with one controlled cosmetics moment
3. Confidence visibility: Visible but minimal
4. Legal messaging style: Conservative spoken output, detailed references in debug/HUD
5. Ongoing tracking request: Yes (maintain weekly milestone tracker)

## Remaining Blockers (Must Fill)

- None at this stage.
