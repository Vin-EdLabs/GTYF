/**
 * Donation lifecycle. Every path that can mark a donation as paid (the
 * Paystack webhook, and the server-to-Paystack verify call behind the thank-you
 * page) goes through `recordSuccessfulCharge`, which:
 *   - trusts only data fetched from / signed by Paystack, never the browser,
 *   - checks the charged amount and currency match what we asked for,
 *   - flips pending → success with a conditional UPDATE, so it happens once,
 *   - then sends each email at most once (tracked by *_sent_at columns).
 */
import crypto from 'node:crypto';
import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import { CURRENCY } from '@gtyf/shared';
import { impactSentence, translateImpact } from '@gtyf/shared/donations';
import { db } from '../db/client';
import * as s from '../db/schema';
import { adminAlertEmail, dedicationEmail, monthlyWelcomeEmail, receiptEmail } from '../emails/templates';
import { env } from '../env';
import { trySendEmail } from './mailer';
import { receiptWords } from './receiptText';
import { createPlan, type PaystackTransaction } from './paystack';
import { getSiteSettings } from './settings';

const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I: easy to read aloud

/** GTYF-2026-7KQ2MX */
export function createReference(now = new Date()) {
  const bytes = crypto.randomBytes(6);
  const code = [...bytes].map((b) => REF_ALPHABET[b % REF_ALPHABET.length]).join('');
  return `GTYF-${now.getUTCFullYear()}-${code}`;
}

export const createReceiptToken = () => crypto.randomBytes(24).toString('base64url');

