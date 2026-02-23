output "host" {
  description = "Memorystore host IP"
  value       = try(google_redis_instance.this[0].host, null)
}

output "port" {
  description = "Memorystore port"
  value       = try(google_redis_instance.this[0].port, null)
}
