variable "bucket_location" {
  description = "Location for the Terraform state bucket"
  type        = string
  default     = "europe-west3"
}

variable "force_destroy" {
  description = "Whether to allow Terraform to delete a non-empty state bucket"
  type        = bool
  default     = false
}

variable "project_id" {
  description = "GCP project ID where the Terraform state bucket will be created"
  type        = string
}

variable "region" {
  description = "Default region for provider operations"
  type        = string
  default     = "europe-west3"
}

variable "state_bucket_name" {
  description = "Globally unique bucket name for Terraform remote state"
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9._-]{1,61}[a-z0-9]$", var.state_bucket_name))
    error_message = "state_bucket_name must be a valid GCS bucket name."
  }
}
