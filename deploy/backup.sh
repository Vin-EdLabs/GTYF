#!/usr/bin/env bash
# Nightly backup: the database (donations, content, admins) and uploaded photos.
# Kept for 14 days in /var/backups/gtyf. Copy them off the server regularly too
# (e.g. download weekly, or use Vultr's automatic backups).
#
# Restore the database:  pg_restore --clean --if-exists -d "$DATABASE_URL" /var/backups/gtyf/db-YYYY-MM-DD.dump
set -euo pipefail
cd "$(dirname "$0")/.."
BACKUP_DIR="/var/backups/gtyf"
STAMP="$(date +%F)"
DATABASE_URL="$(grep -E '^DATABASE_URL=' .env | cut -d= -f2-)"
UPLOAD_DIR="$(grep -E '^UPLOAD_DIR=' .env | cut -d= -f2-)"
mkdir -p "$BACKUP_DIR"

pg_dump --format=custom --no-owner --file="$BACKUP_DIR/db-$STAMP.dump" "$DATABASE_URL"
tar -czf "$BACKUP_DIR/uploads-$STAMP.tar.gz" -C "$(dirname "$UPLOAD_DIR")" "$(basename "$UPLOAD_DIR")"

find "$BACKUP_DIR" -type f -mtime +14 -delete
echo "$(date '+%F %T') backup done: $(du -sh "$BACKUP_DIR" | cut -f1) in $BACKUP_DIR"
