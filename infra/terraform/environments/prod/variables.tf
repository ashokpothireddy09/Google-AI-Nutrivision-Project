variable "allow_unauthenticated" {
  description = "Whether Cloud Run should allow unauthenticated invocations"
  type        = bool
  default     = true
}

variable "billing_account_id" {
  description = "Billing account ID (format: XXXXXX-XXXXXX-XXXXXX) for optional budget alerts"
  type        = string
  default     = ""

  validation {
    condition = (
      !var.enable_budget_alerts ||
      can(regex("^[A-Z0-9]{6}-[A-Z0-9]{6}-[A-Z0-9]{6}$", var.billing_account_id))
    )
    error_message = "When enable_budget_alerts=true, billing_account_id must match XXXXXX-XXXXXX-XXXXXX."
  }
}

variable "artifact_repository_id" {
  description = "Artifact Registry repository ID for backend images"
  type        = string
  default     = "nutrivision-backend"
}

variable "backend_concurrency" {
  description = "Cloud Run max request concurrency per instance"
  type        = number
  default     = 80
}

variable "backend_container_image" {
  description = "Fully qualified backend container image URI"
  type        = string
}

variable "backend_cpu" {
  description = "CPU limit for backend Cloud Run container"
  type        = string
  default     = "1"
}

variable "backend_env_vars" {
  description = "Non-secret environment variables for backend Cloud Run container"
  type        = map(string)
  default     = {}
}

variable "backend_max_instances" {
  description = "Maximum Cloud Run instances for backend"
  type        = number
  default     = 3
}

variable "backend_memory" {
  description = "Memory limit for backend Cloud Run container"
  type        = string
  default     = "1Gi"
}

variable "backend_min_instances" {
  description = "Minimum Cloud Run instances for backend"
  type        = number
  default     = 0
}

variable "backend_service_name" {
  description = "Cloud Run backend service name"
  type        = string
  default     = "nutrivision-backend"
}

variable "backend_timeout_seconds" {
  description = "Request timeout for backend Cloud Run service"
  type        = number
  default     = 3600
}

variable "budget_alert_thresholds" {
  description = "Alert thresholds for budget notifications, as fractions (for example 0.5, 0.8, 1.0)"
  type        = list(number)
  default     = [0.5, 0.8, 1.0]

  validation {
    condition     = alltrue([for threshold in var.budget_alert_thresholds : threshold > 0 && threshold <= 2])
    error_message = "Each budget alert threshold must be > 0 and <= 2."
  }
}

variable "budget_notification_channels" {
  description = "Optional Cloud Monitoring notification channel resource names for budget alerts"
  type        = list(string)
  default     = []
}

variable "enable_budget_alerts" {
  description = "Whether to create a monthly budget alert scoped to this project"
  type        = bool
  default     = false
}

variable "enable_frontend_cloud_run" {
  description = "Whether to deploy the frontend as a Cloud Run service"
  type        = bool
  default     = false
}

variable "enable_cloud_sql_postgres" {
  description = "Whether to provision optional Cloud SQL Postgres"
  type        = bool
  default     = false
}

variable "enable_memorystore" {
  description = "Whether to provision optional Memorystore Redis"
  type        = bool
  default     = false
}

variable "frontend_allow_unauthenticated" {
  description = "Whether frontend Cloud Run should allow unauthenticated requests"
  type        = bool
  default     = true
}

variable "frontend_concurrency" {
  description = "Cloud Run max request concurrency for frontend"
  type        = number
  default     = 80
}

variable "frontend_container_image" {
  description = "Fully qualified frontend container image URI (required when enable_frontend_cloud_run=true)"
  type        = string
  default     = ""

  validation {
    condition     = !var.enable_frontend_cloud_run || length(trimspace(var.frontend_container_image)) > 0
    error_message = "frontend_container_image must be set when enable_frontend_cloud_run=true."
  }
}

variable "frontend_cpu" {
  description = "CPU limit for frontend Cloud Run container"
  type        = string
  default     = "1"
}

variable "frontend_env_vars" {
  description = "Non-secret environment variables for frontend Cloud Run container"
  type        = map(string)
  default     = {}
}

variable "frontend_max_instances" {
  description = "Maximum Cloud Run instances for frontend"
  type        = number
  default     = 1
}

variable "frontend_memory" {
  description = "Memory limit for frontend Cloud Run container"
  type        = string
  default     = "512Mi"
}

variable "frontend_min_instances" {
  description = "Minimum Cloud Run instances for frontend"
  type        = number
  default     = 0
}

variable "frontend_runtime_service_account_id" {
  description = "Account ID for the frontend runtime service account"
  type        = string
  default     = "nutrivision-frontend-sa"
}

variable "frontend_service_name" {
  description = "Cloud Run frontend service name"
  type        = string
  default     = "nutrivision-frontend"
}

variable "frontend_timeout_seconds" {
  description = "Request timeout for frontend Cloud Run service"
  type        = number
  default     = 300
}

variable "monthly_budget_amount_usd" {
  description = "Monthly budget amount in USD for optional budget alert"
  type        = number
  default     = 300

  validation {
    condition     = var.monthly_budget_amount_usd >= 1
    error_message = "monthly_budget_amount_usd must be >= 1."
  }
}

variable "name_prefix" {
  description = "Prefix used for naming GCP resources"
  type        = string
  default     = "nutrivision"
}

variable "project_id" {
  description = "Target GCP project ID"
  type        = string
}

variable "redis_memory_size_gb" {
  description = "Optional Memorystore memory size in GB"
  type        = number
  default     = 1
}

variable "redis_tier" {
  description = "Optional Memorystore tier"
  type        = string
  default     = "BASIC"

  validation {
    condition     = contains(["BASIC", "STANDARD_HA"], var.redis_tier)
    error_message = "redis_tier must be BASIC or STANDARD_HA."
  }
}

variable "region" {
  description = "Target GCP region"
  type        = string
  default     = "europe-west3"
}

variable "runtime_service_account_id" {
  description = "Account ID for the backend runtime service account"
  type        = string
  default     = "nutrivision-backend-sa"
}

variable "secret_env_mappings" {
  description = "Map of ENV_VAR_NAME => Secret Manager secret ID"
  type        = map(string)
  default     = {}

  validation {
    condition     = alltrue([for secret_name in values(var.secret_env_mappings) : contains(var.secret_names, secret_name)])
    error_message = "All secret_env_mappings values must also be present in secret_names."
  }
}

variable "secret_names" {
  description = "Set of Secret Manager secret IDs to create"
  type        = set(string)
  default     = []
}

variable "secret_payloads" {
  description = "Optional map of secret_id => secret value to create secret versions during apply"
  type        = map(string)
  default     = {}
  sensitive   = true

  validation {
    condition     = alltrue([for secret_name in keys(var.secret_payloads) : contains(var.secret_names, secret_name)])
    error_message = "All secret_payloads keys must also be present in secret_names."
  }
}

variable "sql_database_version" {
  description = "Optional Cloud SQL Postgres major version"
  type        = string
  default     = "POSTGRES_15"
}

variable "sql_disk_size_gb" {
  description = "Optional Cloud SQL disk size in GB"
  type        = number
  default     = 20
}

variable "sql_tier" {
  description = "Optional Cloud SQL machine tier"
  type        = string
  default     = "db-f1-micro"
}
