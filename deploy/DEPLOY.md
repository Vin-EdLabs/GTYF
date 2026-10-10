# Deploying to guidetheyouth.scholarnerve.com

A step-by-step guide for putting the GTYF website live on a Vultr server (Ubuntu 24.04).
Total time: about 30–45 minutes the first time, 2–5 minutes for every update after.

**What runs where**

| Part | How it runs |
|---|---|
| Website pages, scripts, photos | Served directly by **Nginx** (very fast, cached) |
| API (donations, admin, forms) | Node.js, kept running by **PM2** on `127.0.0.1:4000` |
| Database | **PostgreSQL** on the same server, backed up every night |
| HTTPS | Free **Let's Encrypt** certificate, renews automatically |

---

## 1. Create the server

- Vultr → Deploy → **Cloud Compute**, **Ubuntu 24.04**, at least **1 vCPU / 2 GB RAM**
  (1 GB works; the setup adds swap). Pick a location close to Ghana if offered (e.g. Johannesburg or London).
- Turn on **Automatic Backups** in Vultr (a second safety net).
- Note the server's **IP address**.

## 2. Point the domain at it

In the DNS settings for **scholarnerve.com**, add:

| Type | Name | Value |
|---|---|---|
| A | `guidetheyouth` | your server IP |

If scholarnerve.com uses **Cloudflare**: set the record to **DNS only (grey cloud)** for now.
Turn the orange cloud on after step 4 (see step 7).

Wait until `ping guidetheyouth.scholarnerve.com` shows your server's IP (usually a few minutes).

## 3. Put the project on the server

SSH in (`ssh root@YOUR_SERVER_IP`), then either clone your Git repository:

```bash
git clone YOUR_REPO_URL /srv/gtyf
```

…or copy the project folder from your computer to `/srv/gtyf`
(e.g. with WinSCP or `scp -r`). Don't copy `node_modules`, `.env`, `server/.pglite` or `server/uploads`.

## 4. One-time server setup

```bash
cd /srv/gtyf
sudo bash deploy/setup-server.sh YOUR_EMAIL
```

`YOUR_EMAIL` becomes the first admin login and receives HTTPS certificate notices.
This installs Node.js, PostgreSQL, Nginx, PM2 and the firewall, creates the database with a random
password, gets the HTTPS certificate, and creates `/srv/gtyf/.env` with generated secrets.

## 5. Add your keys

```bash
sudo nano /srv/gtyf/.env
```

- `PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY`: start with **test** keys.
- `SMTP_*`: your email provider, so receipts are emailed (can be added later).
- `ADMIN_ALERT_EMAIL`: who gets "new donation" and "new volunteer / message" emails.
- Your first admin password is on the `SEED_ADMIN_PASSWORD=` line.

Save (Ctrl+O, Enter) and exit (Ctrl+X).

## 6. First deploy

```bash
sudo -u gtyf bash deploy/deploy.sh --first-time
```

This builds everything, creates the database tables, loads GTYF's content, the first admin and the
20 demo photos and 4 demo team profiles (takes ~5 minutes: every photo is made into fast-loading versions), starts the API and
publishes the website.

Open **https://guidetheyouth.scholarnerve.com** and **https://guidetheyouth.scholarnerve.com/admin**.
Sign in, then go to **Account → Change your password**. Afterwards delete the three `SEED_ADMIN_*`
lines from `.env`.

## 7. Cloudflare (if used)

- Turn the DNS record's **orange cloud** on.
- SSL/TLS mode: **Full (strict)**.
- Speed → Optimization: Brotli on. Leave caching on "Standard"; the server already sends the right
  cache headers (scripts, styles and photos are cached for a year; pages are always fresh).
- The server already reads visitors' real IPs from Cloudflare.

## 8. Paystack

1. Paystack Dashboard → Settings → **API Keys & Webhooks** → Webhook URL:
   `https://guidetheyouth.scholarnerve.com/api/paystack/webhook`
2. Test a donation with the **test** keys (Mobile Money and card).
3. Switch `.env` to your **live** keys (`sk_live_…`, `pk_live_…`), set the webhook on the Live tab
   too, then run `sudo -u gtyf bash deploy/deploy.sh`.
4. Make one real **GH₵ 1** Mobile Money gift and one card gift; check the receipt email, the
   thank-you page and **Admin → Donations**.

## Every update after that

```bash
cd /srv/gtyf
sudo -u gtyf bash deploy/deploy.sh
```

Gets the latest code, updates the database structure (never deletes data), restarts the API cleanly
and republishes the site. Content staff edit in the admin is kept.

## Good to know

- **Admin edits are live instantly.** Every night at 03:15 the site is also rebuilt so Google and
  WhatsApp/Facebook previews pick up new events and stories (`deploy/rebuild-site.sh`, can be run anytime).
- **Backups:** every night at 02:30 → `/var/backups/gtyf` (database + photos, kept 14 days).
  Download a copy off the server now and then.
- **Logs:** `sudo -u gtyf pm2 logs gtyf-api` · `sudo tail -f /var/log/nginx/error.log`
- **Status:** `sudo -u gtyf pm2 status` · health check: `curl https://guidetheyouth.scholarnerve.com/api/health`
- **Demo photos and the 4 demo team profiles** (made-up people, edit or remove them in **Admin → Team**) are free stock photos, not GTYF's children. Replace them in **Admin → Photos**
  (or remove them all there) before promoting the site.
- **Uploaded photos** live in `/var/lib/gtyf/uploads` (outside the code folder, so deploys never touch them).
