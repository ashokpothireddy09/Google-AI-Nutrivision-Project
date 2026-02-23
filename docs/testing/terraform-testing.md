# Terraform Testing and Deployment Verification Guide

This guide explains how to validate infrastructure and deployment step by step.

## 1) What Terraform provisions in this repo

Main stack (`infra/terraform/environments/prod`):

- Required project APIs
- Runtime service account + IAM roles
- Artifact Registry
- Secret Manager secrets
- Cloud Run service
- Optional Memorystore
- Optional Cloud SQL

## 2) Required APIs (current code)

Configured in `infra/terraform/environments/prod/locals.tf`:

- `aiplatform.googleapis.com`
- `artifactregistry.googleapis.com`
- `cloudbuild.googleapis.com`
- `cloudresourcemanager.googleapis.com`
- `run.googleapis.com`
- `secretmanager.googleapis.com`

Optional based on variables:

- `redis.googleapis.com` when `enable_memorystore=true`
- `sqladmin.googleapis.com` when `enable_cloud_sql_postgres=true`

## 3) Prerequisites

```bash
gcloud --version
terraform version
```

Set project:

```bash
export PROJECT_ID="light-client-488312-r3"
gcloud config set project "$PROJECT_ID"
```

## 4) Bootstrap state backend

```bash
cd infra/terraform/bootstrap
terraform init
terraform apply -var="project_id=$PROJECT_ID" -var="state_bucket_name=YOUR_BUCKET_NAME"
```

## 5) Prod init with remote state

```bash
cd ../environments/prod
cat > backend.hcl <<EOF2
bucket = "YOUR_BUCKET_NAME"
prefix = "nutrivision/prod"
EOF2

terraform init -backend-config=backend.hcl
```

## 6) Phase-1 apply (safe baseline)

```bash
terraform apply -var-file=terraform.tfvars \
  -target=module.project_apis \
  -target=module.runtime_service_account \
  -target=module.artifact_registry \
  -target=module.secret_manager
```

## 7) Build and push backend image

```bash
gcloud auth configure-docker europe-west3-docker.pkg.dev
cd ../../../../backend
gcloud builds submit --tag europe-west3-docker.pkg.dev/$PROJECT_ID/nutrivision-backend/backend:latest
```

## 8) Full apply

```bash
cd ../infra/terraform/environments/prod
export TF_VAR_secret_payloads='{"off_user_agent":"NutriVisionLive/0.1 (contact: you@example.com)"}'
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

## 9) Post-apply verification

```bash
terraform output -raw cloud_run_service_uri
URI=$(terraform output -raw cloud_run_service_uri)
curl "$URI/health"
```

Expected:

- Health response: `{"status":"ok"}`

## 10) API and IAM verification commands

List enabled APIs:

```bash
gcloud services list --enabled --project "$PROJECT_ID" | rg "aiplatform|run.googleapis|secretmanager|cloudbuild|artifactregistry|cloudresourcemanager|redis|sqladmin"
```

Check runtime service account roles:

```bash
gcloud projects get-iam-policy "$PROJECT_ID" \
  --flatten="bindings[].members" \
  --filter="bindings.members:nutrivision-backend-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --format="table(bindings.role,bindings.members)"
```

## 11) Important current gap

Terraform does not currently provision frontend hosting.

You still need one of these for complete cloud demo:

- Cloud Run static container for frontend
- Firebase Hosting
- Cloud Storage static website + CDN (if acceptable for demo)

## 12) Done criteria for infrastructure

- Terraform plan/apply clean
- Required APIs enabled
- Cloud Run backend reachable
- Secrets mapped and readable by runtime service account
- Backend image pulled from Artifact Registry
