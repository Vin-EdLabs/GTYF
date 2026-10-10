/**
 * Public form submissions: volunteers, partners, contact, newsletter.
 * Each is rate limited, honeypot-checked and validated with the same zod
 * schema the browser uses. Submissions are stored first (so nothing is ever
 * lost), then land in the admin Inbox; the team gets an email alert and the
 * sender gets a friendly confirmation. Emails never block the response.
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { eq } from 'drizzle-orm';
import { contactSchema, newsletterSchema, partnerSchema, volunteerSchema } from '@gtyf/shared/forms';
import { db } from '../db/client';
import * as s from '../db/schema';
import { formAlertEmail, formThanksEmail, type FormKind } from '../emails/templates';
import { env } from '../env';
import { isBot, parseBody } from '../lib/http';
import { trySendEmail } from '../lib/mailer';
import { getSiteSettings } from '../lib/settings';

export const formsRouter = Router();

formsRouter.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
  }),
);

// Bots that fill the honeypot get a normal-looking success and nothing is stored.
formsRouter.use((req, res, next) => {
  if (req.method === 'POST' && isBot(req.body)) {
    res.status(201).json({ ok: true });
    return;
  }
  next();
});

/** Alert the team and thank the sender, in the background. */
function notify(kind: FormKind, name: string, email: string, rows: [string, string][]) {
  void (async () => {
    const settings = await getSiteSettings(db);
    const org = { name: settings.organisation.name, siteUrl: env.SITE_URL };
    if (env.ADMIN_ALERT_EMAIL) {
      await trySendEmail(formAlertEmail(org, env.ADMIN_ALERT_EMAIL, { kind, name, rows, inboxUrl: `${env.SITE_URL}/admin/inbox?tab=${kind}` }));
    }
    await trySendEmail(formThanksEmail(org, email, { kind, firstName: name.trim().split(/\s+/)[0] ?? name }));
  })().catch((e) => console.error('[forms] notify failed', e));
}

formsRouter.post('/newsletter', async (req, res) => {
  const input = parseBody(newsletterSchema, req.body);
  await db
    .insert(s.newsletterSubscribers)
    .values(input)
    // Re-subscribing clears a previous unsubscribe.
    .onConflictDoUpdate({ target: s.newsletterSubscribers.email, set: { unsubscribedAt: null } });
  res.status(201).json({ ok: true });
});

formsRouter.post('/volunteer', async (req, res) => {
  const { eventSlug, ...input } = parseBody(volunteerSchema, req.body);
  let eventId: string | null = null;
  let eventTitle = '';
  if (eventSlug) {
    const [e] = await db.select({ id: s.events.id, title: s.events.title }).from(s.events).where(eq(s.events.slug, eventSlug)).limit(1);
    eventId = e?.id ?? null;
    eventTitle = e?.title ?? '';
  }
  await db.insert(s.volunteers).values({ ...input, eventId });
  res.status(201).json({ ok: true });
  notify('volunteer', input.fullName, input.email, [
    ['Name', input.fullName],
    ['Email', input.email],
    ['Phone', input.phone ?? ''],
    ['Lives in', input.location ?? ''],
    ['Would like to help with', input.interests.join(', ')],
    ['Available', input.availability ?? ''],
    ['For event', eventTitle],
    ['Message', input.message ?? ''],
  ]);
});

formsRouter.post('/partner', async (req, res) => {
  const input = parseBody(partnerSchema, req.body);
  await db.insert(s.partnerEnquiries).values(input);
  res.status(201).json({ ok: true });
  notify('partner', input.contactName, input.email, [
    ['Organisation', input.organisation],
    ['Type', input.partnershipType],
    ['Contact', input.contactName],
    ['Email', input.email],
    ['Phone', input.phone ?? ''],
    ['Message', input.message],
  ]);
});

formsRouter.post('/contact', async (req, res) => {
  const input = parseBody(contactSchema, req.body);
  await db.insert(s.contactMessages).values(input);
  res.status(201).json({ ok: true });
  notify('contact', input.fullName, input.email, [
    ['Name', input.fullName],
    ['Email', input.email],
    ['Phone', input.phone ?? ''],
    ['Subject', input.subject ?? ''],
    ['Message', input.message],
  ]);
});
