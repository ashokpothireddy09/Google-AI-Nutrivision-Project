resource "google_redis_instance" "this" {
  count = var.enabled ? 1 : 0

  project        = var.project_id
  name           = "${var.name_prefix}-redis"
  region         = var.region
  tier           = var.tier
  memory_size_gb = var.memory_size_gb
  redis_version  = var.redis_version

  authorized_network = "projects/${var.project_id}/global/networks/default"
  connect_mode       = "DIRECT_PEERING"
  display_name       = "${var.name_prefix} redis cache"
}
