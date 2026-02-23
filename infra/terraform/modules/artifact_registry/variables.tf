variable "description" {
  description = "Description for the Artifact Registry repository"
  type        = string
  default     = "Container images for NutriVision backend"
}

variable "labels" {
  description = "Labels to apply to the repository"
  type        = map(string)
  default     = {}
}

variable "location" {
  description = "Region for the Artifact Registry repository"
  type        = string
}

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "repository_id" {
  description = "Artifact Registry repository ID"
  type        = string
}
