locals {
  base_services = [
    "aiplatform.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com"
  ]

  optional_services = concat(
    var.enable_memorystore ? ["redis.googleapis.com"] : [],
    var.enable_cloud_sql_postgres ? ["sqladmin.googleapis.com"] : []
  )

  required_services = distinct(concat(local.base_services, local.optional_services))

  labels = {
    application = "nutrivision-live"
    environment = "prod"
    managed_by  = "terraform"
  }
}
