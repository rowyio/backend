# Create a service account
resource "google_service_account" "service_account" {
  account_id   = "rowy-service-account"
  display_name = "Rowy Service Account"
}

resource "google_project_iam_binding" "firebase_permmisions" {
  project = local.project
  role = "roles/firebase.admin"
  members = [local.service_account]
  depends_on = [google_service_account.service_account]
}
resource "google_project_iam_binding" "serviceAccountUser_permmisions" {
  project = local.project
  role = "roles/iam.serviceAccountUser"
  members = [local.service_account]
  depends_on = [google_project_iam_binding.firebase_permmisions]
}
