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
