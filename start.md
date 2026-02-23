# Start Guide

This file tells you exactly what to read and how to start this project.

## 1) Read These Files First (In Order)

1. `project_management/README.md`
- Navigation index for all execution/management docs.

2. `docs/README.md`
- Navigation index for all documentation sections.

3. `project_management/requirements_from_user.md`
- Source of truth for locked decisions (scope, stack, deadline, products, targets).

4. `project_management/status.md`
- Current state, what was done, what is pending, exact next steps.

5. `project_management/checklist.md`
- Operational gate checklist to track progress and completion.

6. `project_management/plan.md`
- Execution phases, gate logic, API enablement, Terraform plan.

7. `project_management/hackathon-absolute-requirements.md`
- Hackathon requirements, we need to follow, otherwise this project is a trash material

8. `docs/requirements/README.md`
- Requirement baselines index (business + UX + technical).

9. `docs/project-execution-spec/README.md`
- Spec pack and template references.

10. `docs/testing/README.md`
- Test guide index (backend + frontend + terraform).

11. `docs/terraform-deployment.md`
- Simple Terraform deployment guide (resources, secrets, configuration, and command order).

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
export PROJECT_ID="light-client-488312-r3"   # change if needed
gcloud config set project "$PROJECT_ID"
```

## Step C - Enable required APIs

First-time bootstrap APIs:

```bash
gcloud services enable serviceusage.googleapis.com iam.googleapis.com
```

Core APIs:

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
# Export once
export PROJECT_ID="light-client-488312-r3"   # change if needed
export REGION="europe-west3"
export STATE_BUCKET="tfstate-light-client-488312-r3-20260223-31998"   # from bootstrap output

cd infra/terraform/bootstrap
terraform init
terraform apply -var="project_id=$PROJECT_ID" -var="state_bucket_name=$STATE_BUCKET"

cd ../environments/prod

# Required files for remote state + env vars
cat > backend.hcl <<EOF
bucket = "$STATE_BUCKET"
prefix = "nutrivision/prod"
EOF

cp -n terraform.tfvars.example terraform.tfvars

terraform init -backend-config=backend.hcl

# Phase 1: create APIs + IAM + Artifact Registry + Secret containers
terraform apply -var-file=terraform.tfvars \
  -target=module.project_apis \
  -target=module.runtime_service_account \
  -target=module.artifact_registry \
  -target=module.secret_manager

# Build and push backend container image to Artifact Registry
gcloud auth configure-docker europe-west3-docker.pkg.dev
cd ../../../../backend
gcloud builds submit \
  --tag europe-west3-docker.pkg.dev/$PROJECT_ID/nutrivision-backend/backend:latest

# Back to Terraform folder
cd ../infra/terraform/environments/prod

# Provide secret values safely at apply-time (do not store in tfvars)
# Vertex mode default (recommended, no GEMINI_API_KEY needed):
export TF_VAR_secret_payloads='{"off_user_agent":"NutriVisionLive/0.1 (contact: you@example.com)"}'

# Phase 2: full stack apply (Cloud Run uses pushed image + latest secret versions)
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

## Step E - Run backend locally

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# Option A (API-key mode):
# export GEMINI_API_KEY=REPLACE_ME
#
# Option B (Vertex mode):
export GEMINI_USE_VERTEX=true
export GCP_PROJECT_ID=nutrivision-liveagent-2026
export GCP_LOCATION=europe-west3
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Step F - Run frontend locally

```bash
cd frontend
pnpm install
# optional if backend is not localhost:8000
# export VITE_BACKEND_WS_URL=ws://localhost:8000/ws/live
pnpm run dev
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
