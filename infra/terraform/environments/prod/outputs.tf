output "artifact_repository_url" {
  description = "Docker repository URL for backend images"
  value       = module.artifact_registry.repository_url
}

output "cloud_run_service_name" {
  description = "Cloud Run backend service name"
  value       = module.cloud_run.service_name
}

output "cloud_run_service_uri" {
  description = "Cloud Run backend service URI"
  value       = module.cloud_run.service_uri
}

output "enabled_services" {
  description = "GCP APIs enabled for this environment"
  value       = module.project_apis.enabled_services
}

output "memorystore_host" {
  description = "Optional Memorystore host"
  value       = module.memorystore.host
}

output "memorystore_port" {
  description = "Optional Memorystore port"
  value       = module.memorystore.port
}

output "runtime_service_account_email" {
  description = "Runtime service account email used by Cloud Run"
  value       = module.runtime_service_account.email
}

output "secret_ids" {
  description = "Secret Manager secret IDs provisioned"
  value       = module.secret_manager.secret_ids
}

output "secret_version_ids" {
  description = "Secret Manager secret versions created via secret_payloads"
  value       = module.secret_manager.secret_version_ids
  sensitive   = true
}

output "sql_connection_name" {
  description = "Optional Cloud SQL connection name"
  value       = module.cloud_sql_postgres.connection_name
}

output "sql_public_ip_address" {
  description = "Optional Cloud SQL public IP address"
  value       = module.cloud_sql_postgres.public_ip_address
}
