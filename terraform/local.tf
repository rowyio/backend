locals {
  required_roles = ["roles/logging.logWriter",
    "roles/logging.viewer",
    "roles/firebase.admin",
  "roles/iam.serviceAccountUser"]
}
