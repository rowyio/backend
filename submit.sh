#!/bin/bash
name=rowy-backend
project_id=rowy-run
npx tsc
gcloud config set project $project_id
gcloud builds submit --tag gcr.io/$project_id/$name