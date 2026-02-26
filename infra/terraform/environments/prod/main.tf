module "project_apis" {
  source = "../../modules/project_apis"

  project_id = var.project_id
  services   = local.required_services
}

data "google_project" "current" {
  project_id = var.project_id
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

module "frontend_runtime_service_account" {
  count  = var.enable_frontend_cloud_run ? 1 : 0
  source = "../../modules/runtime_service_account"

  account_id   = var.frontend_runtime_service_account_id
  description  = "Cloud Run runtime identity for NutriVision frontend"
  display_name = "NutriVision Frontend Runtime"
  project_id   = var.project_id
  project_roles = [
    "roles/logging.logWriter"
  ]

  depends_on = [module.project_apis]
}

module "frontend_cloud_run" {
  count  = var.enable_frontend_cloud_run ? 1 : 0
  source = "../../modules/cloud_run"

  allow_unauthenticated = var.frontend_allow_unauthenticated
  concurrency           = var.frontend_concurrency
  container_image       = var.frontend_container_image
  cpu                   = var.frontend_cpu
  env_vars              = var.frontend_env_vars
  labels                = local.labels
  max_instances         = var.frontend_max_instances
  memory                = var.frontend_memory
  min_instances         = var.frontend_min_instances
  project_id            = var.project_id
  region                = var.region
  secret_env_mappings   = {}
  service_account_email = module.frontend_runtime_service_account[0].email
  service_name          = var.frontend_service_name
  timeout_seconds       = var.frontend_timeout_seconds

  depends_on = [module.frontend_runtime_service_account]
}

resource "google_billing_budget" "monthly_guardrail" {
  count = var.enable_budget_alerts ? 1 : 0

  billing_account = "billingAccounts/${var.billing_account_id}"
  display_name    = "${var.name_prefix}-monthly-budget"

  budget_filter {
    projects               = ["projects/${data.google_project.current.number}"]
    credit_types_treatment = "INCLUDE_ALL_CREDITS"
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = tostring(floor(var.monthly_budget_amount_usd))
    }
  }

  dynamic "threshold_rules" {
    for_each = toset(var.budget_alert_thresholds)

    content {
      threshold_percent = threshold_rules.value
    }
  }

  all_updates_rule {
    disable_default_iam_recipients   = false
    monitoring_notification_channels = var.budget_notification_channels
  }
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
