/**
 * Donations API.
 *   GET  /api/donations/config                 what the donation card needs
 *   POST /api/donations/initialize             create a pending donation + Paystack transaction
 *   GET  /api/donations/:reference?t=…         status + receipt for the thank-you page
 *   GET  /api/donations/:reference/receipt.pdf?t=…
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { and, eq } from 'drizzle-orm';
import { CURRENCY } from '@gtyf/shared';
import { coverFee, type DonationInitResponse, type DonationReceipt } from '@gtyf/shared/donations';
import { donationInitSchema } from '@gtyf/shared/donation-schema';
import { db } from '../db/client';
import * as s from '../db/schema';
import { env } from '../env';
import { HttpError, parseBody } from '../lib/http';
import {
  causeNameFor,
  createReceiptToken,
  createReference,
  firstName,
  getOrCreateMonthlyPlan,
  impactSummaryFor,
  recordSuccessfulCharge,
  tokensMatch,
} from '../lib/donations';
import { initializeTransaction, PaystackError, verifyTransaction } from '../lib/paystack';
import { getDonationConfig } from '../lib/donationConfig';
import { writeReceiptPdf } from '../lib/receiptPdf';
import { receiptWords } from '../lib/receiptText';
import { getSiteSettings } from '../lib/settings';

export const donationsRouter = Router();

const maxAmount = () => env.DONATION_MAX_CEDIS * 100;

donationsRouter.get('/config', async (_req, res) => {
  res.set('Cache-Control', 'public, max-age=0, s-maxage=60');
  res.json(await getDonationConfig());
});

const initLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 12,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});

donationsRouter.post('/initialize', initLimiter, async (req, res) => {
  const input = parseBody(donationInitSchema, req.body);
  if (input.amount > maxAmount()) {
    throw new HttpError(400, `For gifts above GH₵ ${env.DONATION_MAX_CEDIS.toLocaleString('en-GH')}, please contact us directly.`, {
      amount: ['This amount is above our online limit.'],
    });
  }

  // Resolve tags. Unknown slugs are rejected rather than silently dropped.
  let programme: { id: string; slug: string; title: string } | undefined;
  if (input.cause) {
    [programme] = await db
      .select({ id: s.programmes.id, slug: s.programmes.slug, title: s.programmes.title })
      .from(s.programmes)
      .where(and(eq(s.programmes.slug, input.cause), eq(s.programmes.status, 'published')));
    if (!programme) throw new HttpError(400, 'Please choose a cause.', { cause: ['Unknown cause.'] });
  }
  const [event] = input.eventSlug
    ? await db.select({ id: s.events.id }).from(s.events).where(eq(s.events.slug, input.eventSlug))
    : [];
  const [campaign] = input.campaignSlug
    ? await db
        .select({ id: s.campaigns.id })
        .from(s.campaigns)
        .where(and(eq(s.campaigns.slug, input.campaignSlug), eq(s.campaigns.status, 'active')))
    : [];

  // Never trust client totals: recompute the fee here.
  const fee = input.coverFee ? coverFee(input.amount, env.PAYSTACK_FEE_PERCENT) : 0;
  const total = input.amount + fee;
  const monthly = input.frequency === 'monthly';
  const causeName = programme?.title ?? "Where it's needed most";
  const impactSummary = await impactSummaryFor(input.amount, programme?.slug ?? null, causeName, monthly);

  const [donor] = await db
    .insert(s.donors)
    .values({ email: input.email, fullName: input.fullName, phone: input.phone, country: input.country, city: input.city })
    .onConflictDoUpdate({
      target: s.donors.email,
      set: { fullName: input.fullName, phone: input.phone, country: input.country, city: input.city },
    })
    .returning({ id: s.donors.id });

  const reference = createReference();
  const receiptToken = createReceiptToken();
  const planCode = monthly ? await getOrCreateMonthlyPlan(total) : null;

  const [donation] = await db
    .insert(s.donations)
    .values({
      reference,
      receiptToken,
      donorId: donor!.id,
      amount: input.amount,
      fee,
      total,
      currency: CURRENCY,
      programmeId: programme?.id ?? null,
      campaignId: campaign?.id ?? null,
      eventId: event?.id ?? null,
      frequency: input.frequency,
      coverFee: input.coverFee,
      anonymous: input.anonymous,
      showOnWall: input.showOnWall && !input.anonymous,
      wallName: input.showOnWall && !input.anonymous ? firstName(input.fullName) : null,
      wallCity: input.showOnWall && !input.anonymous ? (input.city ?? null) : null,
      dedicationType: input.dedication?.type ?? null,
      dedicationName: input.dedication?.name ?? null,
      dedicationEmail: input.dedication?.notifyEmail ?? null,
      impactSummary,
      paystackPlanCode: planCode,
    })
    .returning({ id: s.donations.id });

  try {
    const tx = await initializeTransaction({
      email: input.email,
      amount: total,
      reference,
      currency: CURRENCY,
      // Paystack can only repeat charges on cards, so monthly gifts are card-only.
      channels: monthly ? ['card'] : ['mobile_money', 'card', 'bank'],
      callback_url: `${env.SITE_URL}/donate/thank-you?ref=${encodeURIComponent(reference)}&t=${receiptToken}`,
      ...(planCode ? { plan: planCode } : {}),
      metadata: {
        donation_id: donation!.id,
        cause: programme?.slug ?? 'general',
        frequency: input.frequency,
        dedication: input.dedication ? `${input.dedication.type}: ${input.dedication.name}` : null,
        custom_fields: [
          { display_name: 'Cause', variable_name: 'cause', value: causeName },
          { display_name: 'Frequency', variable_name: 'frequency', value: monthly ? 'Monthly' : 'One-time' },
          { display_name: 'Gift (GH₵)', variable_name: 'gift', value: (input.amount / 100).toFixed(2) },
          { display_name: 'Fee covered (GH₵)', variable_name: 'fee', value: (fee / 100).toFixed(2) },
          ...(input.dedication
            ? [{ display_name: 'Dedication', variable_name: 'dedication', value: `${input.dedication.type === 'honour' ? 'In honour of' : 'In memory of'} ${input.dedication.name}` }]
            : []),
        ],
      },
    });
    await db.update(s.donations).set({ paystackAccessCode: tx.access_code }).where(eq(s.donations.id, donation!.id));

    const body: DonationInitResponse = { reference, accessCode: tx.access_code, receiptToken, amount: input.amount, fee, total };
    res.status(201).json(body);
  } catch (err) {
    const reason = err instanceof PaystackError ? err.message : 'Unknown error';
    await db.update(s.donations).set({ status: 'failed', failureReason: `Initialize failed: ${reason}` }).where(eq(s.donations.id, donation!.id));
    throw new HttpError(502, "We couldn't reach our payment provider. Please try again in a moment.");
  }
});

/** Load a donation for the thank-you page; the receipt token must match. */
async function loadForReceipt(reference: string, token: unknown) {
  const d = await db.query.donations.findFirst({
    where: eq(s.donations.reference, reference),
    with: { donor: true, programme: { columns: { slug: true, title: true } } },
  });
  if (!d || typeof token !== 'string' || !tokensMatch(token, d.receiptToken)) throw new HttpError(404, 'Donation not found');
  return d;
}

