output "secret_ids" {
  description = "Created secret IDs"
  value       = keys(google_secret_manager_secret.this)
}

output "secret_version_ids" {
  description = "Secret version resource IDs created from secret_payloads"
  value       = [for secret_version in values(google_secret_manager_secret_version.this) : secret_version.id]
}
