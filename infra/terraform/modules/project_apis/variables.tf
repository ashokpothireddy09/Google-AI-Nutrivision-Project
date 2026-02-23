variable "project_id" {
  description = "GCP project ID where APIs should be enabled"
  type        = string
}

variable "services" {
  description = "List of GCP APIs to enable"
  type        = list(string)
}
