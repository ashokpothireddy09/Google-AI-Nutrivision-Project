project_id              = "light-client-488312-r3"
region                  = "europe-west3"
name_prefix             = "nutrivision"
backend_service_name    = "nutrivision-backend"
backend_container_image = "europe-west3-docker.pkg.dev/light-client-488312-r3/nutrivision-backend/backend:latest"

allow_unauthenticated = true

backend_cpu             = "1"
backend_memory          = "512Mi"
backend_min_instances   = 0
backend_max_instances   = 1
backend_timeout_seconds = 3600
backend_concurrency     = 40

secret_names = [
  "off_user_agent"
]

secret_env_mappings = {
  OFF_USER_AGENT = "off_user_agent"
}

backend_env_vars = {
  APP_ENV           = "prod"
  GEMINI_USE_VERTEX = "true"
  GCP_PROJECT_ID    = "light-client-488312-r3"
  GCP_LOCATION      = "europe-west4"
}

# Optional: deploy frontend on Cloud Run by setting image + enable flag.
enable_frontend_cloud_run = false
# frontend_container_image = "europe-west3-docker.pkg.dev/light-client-488312-r3/nutrivision-backend/frontend:latest"
frontend_env_vars = {
  VITE_BACKEND_WS_URL = "wss://REPLACE_WITH_BACKEND_HOST/ws/live"
}

# Cost guardrail (recommended): set billing account id then enable.
enable_budget_alerts      = false
monthly_budget_amount_usd = 300
# billing_account_id      = "XXXXXX-XXXXXX-XXXXXX"
budget_alert_thresholds = [0.5, 0.8, 1.0]
# budget_notification_channels = ["projects/YOUR_PROJECT/notificationChannels/1234567890"]

enable_memorystore        = false
enable_cloud_sql_postgres = false
