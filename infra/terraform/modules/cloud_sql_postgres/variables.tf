variable "database_version" {
  description = "Cloud SQL Postgres database version"
  type        = string
  default     = "POSTGRES_15"
}

variable "disk_size_gb" {
  description = "Cloud SQL disk size in GB"
  type        = number
  default     = 20
}

variable "enabled" {
  description = "Whether to create Cloud SQL Postgres"
  type        = bool
  default     = false
}

variable "name_prefix" {
  description = "Prefix used for resource naming"
  type        = string
}

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "Region for Cloud SQL"
  type        = string
}

variable "tier" {
  description = "Cloud SQL machine tier"
  type        = string
  default     = "db-f1-micro"
}
