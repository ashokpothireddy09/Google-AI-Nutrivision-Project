output "email" {
  description = "Email of the runtime service account"
  value       = google_service_account.this.email
}

output "name" {
  description = "Resource name of the runtime service account"
  value       = google_service_account.this.name
}
