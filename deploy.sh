#!/bin/bash
name=rowy-backend
region=asia-southeast1
helpFunction()
{
   echo "Usage: ./deploy.sh --project [YOUR GCLOUD PROJECT ID]"
   exit 0
}

while test $# -gt 0; do
           case "$1" in
                --project)
                    shift
                    project_id=$1
                    shift
                    ;;
                *)
                   echo "$1 is not a recognized flag!"
                   return 1;
                   ;;
          esac
  done

if [[ -z "$project_id" ]];
then
   helpFunction
fi
npx tsc
npm run build
gcloud config set project $project_id
gcloud builds submit --tag gcr.io/$project_id/$name # --region $region # I can't build in asia-southeast1 due to project restriction at asia-southeast1
gcloud run deploy $name --image gcr.io/$project_id/$name --platform managed --cpu 1000m --memory 2Gi --allow-unauthenticated --region $region