export function tokensMatch(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export const firstName = (full: string) => full.trim().split(/\s+/)[0] ?? full;

/** One Paystack plan per (amount, monthly, GHS), cached in paystack_plans. */
export async function getOrCreateMonthlyPlan(amount: number) {
  const [cached] = await db
    .select()
    .from(s.paystackPlans)
    .where(and(eq(s.paystackPlans.amount, amount), eq(s.paystackPlans.currency, CURRENCY), eq(s.paystackPlans.interval, 'monthly')))
    .limit(1);
  if (cached) return cached.planCode;

  const name = `GTYF monthly GH₵ ${(amount / 100).toFixed(2)}`;
  const plan = await createPlan({ name, amount, interval: 'monthly', currency: CURRENCY, description: 'Monthly gift to Guide The Youth Foundation' });
  await db.insert(s.paystackPlans).values({ planCode: plan.plan_code, name, amount, currency: CURRENCY, interval: 'monthly' }).onConflictDoNothing();
  return plan.plan_code;
}

/** Programme title for a donation, or the general cause label. */
export async function causeNameFor(programmeId: string | null) {
  if (!programmeId) return "Where it's needed most";
  const [p] = await db.select({ title: s.programmes.title }).from(s.programmes).where(eq(s.programmes.id, programmeId));
  return p?.title ?? "Where it's needed most";
}

/** Frozen impact line for receipts: "GH₵ 200 = 1 full school uniform + 1 pair of shoes". */
export async function impactSummaryFor(amount: number, programmeSlug: string | null, causeName: string, monthly: boolean) {
  const rows = await db.query.impactItems.findMany({
    where: eq(s.impactItems.isActive, true),
    with: { programme: { columns: { slug: true } } },
  });
  const items = rows.map((i) => ({
    key: i.key,
    programmeSlug: i.programme?.slug ?? null,
    label: i.label,
    singular: i.singular,
    plural: i.plural,
    unitPrice: i.unitPrice,
    icon: i.icon,
  }));
  return impactSentence(amount, translateImpact(amount, items, programmeSlug), causeName, monthly);
}

const planCodeOf = (tx: PaystackTransaction) =>
  typeof tx.plan === 'string' ? tx.plan : (tx.plan?.plan_code ?? null);

/**
 * A monthly renewal arrives as a new charge with a reference Paystack made up.
 * Create a donation row for it, copying the cause from the donor's subscription.
 */
async function createRenewalDonation(tx: PaystackTransaction) {
  const planCode = planCodeOf(tx);
  if (!planCode) return null;
  const [donor] = await db.select().from(s.donors).where(eq(s.donors.email, tx.customer.email.toLowerCase()));
  if (!donor) return null;
  // The original gift on this plan tells us the cause and preferences.
  const [original] = await db
    .select()
    .from(s.donations)
    .where(and(eq(s.donations.donorId, donor.id), eq(s.donations.paystackPlanCode, planCode)))
    .orderBy(s.donations.createdAt)
    .limit(1);
  if (!original) return null;
  const [sub] = await db
    .select({ id: s.subscriptions.id })
    .from(s.subscriptions)
    .where(and(eq(s.subscriptions.donorId, donor.id), eq(s.subscriptions.planCode, planCode)))
    .limit(1);

  const [row] = await db
    .insert(s.donations)
    .values({
      reference: tx.reference,
      receiptToken: createReceiptToken(),
      donorId: donor.id,
      amount: original.amount,
      fee: original.fee,
      total: original.total,
      currency: original.currency,
      programmeId: original.programmeId,
      campaignId: original.campaignId,
      frequency: 'monthly',
      status: 'pending',
      coverFee: original.coverFee,
      anonymous: original.anonymous,
      showOnWall: original.showOnWall,
      wallName: original.wallName,
      wallCity: original.wallCity,
      impactSummary: original.impactSummary,
      paystackPlanCode: planCode,
      subscriptionId: sub?.id ?? original.subscriptionId,
      metadata: { renewalOf: original.reference },
    })
    .onConflictDoNothing({ target: s.donations.reference })
    .returning();
  return row ?? null;
}

export type ChargeOutcome = 'recorded' | 'already_recorded' | 'unknown_reference' | 'amount_mismatch';

export async function recordSuccessfulCharge(tx: PaystackTransaction): Promise<ChargeOutcome> {
  let [donation] = await db.select().from(s.donations).where(eq(s.donations.reference, tx.reference));
  if (!donation) donation = (await createRenewalDonation(tx)) ?? undefined;
  if (!donation) {
    console.warn('[donations] charge for unknown reference', tx.reference);
    return 'unknown_reference';
  }
  if (donation.status === 'success') return 'already_recorded';

  if (tx.amount !== donation.total || tx.currency !== donation.currency) {
    console.error('[donations] amount mismatch', tx.reference, { expected: donation.total, got: tx.amount, currency: tx.currency });
    await db
      .update(s.donations)
      .set({ status: 'failed', failureReason: `Amount mismatch: expected ${donation.total}, Paystack charged ${tx.amount} ${tx.currency}` })
      .where(eq(s.donations.id, donation.id));
    return 'amount_mismatch';
  }

  // Conditional update: only one caller (webhook or verify) wins the race.
  const [updated] = await db
    .update(s.donations)
    .set({
      status: 'success',
      paidAt: tx.paid_at ? new Date(tx.paid_at) : new Date(),
      channel: tx.channel,
      paystackTransactionId: tx.id,
      failureReason: null,
    })
    .where(and(eq(s.donations.id, donation.id), ne(s.donations.status, 'success')))
    .returning();
  if (!updated) return 'already_recorded';

  await db
    .update(s.donors)
    .set({ paystackCustomerCode: tx.customer.customer_code })
    .where(and(eq(s.donors.id, updated.donorId), isNull(s.donors.paystackCustomerCode)));

  // Campaign totals are only ever changed here, from Paystack-confirmed charges.
  if (updated.campaignId) {
    const [{ previous }] = (await db
      .select({ previous: sql<number>`count(*)::int` })
      .from(s.donations)
      .where(
        and(
          eq(s.donations.campaignId, updated.campaignId),
          eq(s.donations.donorId, updated.donorId),
          eq(s.donations.status, 'success'),
          ne(s.donations.id, updated.id),
        ),
      )) as [{ previous: number }];
    await db
      .update(s.campaigns)
      .set({
        raisedAmount: sql`${s.campaigns.raisedAmount} + ${updated.amount}`,
        donorCount: previous === 0 ? sql`${s.campaigns.donorCount} + 1` : s.campaigns.donorCount,
      })
      .where(eq(s.campaigns.id, updated.campaignId));
  }

  await sendDonationEmails(updated.id);
  return 'recorded';
}

/** Receipt, admin alert and dedication notice. Each goes out at most once. */
export async function sendDonationEmails(donationId: string) {
  const d = await db.query.donations.findFirst({
    where: eq(s.donations.id, donationId),
    with: { donor: true, programme: { columns: { title: true } } },
  });
  if (!d || d.status !== 'success') return;

  const settings = await getSiteSettings(db);
  const org = {
    name: settings.organisation.name,
    siteUrl: env.SITE_URL,
    registrationNumber: settings.organisation.registrationNumber.startsWith('TODO') ? undefined : settings.organisation.registrationNumber,
  };
  const causeName = d.programme?.title ?? "Where it's needed most";
  const monthly = d.frequency === 'monthly';
  const dedication = d.dedicationType && d.dedicationName ? { type: d.dedicationType, name: d.dedicationName } : null;
  const receiptUrl = `${env.SITE_URL}/donate/thank-you?ref=${encodeURIComponent(d.reference)}&t=${d.receiptToken}`;
  const pdfUrl = `${env.SITE_URL}/api/donations/${encodeURIComponent(d.reference)}/receipt.pdf?t=${d.receiptToken}`;

  if (!d.receiptSentAt) {
    const sent = await trySendEmail(
      receiptEmail(org, d.donor.email, {
        words: receiptWords(settings, firstName(d.donor.fullName)),
        firstName: firstName(d.donor.fullName),
        donorName: d.donor.fullName,
        reference: d.reference,
        paidAt: d.paidAt ?? new Date(),
        causeName,
        amount: d.amount,
        fee: d.fee,
        total: d.total,
        monthly,
        impact: d.impactSummary,
        channel: d.channel,
        dedication,
        receiptUrl,
        pdfUrl,
      }),
    );
    if (sent) await db.update(s.donations).set({ receiptSentAt: new Date() }).where(eq(s.donations.id, d.id));
  }

  if (!d.adminAlertSentAt && env.ADMIN_ALERT_EMAIL) {
    const sent = await trySendEmail(
      adminAlertEmail(org, env.ADMIN_ALERT_EMAIL, {
        reference: d.reference,
        donorName: d.donor.fullName,
        donorEmail: d.donor.email,
        amount: d.amount,
        total: d.total,
        monthly,
        causeName,
        channel: d.channel,
        anonymous: d.anonymous,
        adminUrl: `${env.SITE_URL}/admin/donations?ref=${encodeURIComponent(d.reference)}`,
      }),
    );
    if (sent) await db.update(s.donations).set({ adminAlertSentAt: new Date() }).where(eq(s.donations.id, d.id));
  }

  if (dedication && d.dedicationEmail && !d.dedicationNotifiedAt) {
    const sent = await trySendEmail(
      dedicationEmail(org, d.dedicationEmail, {
        donorFirstName: d.anonymous ? 'Someone' : firstName(d.donor.fullName),
        type: dedication.type,
        name: dedication.name,
        causeName,
        siteUrl: env.SITE_URL,
      }),
    );
    if (sent) await db.update(s.donations).set({ dedicationNotifiedAt: new Date() }).where(eq(s.donations.id, d.id));
  }

  // First successful monthly gift: welcome email (once per subscription/plan).
  if (monthly && !(d.metadata as { renewalOf?: string } | null)?.renewalOf) {
    await sendMonthlyWelcome(d.donorId, d.paystackPlanCode, {
      to: d.donor.email,
      firstName: firstName(d.donor.fullName),
      amount: d.amount,
      causeName,
      impact: d.impactSummary,
      org,
    });
  }
}

async function sendMonthlyWelcome(
  donorId: string,
  planCode: string | null,
  p: { to: string; firstName: string; amount: number; causeName: string; impact: string | null; org: { name: string; siteUrl: string; registrationNumber?: string } },
) {
  if (!planCode) return;
  const [sub] = await db
    .select()
    .from(s.subscriptions)
    .where(and(eq(s.subscriptions.donorId, donorId), eq(s.subscriptions.planCode, planCode)))
    .limit(1);
  if (sub?.welcomeSentAt) return;
  // Mark first (the subscription row may not exist yet; subscription.create will check the donation).
  const sent = await trySendEmail(monthlyWelcomeEmail(p.org, p.to, p));
  if (sent && sub) await db.update(s.subscriptions).set({ welcomeSentAt: new Date() }).where(eq(s.subscriptions.id, sub.id));
  if (sent && !sub) {
    // Remember on the donation so the later subscription.create doesn't send it again.
    await db
      .update(s.donations)
      .set({ metadata: sql`coalesce(${s.donations.metadata}, '{}'::jsonb) || '{"welcomeSent":true}'::jsonb` })
      .where(and(eq(s.donations.donorId, donorId), eq(s.donations.paystackPlanCode, planCode)));
  }
}
