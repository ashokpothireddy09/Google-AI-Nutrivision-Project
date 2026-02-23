variable "account_id" {
  description = "Service account ID (without domain)"
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.account_id))
    error_message = "account_id must be 6-30 chars, start with a letter, and contain only lowercase letters, digits, or dashes."
  }
}

variable "description" {
  description = "Description for the runtime service account"
  type        = string
  default     = "Runtime service account for NutriVision backend"
}

variable "display_name" {
  description = "Display name for the runtime service account"
  type        = string
}

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "project_roles" {
  description = "Project-level IAM roles to bind to the service account"
  type        = list(string)
}
