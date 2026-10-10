# Guide The Youth Foundation — website

Public site, donations (Paystack) and admin panel for Guide The Youth Foundation (GTYF),
Wamfie, Dormaa East, Bono Region, Ghana.

## Structure

| Folder | What it is |
|---|---|
| `client/` | React 18 + TypeScript + Vite, React Router, Tailwind CSS v4, Framer Motion. Every public route is prerendered to static HTML with `vite-react-ssg`. |
| `server/` | Node + Express 5 + TypeScript API. PostgreSQL via Drizzle ORM. |
| `shared/` | Code both sides use: enums, money helpers, and **all of GTYF's real content** (`shared/src/content`), which seeds the database and is the site's offline fallback. |

## Getting started

```bash
cp .env.example .env          # then fill in JWT_SECRET (and SEED_ADMIN_* for the first admin)
npm install
npm run db:up                 # local Postgres in Docker (or point DATABASE_URL at your own)
npm run db:migrate
npm run db:seed
npm run dev                   # API on :4000, site on :5173 (proxies /api)
```

No Postgres or Docker? Set `DATABASE_URL=pglite:./.pglite` in `.env` to run an embedded Postgres
(PGlite) stored in `server/.pglite`. It's for local work only. If the process is killed hard the folder
can corrupt; `npm run db:reset:local -w server` rebuilds it from migrations and the seed.

`npm run db:verify -w server` applies every migration and the full seed to a throwaway in-memory
Postgres and checks the result (handy in CI).

## How content reaches the page

- Every public route is **prerendered** at build time. Route loaders (`client/src/routes.tsx`) fetch
  from the API, so **the API must be running when you build** (`CONTENT_API_URL`, default
  `http://localhost:4000`). If it isn't, the build fails on purpose rather than shipping empty pages.
- In the browser, pages show the prerendered content instantly, then refetch from `/api/content/*`,
  so admin edits appear without a rebuild. Rebuilds refresh the HTML that search engines and link
  previews see.
- `dist/200.html` is an empty app shell. Nginx should serve it for app paths that weren't
  prerendered yet (e.g. an event published since the last build), and `dist/404/index.html` for everything else.
- `sitemap.xml` and `robots.txt` are generated at build from `VITE_SITE_URL`.
- Only safe images reach the public API: alt text is required, and an image marked as showing
  children is never served until consent is confirmed (`server/src/lib/publicMedia.ts`).


## Donations (Paystack)

- The browser never creates a transaction. `POST /api/donations/initialize` validates the gift, recomputes
  the fee, stores a `pending` donation (`GTYF-2026-XXXXXX`) and asks Paystack for an access code; the
  page then opens Paystack's popup, so the donor never leaves the site.
- **Monthly gifts are card-only**: Paystack can only repeat charges on cards, not Mobile Money.
- A donation becomes `success` only from Paystack itself: the signed webhook
  (`POST /api/paystack/webhook`), or the thank-you page's server-to-Paystack verify call. Both use the
  same idempotent code, check the amount charged, and send each email at most once.
- **Webhook URL** for the Paystack dashboard (Settings → API Keys & Webhooks):
  `https://<your-domain>/api/paystack/webhook`. Locally Paystack can't reach you; the verify call covers
  it, or use a tunnel (e.g. `cloudflared tunnel --url http://localhost:4000`).
- `npm run test:donations -w server` (API running, test keys only) runs 14 end-to-end checks against the
  Paystack test API: fees, validation, signatures, replays, amount mismatch, PDF, monthly plans.
- Without SMTP settings, receipts and alerts are written to `server/.mail-outbox/` as HTML files.


## Admin panel (`/admin`)

