#!/usr/bin/env bash
# Rebuild the prerendered website from the live content and publish it.
# Runs on every deploy and nightly (cron), so pages that Google and WhatsApp/
# Facebook previews read always match what staff published in the admin.
# (Visitors already see admin edits instantly; this refreshes the saved pages.)
set -euo pipefail
cd "$(dirname "$0")/.."
SITE_DIR="/var/www/guidetheyouth/site"

echo "==> Building the website ($(date '+%Y-%m-%d %H:%M'))"
# The build reads live content from the API, so the API must be running.
curl -fsS http://127.0.0.1:4000/api/health >/dev/null || { echo "API is not running; skipped."; exit 1; }
npm run build -w client

echo "==> Publishing"
# 1) New scripts/styles first (old ones are kept so people mid-visit don't break),
# 2) then the pages that point at them.
rsync -a client/dist/assets/ "$SITE_DIR/assets/"
rsync -a --delete --exclude 'assets/' client/dist/ "$SITE_DIR/"
# Old scripts/styles no longer used by anyone after a week.
find "$SITE_DIR/assets" -type f -mtime +7 -delete 2>/dev/null || true

echo "Website published."
