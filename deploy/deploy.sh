#!/usr/bin/env bash
# Deploy (or update) the GTYF website. Run on the server as the app user:
#
#   sudo -u gtyf bash deploy/deploy.sh --first-time   # very first deploy: also loads GTYF's
#                                                      # content, demo photos and the first admin
#   sudo -u gtyf bash deploy/deploy.sh                 # every update after that
#
# Safe to re-run. The database is never reset; content edited in the admin is kept.
set -euo pipefail
cd "$(dirname "$0")/.."
APP_DIR="$(pwd)"
FIRST_TIME=false
[[ "${1:-}" == "--first-time" ]] && FIRST_TIME=true

# The API port comes from .env (default 4000), so this can share a server with other apps.
API_PORT="$(grep -E '^PORT=' .env 2>/dev/null | cut -d= -f2 | tr -d '"[:space:]')"; API_PORT="${API_PORT:-4000}"

step() { echo; echo "==> $*"; }

if [[ -d .git ]]; then
  step "Getting the latest code"
  git pull --ff-only
fi

step "Installing packages"
npm ci --no-audit --no-fund

step "Building the API"
npm run build -w server

step "Updating the database structure"
npm run db:migrate:prod -w server

if $FIRST_TIME; then
  step "Loading GTYF's content, demo photos and the first admin (first time only)"
  # The seed never overwrites existing content and only fills EMPTY photo spots.
  npm run db:seed:prod -w server
fi

step "Starting / restarting the API"
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

step "Waiting for the API to be healthy"
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:${API_PORT}/api/health >/dev/null; then echo "API is up."; break; fi
  sleep 1
  if [[ $i == 30 ]]; then echo "API did not start. See: pm2 logs gtyf-api"; exit 1; fi
done

bash deploy/rebuild-site.sh

echo
echo "Deployed: https://guidetheyouth.scholarnerve.com"
