variable "allow_unauthenticated" {
  description = "Whether to allow unauthenticated requests to Cloud Run"
  type        = bool
  default     = true
}

variable "concurrency" {
  description = "Max concurrent requests per Cloud Run instance"
  type        = number
  default     = 80
}

variable "container_image" {
  description = "Fully qualified container image URI for the backend"
  type        = string
}

variable "cpu" {
  description = "CPU limit for Cloud Run container"
  type        = string
  default     = "1"
}

variable "env_vars" {
  description = "Plain environment variables for Cloud Run container"
  type        = map(string)
  default     = {}
}

variable "ingress" {
  description = "Ingress setting for Cloud Run service"
  type        = string
  default     = "INGRESS_TRAFFIC_ALL"

  validation {
    condition = contains([
      "INGRESS_TRAFFIC_ALL",
      "INGRESS_TRAFFIC_INTERNAL_ONLY",
      "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"
    ], var.ingress)
    error_message = "ingress must be a valid Cloud Run ingress enum value."
  }
}

variable "labels" {
  description = "Labels to apply to Cloud Run service"
  type        = map(string)
  default     = {}
}

variable "max_instances" {
  description = "Maximum Cloud Run instances"
  type        = number
  default     = 3
}

variable "memory" {
  description = "Memory limit for Cloud Run container"
  type        = string
  default     = "1Gi"
}

variable "min_instances" {
  description = "Minimum Cloud Run instances"
  type        = number
  default     = 0
}

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "Region where Cloud Run service is deployed"
  type        = string
}

variable "secret_env_mappings" {
  description = "Map of ENV_VAR_NAME => Secret Manager secret ID"
  type        = map(string)
  default     = {}
}

variable "service_account_email" {
  description = "Runtime service account email for Cloud Run"
  type        = string
}

variable "service_name" {
  description = "Cloud Run service name"
  type        = string
}

variable "timeout_seconds" {
  description = "Request timeout for Cloud Run service in seconds"
  type        = number
  default     = 3600
}
