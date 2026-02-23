project_id              = "light-client-488312-r3"
region                  = "europe-west3"
name_prefix             = "nutrivision"
backend_service_name    = "nutrivision-backend"
backend_container_image = "europe-west3-docker.pkg.dev/light-client-488312-r3/nutrivision-backend/backend:latest"

allow_unauthenticated = true

backend_cpu             = "1"
backend_memory          = "1Gi"
backend_min_instances   = 0
backend_max_instances   = 3
backend_timeout_seconds = 3600
backend_concurrency     = 80

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
  GCP_LOCATION      = "europe-west3"
}

enable_memorystore        = false
enable_cloud_sql_postgres = false
