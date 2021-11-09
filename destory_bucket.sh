#!bin/bash

cd terraform 
terraform init
terraform state pull
terraform destroy -var region=$1 -auto-approve -input=false

gsutil rm -r gs://roxy-cloud-run-bucket

cd ..