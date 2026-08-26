#!/usr/bin/env bash
# Run Relay locally: builds the console, then serves it with the live agent.
#
#   export GEMINI_API_KEY="your-key"
#   ./scripts/run-local.sh
set -euo pipefail

cd "$(dirname "$0")/.."

: "${GEMINI_API_KEY:?Set GEMINI_API_KEY (or GOOGLE_API_KEY) to a Gemini API key.}"
export GOOGLE_API_KEY="${GOOGLE_API_KEY:-$GEMINI_API_KEY}"
export GOOGLE_GENAI_USE_VERTEXAI="${GOOGLE_GENAI_USE_VERTEXAI:-FALSE}"

echo "==> Building the operations console"
(cd ui && npm install --no-audit --no-fund --silent && npm run build)

echo "==> Serving on http://127.0.0.1:8080"
cd services
exec python -m uvicorn relay_agent.server:app --host 127.0.0.1 --port "${PORT:-8080}"
