/**
 * POST /api/paystack/webhook
 *
 * Paystack's server tells us what happened. This, not the browser, is the
 * source of truth. Mounted with express.raw() so the HMAC signature is checked
 * against the exact bytes Paystack sent. Each event is stored once
 * (webhook_events.event_key is unique), so retries are harmless.
 */
import type { Request, Response } from 'express';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../db/client';
import * as s from '../db/schema';
import { env } from '../env';
import { paymentFailedEmail } from '../emails/templates';
import { firstName, recordSuccessfulCharge } from '../lib/donations';
import { trySendEmail } from '../lib/mailer';
import { isValidSignature, subscriptionManageLink, type PaystackTransaction } from '../lib/paystack';
import { getSiteSettings } from '../lib/settings';

interface WebhookEvent {
  event: string;
  data: Record<string, unknown> & {
    id?: number;
    reference?: string;
    subscription_code?: string;
    email_token?: string;
    status?: string;
    amount?: number;
    next_payment_date?: string;
    plan?: { plan_code?: string; amount?: number } | string;
    customer?: { email?: string; customer_code?: string };
    subscription?: { subscription_code?: string; email_token?: string; next_payment_date?: string };
  };
}

const eventKeyOf = (e: WebhookEvent) =>
  [e.event, e.data.id ?? '', e.data.reference ?? '', e.data.subscription_code ?? e.data.subscription?.subscription_code ?? '']
    .filter(Boolean)
    .join(':');

export async function paystackWebhook(req: Request, res: Response) {
  const raw = req.body as Buffer;
  if (!Buffer.isBuffer(raw) || !isValidSignature(raw, req.get('x-paystack-signature'))) {
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(raw.toString('utf8')) as WebhookEvent;
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const eventKey = eventKeyOf(event);
  await db
    .insert(s.webhookEvents)
    .values({ eventKey, eventType: event.event, payload: event })
    .onConflictDoNothing({ target: s.webhookEvents.eventKey });
  const [stored] = await db.select().from(s.webhookEvents).where(eq(s.webhookEvents.eventKey, eventKey));
  if (stored?.processedAt) {
    res.json({ ok: true, duplicate: true });
    return;
  }

  try {
    await handle(event);
    await db.update(s.webhookEvents).set({ processedAt: new Date(), error: null }).where(eq(s.webhookEvents.eventKey, eventKey));
    res.json({ ok: true });
  } catch (err) {
    console.error('[webhook]', event.event, eventKey, err);
    await db.update(s.webhookEvents).set({ error: String(err) }).where(eq(s.webhookEvents.eventKey, eventKey));
    // Non-2xx makes Paystack retry later; processedAt is still null so the retry runs.
    res.status(500).json({ error: 'Processing failed' });
  }
}

async function handle(event: WebhookEvent) {
  const d = event.data;
  switch (event.event) {
    case 'charge.success':
      await recordSuccessfulCharge(d as unknown as PaystackTransaction);
      return;

    case 'subscription.create': {
      const email = d.customer?.email?.toLowerCase();
      const planCode = typeof d.plan === 'string' ? d.plan : d.plan?.plan_code;
      if (!email || !planCode || !d.subscription_code) return;
      const [donor] = await db.select().from(s.donors).where(eq(s.donors.email, email));
      if (!donor) return;
      const [origin] = await db
        .select()
        .from(s.donations)
        .where(and(eq(s.donations.donorId, donor.id), eq(s.donations.paystackPlanCode, planCode)))
        .orderBy(s.donations.createdAt)
        .limit(1);
      const welcomeAlreadySent = !!(origin?.metadata as { welcomeSent?: boolean } | null)?.welcomeSent;
      const [sub] = await db
        .insert(s.subscriptions)
        .values({
          donorId: donor.id,
          subscriptionCode: d.subscription_code,
          emailToken: d.email_token ?? null,
          planCode,
          amount: origin?.amount ?? (typeof d.plan === 'object' ? (d.plan.amount ?? 0) : 0),
          programmeId: origin?.programmeId ?? null,
          campaignId: origin?.campaignId ?? null,
          status: 'active',
          nextPaymentDate: d.next_payment_date ? new Date(d.next_payment_date) : null,
          welcomeSentAt: welcomeAlreadySent ? new Date() : null,
        })
        .onConflictDoUpdate({
          target: s.subscriptions.subscriptionCode,
          set: { status: 'active', emailToken: d.email_token ?? null, nextPaymentDate: d.next_payment_date ? new Date(d.next_payment_date) : null },
        })
        .returning();
      await db
        .update(s.donations)
        .set({ subscriptionId: sub!.id, paystackSubscriptionCode: d.subscription_code })
        .where(and(eq(s.donations.donorId, donor.id), eq(s.donations.paystackPlanCode, planCode), isNull(s.donations.subscriptionId)));
      return;
    }

    case 'subscription.not_renew':
    case 'subscription.disable': {
      if (!d.subscription_code) return;
      const status = event.event === 'subscription.not_renew' ? 'non_renewing' : d.status === 'complete' ? 'completed' : 'cancelled';
      await db
        .update(s.subscriptions)
        .set({ status, cancelledAt: status === 'non_renewing' ? null : new Date() })
        .where(eq(s.subscriptions.subscriptionCode, d.subscription_code));
      return;
    }

    case 'invoice.payment_failed': {
      const code = d.subscription?.subscription_code ?? d.subscription_code;
      if (!code) return;
      const sub = await db.query.subscriptions.findFirst({ where: eq(s.subscriptions.subscriptionCode, code), with: { donor: true } });
      if (!sub) return;
      await db.update(s.subscriptions).set({ status: 'attention' }).where(eq(s.subscriptions.id, sub.id));
      // At most one "update your card" email per day.
      if (sub.manageLinkSentAt && Date.now() - sub.manageLinkSentAt.getTime() < 24 * 3600 * 1000) return;
      const manage = await subscriptionManageLink(code).catch(() => null);
      const settings = await getSiteSettings(db);
      const sent = await trySendEmail(
        paymentFailedEmail({ name: settings.organisation.name, siteUrl: env.SITE_URL }, sub.donor.email, {
          firstName: firstName(sub.donor.fullName),
          amount: sub.amount,
          manageUrl: manage?.link ?? null,
        }),
      );
      if (sent) await db.update(s.subscriptions).set({ manageLinkSentAt: new Date() }).where(eq(s.subscriptions.id, sub.id));
      return;
    }

    default:
      // Other events (invoice.create, transfer.*, …) are stored but need no action.
      return;
  }
}
