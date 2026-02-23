resource "google_sql_database_instance" "this" {
  count = var.enabled ? 1 : 0

  project          = var.project_id
  name             = "${var.name_prefix}-postgres"
  region           = var.region
  database_version = var.database_version

  deletion_protection = false

  settings {
    tier              = var.tier
    availability_type = "ZONAL"
    disk_autoresize   = true
    disk_size         = var.disk_size_gb
    disk_type         = "PD_SSD"

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
    }

    ip_configuration {
      ipv4_enabled = true
      ssl_mode     = "ENCRYPTED_ONLY"
    }
  }
}
