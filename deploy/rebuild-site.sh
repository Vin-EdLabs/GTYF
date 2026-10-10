#!/usr/bin/env bash
# Rebuild the prerendered website from the live content and publish it.
# Runs on every deploy and nightly (cron), so pages that Google and WhatsApp/
# Facebook previews read always match what staff published in the admin.
# (Visitors already see admin edits instantly; this refreshes the saved pages.)
set -euo pipefail
cd "$(dirname "$0")/.."
SITE_DIR="/var/www/guidetheyouth/site"
API_PORT="$(grep -E '^PORT=' .env 2>/dev/null | cut -d= -f2 | tr -d '"[:space:]')"; API_PORT="${API_PORT:-4000}"
export CONTENT_API_URL="http://127.0.0.1:${API_PORT}"

echo "==> Building the website ($(date '+%Y-%m-%d %H:%M'))"
# The build reads live content from the API, so the API must be running.
curl -fsS http://127.0.0.1:${API_PORT}/api/health >/dev/null || { echo "API is not running; skipped."; exit 1; }
npm run build -w client

echo "==> Making the admin app shell"
# /admin gets its own copy of the app shell whose HTML already points at the admin
# manifest and icon, so "Install" / "Add to Home Screen" saves /admin, not the landing page.
sed -e 's#href="/site.webmanifest"#href="/admin.webmanifest"#'     -e 's#href="/brand/apple-touch-icon.png"#href="/brand/admin-apple-touch.png"#'     -e 's#<title>[^<]*</title>#<title>GTYF Admin</title>#'     -e 's#</head>#<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="GTYF Admin"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"></head>#'     client/dist/200.html > client/dist/admin.html
grep -q 'admin.webmanifest' client/dist/admin.html || { echo "admin shell was not made"; exit 1; }

echo "==> Publishing"
# 1) New scripts/styles first (old ones are kept so people mid-visit don't break),
# 2) then the pages that point at them.
rsync -a client/dist/assets/ "$SITE_DIR/assets/"
rsync -a --delete --exclude 'assets/' client/dist/ "$SITE_DIR/"
# Old scripts/styles no longer used by anyone after a week.
find "$SITE_DIR/assets" -type f -mtime +7 -delete 2>/dev/null || true

echo "Website published."
