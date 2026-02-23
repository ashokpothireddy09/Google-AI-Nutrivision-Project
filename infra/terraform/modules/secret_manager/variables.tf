variable "labels" {
  description = "Labels to apply to Secret Manager secrets"
  type        = map(string)
  default     = {}
}

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "secret_names" {
  description = "Secret IDs to create in Secret Manager"
  type        = set(string)
  default     = []
}

variable "secret_payloads" {
  description = "Optional map of secret_id => secret value to create latest versions during apply"
  type        = map(string)
  default     = {}
  sensitive   = true

  validation {
    condition     = alltrue([for secret_name in keys(var.secret_payloads) : contains(var.secret_names, secret_name)])
    error_message = "All secret_payloads keys must also exist in secret_names."
  }
}
