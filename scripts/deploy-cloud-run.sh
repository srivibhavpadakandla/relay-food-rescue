#!/usr/bin/env bash
set -euo pipefail

: "${GOOGLE_CLOUD_PROJECT:?Set GOOGLE_CLOUD_PROJECT to your billed Google Cloud project ID.}"
RELAY_REGION="${GOOGLE_CLOUD_LOCATION:-us-central1}"

gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com aiplatform.googleapis.com
gcloud run deploy relay-agent \
  --source services \
  --project "$GOOGLE_CLOUD_PROJECT" \
  --region "$RELAY_REGION" \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_GENAI_USE_VERTEXAI=TRUE,GOOGLE_CLOUD_PROJECT=$GOOGLE_CLOUD_PROJECT,GOOGLE_CLOUD_LOCATION=$RELAY_REGION,RELAY_MODEL=gemini-3.5-flash"

gcloud run services describe relay-agent --project "$GOOGLE_CLOUD_PROJECT" --region "$RELAY_REGION" --format='value(status.url)'