donationsRouter.get('/:reference', async (req, res) => {
  let d = await loadForReceipt(req.params.reference, req.query.t);

  // Still pending: ask Paystack directly (server to server). This makes the
  // thank-you page instant even when the webhook is slow, and works in local
  // development where Paystack can't reach the webhook. Same idempotent path.
  if (d.status === 'pending') {
    try {
      const tx = await verifyTransaction(d.reference);
      if (tx.status === 'success') {
        await recordSuccessfulCharge(tx);
      } else if (tx.status === 'failed' || tx.status === 'reversed') {
        await db
          .update(s.donations)
          .set({ status: tx.status, failureReason: tx.gateway_response })
          .where(and(eq(s.donations.id, d.id), eq(s.donations.status, 'pending')));
      }
      // 'abandoned' / 'ongoing': the donor may still be approving on their phone. Stay pending.
      d = await loadForReceipt(req.params.reference, req.query.t);
    } catch {
      /* Paystack unreachable: report pending; the page will retry. */
    }
  }

  const body: DonationReceipt = {
    status: d.status,
    reference: d.reference,
    firstName: firstName(d.donor.fullName),
    donorName: d.donor.fullName,
    amount: d.amount,
    fee: d.fee,
    total: d.total,
    frequency: d.frequency,
    causeSlug: d.programme?.slug ?? null,
    causeName: d.programme?.title ?? "Where it's needed most",
    impactSummary: d.impactSummary,
    paidAt: d.paidAt?.toISOString() ?? null,
    channel: d.channel,
    dedication: d.dedicationType && d.dedicationName ? { type: d.dedicationType, name: d.dedicationName } : null,
  };
  res.set('Cache-Control', 'no-store');
  res.json(body);
});

donationsRouter.get('/:reference/receipt.pdf', async (req, res) => {
  const d = await loadForReceipt(req.params.reference, req.query.t);
  if (d.status !== 'success') throw new HttpError(404, 'Receipt not available yet');
  const settings = await getSiteSettings(db);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="GTYF-receipt-${d.reference}.pdf"`,
    'Cache-Control': 'private, no-store',
  });
  writeReceiptPdf(res, {
    words: receiptWords(settings, firstName(d.donor.fullName)),
    orgName: settings.organisation.name,
    registrationNumber: settings.organisation.registrationNumber.startsWith('TODO') ? undefined : settings.organisation.registrationNumber,
    siteUrl: env.SITE_URL,
    reference: d.reference,
    donorName: d.donor.fullName,
    firstName: firstName(d.donor.fullName),
    paidAt: d.paidAt ?? new Date(),
    causeName: await causeNameFor(d.programmeId),
    amount: d.amount,
    fee: d.fee,
    total: d.total,
    monthly: d.frequency === 'monthly',
    channel: d.channel,
    impact: d.impactSummary,
    dedication: d.dedicationType && d.dedicationName ? { type: d.dedicationType, name: d.dedicationName } : null,
  });
});
