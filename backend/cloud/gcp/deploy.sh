#!/usr/bin/env bash
# Deploy the secondary (failover) stack. Usage: API_TOKEN=... GCP_PROJECT=my-proj [GCP_REGION=asia-south1] ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"
: "${API_TOKEN:?set API_TOKEN (same value as the AWS stack)}"
: "${GCP_PROJECT:?set GCP_PROJECT}"
REGION="${GCP_REGION:-asia-south1}"

gcloud config set project "$GCP_PROJECT"
gcloud services enable cloudfunctions.googleapis.com run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com firestore.googleapis.com
gcloud firestore databases describe --database="(default)" >/dev/null 2>&1 || \
  gcloud firestore databases create --location="$REGION" --type=firestore-native

cp ../core/workflow_core.py workflow_core.py
gcloud functions deploy workflow-api --gen2 --runtime=python312 --region="$REGION" \
  --source=. --entry-point=api --trigger-http --allow-unauthenticated \
  --memory=256Mi --max-instances=10 \
  --set-env-vars="API_TOKEN=$API_TOKEN,CLOUD_NAME=gcp,CLOUD_REGION=$REGION"

gcloud functions describe workflow-api --gen2 --region="$REGION" --format="value(serviceConfig.uri)"
