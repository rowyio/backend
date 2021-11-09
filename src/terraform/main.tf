terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 3.53"
    }
  }
}

provider "google" {}

data "google_project" "project" {
}


locals {
  project = data.google_project.project.project_id
  service_name   = "rowy-run"
  service_account  = "serviceAccount:${google_service_account.service_account.email}"
}