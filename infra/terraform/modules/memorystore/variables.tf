variable "enabled" {
  description = "Whether to create Memorystore Redis"
  type        = bool
  default     = false
}

variable "memory_size_gb" {
  description = "Redis memory size in GB"
  type        = number
  default     = 1
}

variable "name_prefix" {
  description = "Prefix used for resource naming"
  type        = string
}

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "redis_version" {
  description = "Redis version for Memorystore"
  type        = string
  default     = "REDIS_7_0"
}

variable "region" {
  description = "Region for Memorystore"
  type        = string
}

variable "tier" {
  description = "Memorystore tier"
  type        = string
  default     = "BASIC"

  validation {
    condition     = contains(["BASIC", "STANDARD_HA"], var.tier)
    error_message = "tier must be BASIC or STANDARD_HA."
  }
}
