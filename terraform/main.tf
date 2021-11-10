resource "random_integer" "number" {
  min = 100
  max = 999
}
// create a new service account
resource "google_service_account" "rowy_run_serviceAccount" {
  // random account id
  account_id   = "rowy-run${random_integer.number.result}"
  display_name = "Rowy Run service Account"
}
resource "google_project_iam_binding" "roles" {
  project  = var.project_id
  for_each = toset(local.required_roles)
  role     = each.key
  members = [
    "serviceAccount:${google_service_account.rowy_run_serviceAccount.email}",
  ]
  depends_on = [google_service_account.rowy_run_serviceAccount]
}
output "service_account_email" {
  value       = google_service_account.rowy_run_serviceAccount.email
  description = "The created service account email"
}