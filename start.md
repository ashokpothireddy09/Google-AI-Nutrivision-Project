# Start Guide

This file tells you exactly what to read and how to start this project.

## 1) Read These Files First (In Order)

1. `project_management/requirements_from_user.md`
- Source of truth for locked decisions (scope, stack, deadline, products, targets).

2. `project_management/plan.md`
- Execution phases, gate logic, API enablement, Terraform plan.

3. `project_management/checklist.md`
- Operational checklist to track progress and completion.

4. `docs/project-execution-spec/00_master_spec.md`
- Requirement IDs, acceptance gates, risk controls.

5. `docs/project-execution-spec/02_technical_spec.md`
- Technical contracts: tools, scoring, event schemas, testing matrix.

6. `docs/project-execution-spec/hackathon-absolute-requirements.md`
- Hackathon requirements, we need to follow, otherwise this project is a trash material

## 2) Project Status Snapshot

- Gate 0: complete.
- Gate Q (hackathon qualification): in progress.
- Gate 1: in progress.
- Current blockers: cloud apply + public repo + architecture diagram + demo video.
- Next focus: deploy backend on GCP, connect real Gemini runtime, capture proof artifacts.

## 3) How To Start (Execution Flow)

## Step A - Confirm local environment

Check tools:

```bash
node -v
python3 --version
docker --version
gcloud --version
terraform version
```

## Step B - Set active GCP project

```bash
gcloud config set project nutrivision-liveagent-2026
```

## Step C - Enable required APIs

```bash
gcloud services enable \
  aiplatform.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  cloudresourcemanager.googleapis.com
```

Optional APIs (enable only if used):

```bash
gcloud services enable redis.googleapis.com
# and/or
# gcloud services enable firebasehosting.googleapis.com
# gcloud services enable speech.googleapis.com
# gcloud services enable texttospeech.googleapis.com
```

## Step D - Terraform bootstrap and prod apply

```bash
cd infra/terraform/bootstrap
terraform init
terraform apply -var='project_id=nutrivision-liveagent-2026' -var='state_bucket_name=REPLACE_ME'

cd ../environments/prod
terraform init -backend-config=backend.hcl
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

## Step E - Run backend locally

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export GEMINI_API_KEY=REPLACE_ME
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Step F - Run frontend locally

```bash
cd frontend
npm install
# optional if backend is not localhost:8000
# export VITE_BACKEND_WS_URL=ws://localhost:8000/ws/live
npm run dev
```

## Step G - Mark checklist items

Update `project_management/checklist.md` after each gate item is truly validated.

## 4) Demo Product Set (Primary)

- Nutella Haselnusscreme 450g
- BiFi Original XXL (EAN: 4251097401447)
- SweetDoughThings Honey Flavour Sugar-Free Candy Floss 12g (EAN: 5060764080149)
- Alnatura Bio Haferflocken Grossblatt 500g
- Head & Shoulders Classic Clean Shampoo 250ml

## 5) Done Criteria Before Submission

- Gate Q to Gate 7 checklist items complete in `project_management/checklist.md`.
- 3 consecutive successful full demo rehearsals.
- Cloud deployment proof, architecture diagram, public repo, and runnable setup prepared.
- Demo video length under 4 minutes, showing real-time behavior and cloud proof.

## 6) Important Rules

- Keep spoken legal/medical wording conservative.
- Do not store secrets in code or frontend.
- Cosmetics is Basic scope; keep Food flow stable first.
