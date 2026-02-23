variable "allow_unauthenticated" {
  description = "Whether Cloud Run should allow unauthenticated invocations"
  type        = bool
  default     = true
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