- Sign in at `/admin` (e.g. `http://localhost:5173/admin`, or `https://<domain>/admin` in production).
- The first super admin comes from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env` via `npm run db:seed`.
  Change the password after the first sign-in (Account page).
- Roles: **Super admin** (everything, manages admins), **Finance** (donations, receipts, refunds, CSV),
  **Editor** (website content; editing tools coming next).
- Donations: every transaction and its receipt, search and filters, totals, CSV export, PDF receipts,
  resend receipt, edit donor name/email and staff notes, record refunds. Amounts and paid status come
  from Paystack and can't be edited. Every change is in the activity log.
- Security: bcrypt passwords, httpOnly SameSite=Strict session cookie (12 h), login rate limiting,
  deactivating an admin or changing a password signs them out immediately.
- `npm run test:admin -w server` (API running) runs 20 end-to-end checks.
- Nginx must serve `200.html` for `/admin/*` (the admin is never prerendered).


## Editing the website (admin → Website, Photos)

- **Photos**: upload many at once (phone or computer). Each is rotated upright, stripped of location
  data, and saved as WebP + AVIF at 640/1280/2048 px plus a 1200×630 share image and a blur
  placeholder, in `UPLOAD_DIR` (served at `/uploads`; Nginx should serve that folder directly in
  production). Tap to set the focal point; a photo needs a description, and a photo showing
  children needs consent confirmed, before it appears anywhere public.
- **Editors**: news (rich text), events (upcoming + past, highlights, schools, photos), home page
  slides and section order, programmes and their "how it works" parts, team, impact numbers and
  gift prices, core values, contact/social/bank details, menu, footer and every page heading.
- Drafts stay hidden; admins can open `?preview=1` on a draft event or story to see the real page.
- **Demo photos**: 20 free-licence Unsplash photos in `server/seed/demo-photos/` (list in
  `server/src/db/demoPhotos.ts`) fill every empty photo spot. `npm run db:seed` adds them (skip with
  `-- --no-demo-photos`); Admin → Photos has "Add demo photos" / "Remove all demo photos". They are
  NOT GTYF's beneficiaries: replace them with GTYF's own consented photos before promoting the site.
- **Inbox** (Admin → Inbox): volunteer, partner and contact form submissions, with status, notes,
  one-tap email/WhatsApp/call and CSV export. The team gets an email alert at `ADMIN_ALERT_EMAIL`.
- Local dev: stop the API cleanly with `curl -X POST localhost:4000/api/__dev/shutdown` (or Ctrl+C);
  never force-kill it when using the PGlite database.
- Content changes are live immediately (pages refetch in the browser); rebuild the site to refresh
  the prerendered HTML that Google and link previews read.
- `npm run test:content -w server` (API running) runs 16 end-to-end checks.


## Database

- Schema: `server/src/db/schema.ts`. After changing it, run `npm run db:generate` and commit the new file in `server/drizzle/`.
- Money is always integer **pesewas** (GH₵ 1 = 100).
- The seed is safe to re-run: it never overwrites edits made in the admin. `npm run db:seed -- --overwrite` resets content to defaults (fresh installs only).
- Events are "upcoming" or "past" based on their dates, so nothing needs moving by hand after an outreach.

## Content placeholders

Anything GTYF has not supplied yet is a string starting with `TODO:` (contact details,
registration number, bank details, and so on). In development these show in a dashed red box; in
production they are hidden. Every one is editable in the admin (Phase 5).

Impact item prices in `shared/src/content/impact.ts` are placeholders marked **CONFIRM WITH GTYF**.
The eight core values' one-line explanations are drafts for GTYF to confirm.

## Design tokens

Defined in `client/src/styles/index.css` (`@theme`). Only the brand palette exists: `ink`, `paper`,
`mist`, `lantern` (the one accent), `ruling` and `margin` (exercise-book details only), `slate`.
Fonts are Bricolage Grotesque (display), Figtree (body) and JetBrains Mono (labels), self-hosted.

## Build phases

1. **Foundation** — monorepo, tokens, fonts, layout (nav + footer), schema + seed ✅
2. **Public site** — all pages, hero slideshow, forms, prerendering + SEO ✅
3. **Donations** — donation card, Paystack one-time + monthly, webhook, thank-you + share image, receipts, emails ✅
4. Campaigns
5. **Admin panel** — sign-in, roles, dashboard, donations & receipts, photos, and editors for all site content ✅
6. Polish and launch
