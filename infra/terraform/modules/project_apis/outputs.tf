output "enabled_services" {
  description = "Set of APIs enabled by this module"
  value       = keys(google_project_service.this)
}
