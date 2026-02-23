output "connection_name" {
  description = "Cloud SQL instance connection name"
  value       = try(google_sql_database_instance.this[0].connection_name, null)
}

output "public_ip_address" {
  description = "Cloud SQL public IP address"
  value       = try(google_sql_database_instance.this[0].public_ip_address, null)
}
