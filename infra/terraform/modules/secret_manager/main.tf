resource "google_secret_manager_secret" "this" {
  for_each = toset(var.secret_names)

  project   = var.project_id
  secret_id = each.key

  replication {
    auto {}
  }

  labels = var.labels
}

locals {
  # for_each cannot iterate over a sensitive map directly. We only need keys here.
  secret_payload_keys = toset(nonsensitive(keys(var.secret_payloads)))
}

resource "google_secret_manager_secret_version" "this" {
  for_each = local.secret_payload_keys

  secret      = google_secret_manager_secret.this[each.key].id
  secret_data = var.secret_payloads[each.key]
}
