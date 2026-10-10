#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 server (e.g. Vultr) for the GTYF website.
#
#   sudo bash deploy/setup-server.sh you@example.com
#
# The email is used for the HTTPS certificate notices and as the first admin login.
# Run it from inside the project folder (/srv/gtyf). Safe to re-run.
set -euo pipefail

DOMAIN="guidetheyouth.scholarnerve.com"
EMAIL="${1:-}"
APP_DIR="/srv/gtyf"
APP_USER="gtyf"
SITE_DIR="/var/www/guidetheyouth/site"
DATA_DIR="/var/lib/gtyf"

if [[ $EUID -ne 0 ]]; then echo "Run with sudo."; exit 1; fi
if [[ -z "$EMAIL" ]]; then echo "Usage: sudo bash deploy/setup-server.sh you@example.com"; exit 1; fi
if [[ "$(pwd)" != "$APP_DIR" ]]; then echo "Put the project in $APP_DIR and run this from there."; exit 1; fi

step() { echo; echo "==> $*"; }

step "System packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git nginx postgresql ufw certbot rsync build-essential ca-certificates

step "Swap (helps small servers build the site)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

step "Node.js 24 + PM2"
if ! command -v node >/dev/null || [[ "$(node -v)" != v24* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi
npm install -g pm2

step "App user and folders"
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /bin/bash "$APP_USER"
mkdir -p "$SITE_DIR" "$DATA_DIR/uploads" "$DATA_DIR/mail-outbox" /var/log/gtyf /var/backups/gtyf /var/www/letsencrypt
chown -R "$APP_USER:$APP_USER" "$APP_DIR" "$SITE_DIR" "$DATA_DIR" /var/log/gtyf /var/backups/gtyf

step "PostgreSQL database"
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='gtyf'" | grep -q 1; then
  DB_PASS="$(openssl rand -hex 24)"
  sudo -u postgres psql -c "CREATE ROLE gtyf LOGIN PASSWORD '$DB_PASS';"
  sudo -u postgres psql -c "CREATE DATABASE gtyf OWNER gtyf;"
  NEW_DB_URL="postgres://gtyf:$DB_PASS@127.0.0.1:5432/gtyf"
fi

step "Settings file (.env)"
if [[ ! -f "$APP_DIR/.env" ]]; then
  cp "$APP_DIR/deploy/env.production.example" "$APP_DIR/.env"
  ADMIN_PASS="Gtyf-$(openssl rand -base64 18 | tr -dc 'A-Za-z0-9' | head -c 16)"
  sed -i "s|__DATABASE_URL__|${NEW_DB_URL:-postgres://gtyf:CHANGE_ME@127.0.0.1:5432/gtyf}|" "$APP_DIR/.env"
  sed -i "s|__JWT_SECRET__|$(openssl rand -base64 48 | tr -d '\n=+/')|" "$APP_DIR/.env"
  sed -i "s|__ADMIN_EMAIL__|$EMAIL|" "$APP_DIR/.env"
  sed -i "s|__ADMIN_PASSWORD__|$ADMIN_PASS|" "$APP_DIR/.env"
  chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
  echo "Created $APP_DIR/.env (first admin password is inside; add your Paystack keys)."
else
  echo "$APP_DIR/.env already exists; left unchanged."
fi

step "Firewall"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

step "Nginx + HTTPS certificate"
cp deploy/nginx/gtyf-security-headers.conf /etc/nginx/snippets/
cp deploy/nginx/cloudflare-realip.conf /etc/nginx/snippets/
rm -f /etc/nginx/sites-enabled/default
if [[ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
  # Temporary HTTP-only site so Let's Encrypt can verify the domain.
  cat > /etc/nginx/sites-available/gtyf-bootstrap <<NGINX
server { listen 80; server_name $DOMAIN; location /.well-known/acme-challenge/ { root /var/www/letsencrypt; } }
NGINX
  ln -sf /etc/nginx/sites-available/gtyf-bootstrap /etc/nginx/sites-enabled/gtyf-bootstrap
  nginx -t && systemctl reload nginx
  certbot certonly --webroot -w /var/www/letsencrypt -d "$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive
  rm -f /etc/nginx/sites-enabled/gtyf-bootstrap
fi
cp "deploy/nginx/$DOMAIN.conf" "/etc/nginx/sites-available/$DOMAIN.conf"
ln -sf "/etc/nginx/sites-available/$DOMAIN.conf" "/etc/nginx/sites-enabled/$DOMAIN.conf"
nginx -t && systemctl reload nginx
# Reload Nginx whenever the certificate renews (certbot renews automatically).
mkdir -p /etc/letsencrypt/renewal-hooks/deploy
printf '#!/bin/sh\nsystemctl reload nginx\n' > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

step "PM2 starts on boot"
env PATH="$PATH" pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" >/dev/null
sudo -u "$APP_USER" pm2 install pm2-logrotate >/dev/null 2>&1 || true

step "Nightly backups and site refresh"
cat > /etc/cron.d/gtyf <<CRON
# Database + photo backups every night at 02:30 (kept 14 days)
30 2 * * * $APP_USER cd $APP_DIR && bash deploy/backup.sh >> /var/log/gtyf/backup.log 2>&1
# Refresh the prerendered pages (Google, link previews, sitemap) every night at 03:15
15 3 * * * $APP_USER cd $APP_DIR && bash deploy/rebuild-site.sh >> /var/log/gtyf/rebuild.log 2>&1
CRON

echo
echo "Setup complete."
echo "Next: add your Paystack keys (and email settings) to $APP_DIR/.env, then run:"
echo "  sudo -u $APP_USER bash deploy/deploy.sh --first-time"
