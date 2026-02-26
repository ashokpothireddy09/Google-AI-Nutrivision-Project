# Terraform Deployment Guide (Simple)

This file explains, in plain words, what Terraform creates, what secrets are needed, and how to deploy.

## 1) What Terraform Creates

Terraform in this repo creates these resources:

- **Bootstrap stack** (`infra/terraform/bootstrap`)
  - GCS bucket for Terraform remote state.

- **Prod stack** (`infra/terraform/environments/prod`)
  - Required Google APIs (Cloud Run, Vertex AI, Secret Manager, Cloud Build, Artifact Registry, Cloud Resource Manager).
  - Runtime service account for Cloud Run.
  - IAM roles for runtime service account:
    - `roles/aiplatform.user`
    - `roles/logging.logWriter`
    - `roles/secretmanager.secretAccessor`
  - Artifact Registry Docker repository.
  - Secret Manager secrets (and secret versions if values are provided).
  - Cloud Run service for backend.
  - Optional Cloud Run service for frontend (off by default).
  - Optional monthly budget alert scoped to this project (off by default).
  - Public invoker role if `allow_unauthenticated = true`.
  - Optional (off by default): Memorystore Redis, Cloud SQL Postgres.

## 2) What Keys / Secrets Are Needed

Recommended mode is **Vertex mode** (no Gemini API key needed).

- Required secret in current default setup:
  - `off_user_agent`

- Optional secret (only if you use API-key mode):
  - `gemini_api_key`

How to get `gemini_api_key` (API-key mode only):
1. Open Google AI Studio: https://aistudio.google.com/apikey
2. Create API key.
3. Do not paste it into files. Pass it as `TF_VAR_secret_payloads` at apply-time.

Important:
- Do **not** commit secret values to git.
- Pass secret values at apply-time using `TF_VAR_secret_payloads`.

Example (Vertex mode):
```bash
export TF_VAR_secret_payloads='{"off_user_agent":"NutriVisionLive/0.1 (contact: you@example.com)"}'
```

Example (API-key mode):
```bash
export TF_VAR_secret_payloads='{"off_user_agent":"NutriVisionLive/0.1 (contact: you@example.com)","gemini_api_key":"REPLACE_ME"}'
```

`terraform.tfvars` changes required for API-key mode:
```hcl
secret_names = [
  "off_user_agent",
  "gemini_api_key"
]

secret_env_mappings = {
  OFF_USER_AGENT = "off_user_agent"
  GEMINI_API_KEY = "gemini_api_key"
}

backend_env_vars = {
  APP_ENV           = "prod"
  GEMINI_USE_VERTEX = "false"
  GCP_PROJECT_ID    = "YOUR_PROJECT_ID"
  GCP_LOCATION      = "europe-west4"
}
```

Best-practice decision:
- Prefer Vertex mode in production (service account auth, no API key distribution).
- Keep API-key mode only as fallback/testing path.

## 3) One-Time Auth Setup

Run once on your machine:

```bash
gcloud auth login
gcloud auth application-default login
gcloud auth application-default set-quota-project YOUR_PROJECT_ID
```

## 4) Files You Must Set

Inside `infra/terraform/environments/prod`:

- `backend.hcl`
  - `bucket` = your Terraform state bucket from bootstrap output
  - `prefix` = `nutrivision/prod`

- `terraform.tfvars`
  - `project_id` = your GCP project
  - `backend_container_image` = image path with your project ID
  - `backend_env_vars.GCP_PROJECT_ID` = your project ID
  - `backend_env_vars.GCP_LOCATION` = supported Live model region (`europe-west4` recommended)
  - optional: `enable_frontend_cloud_run = true` and `frontend_container_image=...`
  - optional: `enable_budget_alerts = true` and `billing_account_id=...`
  - optional: `budget_notification_channels=[...]` for explicit alert routing

## 5) Deploy Steps

## Step A: Bootstrap state bucket
```bash
cd infra/terraform/bootstrap
terraform init
terraform apply -var="project_id=YOUR_PROJECT_ID" -var="state_bucket_name=YOUR_GLOBAL_UNIQUE_BUCKET_NAME"
```

Important:
- Treat the bootstrap state bucket name as immutable after first successful apply.
- Do not rotate/rename this bucket in normal operation. Replacing it can break remote state references.

## Step B: Init prod with remote state
```bash
cd ../environments/prod
terraform init -backend-config=backend.hcl
```

## Step C: Create base infra first
```bash
terraform apply -var-file=terraform.tfvars \
  -target=module.project_apis \
  -target=module.runtime_service_account \
  -target=module.artifact_registry \
  -target=module.secret_manager
```

## Step D: Build and push backend image
```bash
cd ../../../../backend
gcloud auth configure-docker europe-west3-docker.pkg.dev
gcloud builds submit --tag europe-west3-docker.pkg.dev/YOUR_PROJECT_ID/nutrivision-backend/backend:latest
```

## Step D2: (Optional) Build and push frontend image

Only needed when `enable_frontend_cloud_run=true`.

```bash
cd ../frontend
gcloud auth configure-docker europe-west3-docker.pkg.dev
docker build \
  --build-arg VITE_BACKEND_WS_URL=wss://REPLACE_WITH_BACKEND_HOST/ws/live \
  -t europe-west3-docker.pkg.dev/YOUR_PROJECT_ID/nutrivision-backend/frontend:latest \
  .
docker push europe-west3-docker.pkg.dev/YOUR_PROJECT_ID/nutrivision-backend/frontend:latest
```

## Step E: Full apply
```bash
cd ../infra/terraform/environments/prod
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

## Step F: Verify
```bash
URI=$(terraform output -raw cloud_run_service_uri)
echo "$URI"
curl "$URI/health"
curl "$URI/health?verbose=true"
```

Optional frontend verify:

```bash
FRONTEND_URI=$(terraform output -raw frontend_cloud_run_service_uri)
echo "$FRONTEND_URI"
```

## 6) Common Problems

- **No credentials loaded**
  - Run:
    - `gcloud auth application-default login`
    - `gcloud auth application-default set-quota-project YOUR_PROJECT_ID`

- **Cloud Run deploy fails because image not found**
  - Build and push image first (Step D), then run full apply.

- **Secret version missing**
  - Ensure `TF_VAR_secret_payloads` is exported before full apply.

- **Budget apply fails**
  - If `enable_budget_alerts=true`, ensure `billing_account_id` is set in `terraform.tfvars`.
