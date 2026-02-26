resource "google_storage_bucket" "terraform_state" {
  name     = var.state_bucket_name
  location = var.bucket_location
  project  = var.project_id

  force_destroy               = var.force_destroy
  public_access_prevention    = "enforced"
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }

    condition {
      age                = 90
      num_newer_versions = 20
    }
  }

  labels = local.labels

  # State bucket should never be destroyed by normal applies.
  lifecycle {
    prevent_destroy = true
  }
}
