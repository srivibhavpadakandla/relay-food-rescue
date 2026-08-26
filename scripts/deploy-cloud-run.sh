#!/usr/bin/env bash
# Deploy Relay (operations UI + ADK agent) to Google Cloud Run.
#
#   export GOOGLE_CLOUD_PROJECT="your-project-id"
#   ./scripts/deploy-cloud-run.sh
#
# Uses Vertex AI for model access by default, so no API key is baked into the
# image. Pass RELAY_USE_API_KEY=1 with GEMINI_API_KEY to use the Gemini API.
set -euo pipefail

: "${GOOGLE_CLOUD_PROJECT:?Set GOOGLE_CLOUD_PROJECT to your billed Google Cloud project ID.}"
REGION="${GOOGLE_CLOUD_LOCATION:-us-central1}"
SERVICE="${RELAY_SERVICE:-relay-agent}"
MODEL="${RELAY_MODEL:-gemini-3.5-flash}"

echo "==> Enabling required Google Cloud services"
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  aiplatform.googleapis.com \
  firestore.googleapis.com \
  --project "$GOOGLE_CLOUD_PROJECT"

ENV_VARS="RELAY_MODEL=${MODEL},RELAY_FIRESTORE=${RELAY_FIRESTORE:-0}"
if [[ "${RELAY_USE_API_KEY:-0}" == "1" ]]; then
  : "${GEMINI_API_KEY:?Set GEMINI_API_KEY when RELAY_USE_API_KEY=1.}"
  ENV_VARS="${ENV_VARS},GOOGLE_GENAI_USE_VERTEXAI=FALSE,GOOGLE_API_KEY=${GEMINI_API_KEY}"
else
  ENV_VARS="${ENV_VARS},GOOGLE_GENAI_USE_VERTEXAI=TRUE,GOOGLE_CLOUD_PROJECT=${GOOGLE_CLOUD_PROJECT},GOOGLE_CLOUD_LOCATION=${REGION}"
fi

echo "==> Deploying ${SERVICE} to ${REGION}"
gcloud run deploy "$SERVICE" \
  --source . \
  --project "$GOOGLE_CLOUD_PROJECT" \
  --region "$REGION" \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --concurrency 20 \
  --set-env-vars "$ENV_VARS"

URL="$(gcloud run services describe "$SERVICE" \
  --project "$GOOGLE_CLOUD_PROJECT" --region "$REGION" --format='value(status.url)')"

echo
echo "==> Live at: ${URL}"
echo "==> Health:  ${URL}/healthz"
curl -fsS "${URL}/healthz" && echo
