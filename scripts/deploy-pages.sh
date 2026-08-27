#!/usr/bin/env bash
# Publish the Relay console + landing page to Cloudflare Pages.
#
# Static front end only. Point it at a deployed agent so missions can run:
#   RELAY_AGENT_API="https://relay-agent-xxxx.run.app" ./scripts/deploy-pages.sh
#
# With no agent origin the console renders but says so, and Run rescue is
# disabled rather than failing with a network error.
set -euo pipefail

cd "$(dirname "$0")/.."
PROJECT="${RELAY_PAGES_PROJECT:-relay-food-rescue}"

if [[ -n "${RELAY_AGENT_API:-}" ]]; then
  echo "==> Building against agent at ${RELAY_AGENT_API}"
  (cd ui && VITE_AGENT_API="$RELAY_AGENT_API" npm run build)
else
  echo "==> Building static-only (no agent origin configured)"
  (cd ui && VITE_STATIC_ONLY=1 npm run build)
fi

wrangler pages deploy services/ui \
  --project-name "$PROJECT" \
  --branch main \
  --commit-dirty=true
