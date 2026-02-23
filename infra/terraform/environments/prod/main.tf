module "project_apis" {
  source = "../../modules/project_apis"

  project_id = var.project_id
  services   = local.required_services
}

module "runtime_service_account" {
  source = "../../modules/runtime_service_account"

  account_id   = var.runtime_service_account_id
  description  = "Cloud Run runtime identity for NutriVision backend"
  display_name = "NutriVision Backend Runtime"
  project_id   = var.project_id
  project_roles = [
    "roles/aiplatform.user",
    "roles/logging.logWriter",
    "roles/secretmanager.secretAccessor"
  ]

  depends_on = [module.project_apis]
}

module "artifact_registry" {
  source = "../../modules/artifact_registry"

  description   = "Docker images for NutriVision backend"
  labels        = local.labels
  location      = var.region
  project_id    = var.project_id
  repository_id = var.artifact_repository_id

  depends_on = [module.project_apis]
}

module "secret_manager" {
  source = "../../modules/secret_manager"

  labels          = local.labels
  project_id      = var.project_id
  secret_payloads = var.secret_payloads
  secret_names    = var.secret_names

  depends_on = [module.project_apis]
}

module "cloud_run" {
  source = "../../modules/cloud_run"

  allow_unauthenticated = var.allow_unauthenticated
  concurrency           = var.backend_concurrency
  container_image       = var.backend_container_image
  cpu                   = var.backend_cpu
  env_vars              = var.backend_env_vars
  labels                = local.labels
  max_instances         = var.backend_max_instances
  memory                = var.backend_memory
  min_instances         = var.backend_min_instances
  project_id            = var.project_id
  region                = var.region
  secret_env_mappings   = var.secret_env_mappings
  service_account_email = module.runtime_service_account.email
  service_name          = var.backend_service_name
  timeout_seconds       = var.backend_timeout_seconds

  depends_on = [
    module.artifact_registry,
    module.runtime_service_account,
    module.secret_manager
  ]
}

module "memorystore" {
  source = "../../modules/memorystore"

  enabled        = var.enable_memorystore
  memory_size_gb = var.redis_memory_size_gb
  name_prefix    = var.name_prefix
  project_id     = var.project_id
  region         = var.region
  tier           = var.redis_tier

  depends_on = [module.project_apis]
}

module "cloud_sql_postgres" {
  source = "../../modules/cloud_sql_postgres"

  database_version = var.sql_database_version
  disk_size_gb     = var.sql_disk_size_gb
  enabled          = var.enable_cloud_sql_postgres
  name_prefix      = var.name_prefix
  project_id       = var.project_id
  region           = var.region
  tier             = var.sql_tier

  depends_on = [module.project_apis]
}
