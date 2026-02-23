output "secret_ids" {
  description = "Created secret IDs"
  value       = keys(google_secret_manager_secret.this)
}
