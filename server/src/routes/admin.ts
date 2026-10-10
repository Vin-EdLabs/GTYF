/**
 * Admin API (/api/admin/*). Everything except /auth/login requires a signed-in
 * admin; finance data requires the finance or super_admin role; managing admins
 * requires super_admin. Every change is written to the activity log.
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { and, count, desc, eq, gte, ilike, lt, ne, or, sql, sum, type SQL } from 'drizzle-orm';
import {
  changePasswordSchema,
  createAdminSchema,
  loginSchema,
  refundSchema,
  resetPasswordSchema,
  updateAdminSchema,
  updateDonationSchema,
  type ActivityEntry,
  type AdminDonationDetail,
  type AdminDonationList,
  type AdminDonationRow,
  type DashboardStats,
} from '@gtyf/shared/admin';
import { DONATION_FREQUENCIES, DONATION_STATUSES } from '@gtyf/shared';
import { db } from '../db/client';
import * as s from '../db/schema';
import { env } from '../env';
import {
  AccountLockedError,
  checkCredentials,
  endSession,
  hashPassword,
  logActivity,
  publicAdmin,
  requireAdmin,
  startSession,
  verifyPassword,
} from '../lib/auth';
import { causeNameFor, firstName, sendDonationEmails } from '../lib/donations';
import { HttpError, parseBody } from '../lib/http';
import { writeReceiptPdf } from '../lib/receiptPdf';
import { receiptWords } from '../lib/receiptText';
import { getSiteSettings } from '../lib/settings';

export const adminRouter = Router();
const finance = requireAdmin('finance');
const superOnly = requireAdmin('super_admin');

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // Per visitor. Each account also locks after 10 wrong passwords (lib/auth.ts).
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Too many sign-in attempts. Please wait 15 minutes and try again.' },
});

adminRouter.post('/auth/login', loginLimiter, async (req, res) => {
  const { email, password } = parseBody(loginSchema, req.body);
  let admin;
  try {
    admin = await checkCredentials(email, password);
  } catch (err) {
    if (err instanceof AccountLockedError) throw new HttpError(429, err.message);
    throw err;
  }
  if (!admin) throw new HttpError(401, 'That email and password don’t match an active admin.');
  await db.update(s.admins).set({ lastLoginAt: new Date() }).where(eq(s.admins.id, admin.id));
  startSession(res, admin);
  await logActivity(admin, 'login', 'admin', admin.id, `${admin.name} signed in`);
  res.json({ admin: publicAdmin(admin) });
});

adminRouter.post('/auth/logout', (_req, res) => {
  endSession(res);
  res.json({ ok: true });
});

adminRouter.get('/auth/me', requireAdmin(), (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ admin: publicAdmin(req.admin!) });
});

adminRouter.post('/auth/password', requireAdmin(), async (req, res) => {
  const { currentPassword, newPassword } = parseBody(changePasswordSchema, req.body);
  const me = req.admin!;
  if (!(await verifyPassword(currentPassword, me.passwordHash))) {
    throw new HttpError(400, 'Your current password is not correct.', { currentPassword: ['Not correct.'] });
  }
  const [updated] = await db.update(s.admins).set({ passwordHash: await hashPassword(newPassword) }).where(eq(s.admins.id, me.id)).returning();
  startSession(res, updated!); // keep this device signed in; other sessions end
  await logActivity(me, 'update', 'admin', me.id, `${me.name} changed their password`);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Admin users (super admins only)
// ---------------------------------------------------------------------------

adminRouter.get('/admins', superOnly, async (_req, res) => {
  const rows = await db.select().from(s.admins).orderBy(s.admins.createdAt);
  res.json(rows.map(publicAdmin));
});

adminRouter.post('/admins', superOnly, async (req, res) => {
  const input = parseBody(createAdminSchema, req.body);
  const [exists] = await db.select({ id: s.admins.id }).from(s.admins).where(eq(s.admins.email, input.email));
  if (exists) throw new HttpError(400, 'An admin with that email already exists.', { email: ['Already in use.'] });
  const [created] = await db
    .insert(s.admins)
    .values({ name: input.name, email: input.email, role: input.role, passwordHash: await hashPassword(input.password) })
    .returning();
  await logActivity(req.admin, 'create', 'admin', created!.id, `Added ${created!.role.replace('_', ' ')} ${created!.name} (${created!.email})`);
  res.status(201).json(publicAdmin(created!));
});

async function assertNotLastSuperAdmin(adminId: string) {
  const [{ n }] = (await db
    .select({ n: count() })
    .from(s.admins)
    .where(and(eq(s.admins.role, 'super_admin'), eq(s.admins.isActive, true), ne(s.admins.id, adminId)))) as [{ n: number }];
  if (n === 0) throw new HttpError(400, 'There must always be at least one active super admin.');
}

adminRouter.patch('/admins/:id', superOnly, async (req, res) => {
  const input = parseBody(updateAdminSchema, req.body);
  const [target] = await db.select().from(s.admins).where(eq(s.admins.id, String(req.params.id)));
  if (!target) throw new HttpError(404, 'Admin not found');
  const demoting = target.role === 'super_admin' && input.role && input.role !== 'super_admin';
  const deactivating = target.role === 'super_admin' && input.isActive === false;
  if (demoting || deactivating) await assertNotLastSuperAdmin(target.id);
  if (target.id === req.admin!.id && input.isActive === false) throw new HttpError(400, 'You can’t deactivate your own account.');

  const [updated] = await db.update(s.admins).set(input).where(eq(s.admins.id, target.id)).returning();
  const what = [
    input.role && input.role !== target.role ? `role → ${input.role.replace('_', ' ')}` : null,
    input.isActive !== undefined && input.isActive !== target.isActive ? (input.isActive ? 'reactivated' : 'deactivated') : null,
    input.name && input.name !== target.name ? `renamed to ${input.name}` : null,
  ]
    .filter(Boolean)
    .join(', ');
  await logActivity(req.admin, 'update', 'admin', target.id, `Updated ${target.name}: ${what || 'no changes'}`, input);
  res.json(publicAdmin(updated!));
});

adminRouter.post('/admins/:id/password', superOnly, async (req, res) => {
  const { password } = parseBody(resetPasswordSchema, req.body);
  const [target] = await db
    .update(s.admins)
    .set({ passwordHash: await hashPassword(password) })
    .where(eq(s.admins.id, String(req.params.id)))
    .returning();
  if (!target) throw new HttpError(404, 'Admin not found');
  await logActivity(req.admin, 'update', 'admin', target.id, `Reset the password for ${target.name}`);
  res.json({ ok: true });
});

adminRouter.get('/activity', superOnly, async (_req, res) => {
  const rows = await db
    .select({ id: s.activityLog.id, adminName: s.admins.name, action: s.activityLog.action, summary: s.activityLog.summary, createdAt: s.activityLog.createdAt })
    .from(s.activityLog)
    .leftJoin(s.admins, eq(s.activityLog.adminId, s.admins.id))
    .orderBy(desc(s.activityLog.createdAt))
    .limit(100);
  const body: ActivityEntry[] = rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  res.json(body);
});

// ---------------------------------------------------------------------------
// Donations
// ---------------------------------------------------------------------------

const donationSelect = {
  id: s.donations.id,
  reference: s.donations.reference,
  donorName: s.donors.fullName,
  donorEmail: s.donors.email,
  amount: s.donations.amount,
  fee: s.donations.fee,
  total: s.donations.total,
  frequency: s.donations.frequency,
  status: s.donations.status,
  programmeTitle: s.programmes.title,
  channel: s.donations.channel,
  anonymous: s.donations.anonymous,
  createdAt: s.donations.createdAt,
  paidAt: s.donations.paidAt,
};

type SelectedRow = { [K in keyof typeof donationSelect]: unknown } & {
  createdAt: Date;
  paidAt: Date | null;
  programmeTitle: string | null;
};

const toRow = (r: SelectedRow): AdminDonationRow => ({
  id: r.id as string,
  reference: r.reference as string,
  donorName: r.donorName as string,
  donorEmail: r.donorEmail as string,
  amount: r.amount as number,
  fee: r.fee as number,
  total: r.total as number,
  frequency: r.frequency as AdminDonationRow['frequency'],
  status: r.status as AdminDonationRow['status'],
  causeName: r.programmeTitle ?? "Where it's needed most",
  channel: r.channel as string | null,
  anonymous: r.anonymous as boolean,
  createdAt: r.createdAt.toISOString(),
  paidAt: r.paidAt?.toISOString() ?? null,
});

function donationFilters(q: Record<string, unknown>): SQL | undefined {
  const where: SQL[] = [];
  const text = typeof q.q === 'string' ? q.q.trim() : '';
  if (text) {
    const like = `%${text.replace(/[%_]/g, '\\$&')}%`;
    where.push(or(ilike(s.donations.reference, like), ilike(s.donors.fullName, like), ilike(s.donors.email, like))!);
  }
  if (typeof q.status === 'string' && (DONATION_STATUSES as readonly string[]).includes(q.status)) {
    where.push(eq(s.donations.status, q.status as (typeof DONATION_STATUSES)[number]));
  }
  if (typeof q.frequency === 'string' && (DONATION_FREQUENCIES as readonly string[]).includes(q.frequency)) {
    where.push(eq(s.donations.frequency, q.frequency as (typeof DONATION_FREQUENCIES)[number]));
  }
  if (typeof q.cause === 'string' && q.cause) {
    where.push(q.cause === 'general' ? sql`${s.donations.programmeId} is null` : eq(s.programmes.slug, q.cause));
  }
  if (typeof q.from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(q.from)) where.push(gte(s.donations.createdAt, new Date(`${q.from}T00:00:00Z`)));
  if (typeof q.to === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(q.to)) {
    const end = new Date(`${q.to}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    where.push(lt(s.donations.createdAt, end));
  }
  return where.length ? and(...where) : undefined;
}

const baseDonationQuery = () =>
  db
    .select(donationSelect)
    .from(s.donations)
    .innerJoin(s.donors, eq(s.donations.donorId, s.donors.id))
    .leftJoin(s.programmes, eq(s.donations.programmeId, s.programmes.id));

adminRouter.get('/donations', finance, async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(req.query.pageSize) || 25));
  const where = donationFilters(req.query);

  const [rows, [agg]] = await Promise.all([
    baseDonationQuery().where(where).orderBy(desc(s.donations.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    db
      .select({
        n: count(),
        raised: sql<number>`coalesce(sum(case when ${s.donations.status} = 'success' then ${s.donations.amount} else 0 end), 0)::int`,
      })
      .from(s.donations)
      .innerJoin(s.donors, eq(s.donations.donorId, s.donors.id))
      .leftJoin(s.programmes, eq(s.donations.programmeId, s.programmes.id))
      .where(where),
  ]);
  const body: AdminDonationList = { rows: rows.map((r) => toRow(r as SelectedRow)), page, pageSize, totalRows: agg!.n, raisedInFilter: agg!.raised };
  res.set('Cache-Control', 'no-store');
  res.json(body);
});

const csvCell = (v: unknown) => {
  const t = v === null || v === undefined ? '' : String(v);
  // Neutralise spreadsheet formulas, then quote.
  const safe = /^[=+\-@]/.test(t) ? `'${t}` : t;
  return `"${safe.replace(/"/g, '""')}"`;
};

adminRouter.get('/donations/export.csv', finance, async (req, res) => {
  const rows = (await baseDonationQuery().where(donationFilters(req.query)).orderBy(desc(s.donations.createdAt)).limit(50_000)).map((r) =>
    toRow(r as SelectedRow),
  );
  const header = ['Reference', 'Date', 'Status', 'Donor', 'Email', 'Cause', 'Frequency', 'Gift (GHS)', 'Fee covered (GHS)', 'Total charged (GHS)', 'Channel', 'Anonymous'];
  const lines = rows.map((r) =>
    [r.reference, (r.paidAt ?? r.createdAt).slice(0, 10), r.status, r.donorName, r.donorEmail, r.causeName, r.frequency, (r.amount / 100).toFixed(2), (r.fee / 100).toFixed(2), (r.total / 100).toFixed(2), r.channel ?? '', r.anonymous ? 'yes' : 'no']
      .map(csvCell)
      .join(','),
  );
  await logActivity(req.admin, 'export', 'donation', null, `Exported ${rows.length} donations to CSV`);
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="gtyf-donations-${new Date().toISOString().slice(0, 10)}.csv"`,
    'Cache-Control': 'no-store',
  });
  res.send('﻿' + [header.map(csvCell).join(','), ...lines].join('\r\n'));
});

async function loadDonation(id: string) {
  const d = await db.query.donations.findFirst({
    where: eq(s.donations.id, id),
    with: {
      donor: true,
      programme: { columns: { slug: true, title: true } },
      campaign: { columns: { title: true } },
      event: { columns: { title: true } },
      subscription: { columns: { subscriptionCode: true } },
    },
  });
  if (!d) throw new HttpError(404, 'Donation not found');
  return d;
}

function toDetail(d: Awaited<ReturnType<typeof loadDonation>>): AdminDonationDetail {
  const causeName = d.programme?.title ?? "Where it's needed most";
  return {
    id: d.id,
    reference: d.reference,
    donorName: d.donor.fullName,
    donorEmail: d.donor.email,
    donorPhone: d.donor.phone,
    donorCountry: d.donor.country,
    donorCity: d.donor.city,
    amount: d.amount,
    fee: d.fee,
    total: d.total,
    frequency: d.frequency,
    status: d.status,
    causeName,
    channel: d.channel,
    anonymous: d.anonymous,
    showOnWall: d.showOnWall,
    createdAt: d.createdAt.toISOString(),
    paidAt: d.paidAt?.toISOString() ?? null,
    campaignTitle: d.campaign?.title ?? null,
    eventTitle: d.event?.title ?? null,
    dedication: d.dedicationType && d.dedicationName ? { type: d.dedicationType, name: d.dedicationName, email: d.dedicationEmail } : null,
    impactSummary: d.impactSummary,
    failureReason: d.failureReason,
    adminNotes: d.adminNotes,
    refundedAt: d.refundedAt?.toISOString() ?? null,
    refundReason: d.refundReason,
    receiptSentAt: d.receiptSentAt?.toISOString() ?? null,
    paystackTransactionId: d.paystackTransactionId,
    subscriptionCode: d.subscription?.subscriptionCode ?? d.paystackSubscriptionCode,
    receipt: {
      status: d.status,
      reference: d.reference,
      firstName: firstName(d.donor.fullName),
      donorName: d.donor.fullName,
      amount: d.amount,
      fee: d.fee,
      total: d.total,
      frequency: d.frequency,
      causeSlug: d.programme?.slug ?? null,
      causeName,
      impactSummary: d.impactSummary,
      paidAt: d.paidAt?.toISOString() ?? null,
      channel: d.channel,
      dedication: d.dedicationType && d.dedicationName ? { type: d.dedicationType, name: d.dedicationName } : null,
    },
  };
}

adminRouter.get('/donations/:id', finance, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(toDetail(await loadDonation(String(req.params.id))));
});

adminRouter.patch('/donations/:id', finance, async (req, res) => {
  const input = parseBody(updateDonationSchema, req.body);
  const d = await loadDonation(String(req.params.id));
  const changes: string[] = [];

  if (input.donorName !== undefined || input.donorEmail !== undefined) {
    if (input.donorEmail && input.donorEmail !== d.donor.email) {
      const [clash] = await db.select({ id: s.donors.id }).from(s.donors).where(eq(s.donors.email, input.donorEmail));
      if (clash && clash.id !== d.donorId) throw new HttpError(400, 'Another donor already uses that email.', { donorEmail: ['Already used by another donor.'] });
      changes.push(`email ${d.donor.email} → ${input.donorEmail}`);
    }
    if (input.donorName && input.donorName !== d.donor.fullName) changes.push(`name “${d.donor.fullName}” → “${input.donorName}”`);
    await db
      .update(s.donors)
      .set({ ...(input.donorName ? { fullName: input.donorName } : {}), ...(input.donorEmail ? { email: input.donorEmail } : {}) })
      .where(eq(s.donors.id, d.donorId));
  }
  if (input.adminNotes !== undefined && input.adminNotes !== (d.adminNotes ?? '')) {
    await db.update(s.donations).set({ adminNotes: input.adminNotes || null }).where(eq(s.donations.id, d.id));
    changes.push('notes updated');
  }
  if (changes.length) await logActivity(req.admin, 'update', 'donation', d.id, `Edited ${d.reference}: ${changes.join('; ')}`, input);
  res.json(toDetail(await loadDonation(d.id)));
});

/**
 * Record a refund. The money itself is returned in the Paystack dashboard;
 * this marks the gift as refunded here and takes it out of the totals.
 */
adminRouter.post('/donations/:id/refund', finance, async (req, res) => {
  const { reason } = parseBody(refundSchema, req.body);
  const d = await loadDonation(String(req.params.id));
  if (d.status !== 'success') throw new HttpError(400, 'Only successful gifts can be marked as refunded.');
  const [updated] = await db
    .update(s.donations)
    .set({ status: 'reversed', refundedAt: new Date(), refundReason: reason })
    .where(and(eq(s.donations.id, d.id), eq(s.donations.status, 'success')))
    .returning();
  if (updated?.campaignId) {
    await db
      .update(s.campaigns)
      .set({ raisedAmount: sql`greatest(${s.campaigns.raisedAmount} - ${updated.amount}, 0)` })
      .where(eq(s.campaigns.id, updated.campaignId));
  }
  await logActivity(req.admin, 'refund', 'donation', d.id, `Marked ${d.reference} (${(d.amount / 100).toFixed(2)} GHS) as refunded: ${reason}`);
  res.json(toDetail(await loadDonation(d.id)));
});

adminRouter.post('/donations/:id/resend-receipt', finance, async (req, res) => {
  const d = await loadDonation(String(req.params.id));
  if (d.status !== 'success') throw new HttpError(400, 'Receipts are only sent for successful gifts.');
  await db.update(s.donations).set({ receiptSentAt: null }).where(eq(s.donations.id, d.id));
  await sendDonationEmails(d.id);
  const after = await loadDonation(d.id);
  if (!after.receiptSentAt) throw new HttpError(502, 'The receipt could not be sent. Check the email settings.');
  await logActivity(req.admin, 'resend', 'donation', d.id, `Resent receipt ${d.reference} to ${d.donor.email}`);
  res.json(toDetail(after));
});

adminRouter.get('/donations/:id/receipt.pdf', finance, async (req, res) => {
  const d = await loadDonation(String(req.params.id));
  if (d.status !== 'success' && d.status !== 'reversed') throw new HttpError(400, 'No receipt: this gift was not paid.');
  const settings = await getSiteSettings(db);
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="GTYF-receipt-${d.reference}.pdf"`, 'Cache-Control': 'private, no-store' });
  writeReceiptPdf(res, {
    words: receiptWords(settings, firstName(d.donor.fullName)),
    orgName: settings.organisation.name,
    registrationNumber: settings.organisation.registrationNumber.startsWith('TODO') ? undefined : settings.organisation.registrationNumber,
    siteUrl: env.SITE_URL,
    reference: d.reference,
    donorName: d.donor.fullName,
    firstName: firstName(d.donor.fullName),
    paidAt: d.paidAt ?? d.createdAt,
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

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

adminRouter.get('/dashboard', finance, async (_req, res) => {
  const now = new Date();
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const twelveMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
  const ok = eq(s.donations.status, 'success');
  const paidOn = sql`coalesce(${s.donations.paidAt}, ${s.donations.createdAt})`;

  const [[totals], [year], [month], [subs], byMonthRows, byCauseRows, latest] = await Promise.all([
    db
      .select({
        raised: sql<number>`coalesce(${sum(s.donations.amount)}, 0)::int`,
        fees: sql<number>`coalesce(${sum(s.donations.fee)}, 0)::int`,
        gifts: count(),
        donors: sql<number>`count(distinct ${s.donations.donorId})::int`,
      })
      .from(s.donations)
      .where(ok),
    db.select({ v: sql<number>`coalesce(${sum(s.donations.amount)}, 0)::int` }).from(s.donations).where(and(ok, sql`${paidOn} >= ${yearStart}`)),
    db.select({ v: sql<number>`coalesce(${sum(s.donations.amount)}, 0)::int` }).from(s.donations).where(and(ok, sql`${paidOn} >= ${monthStart}`)),
    db
      .select({ n: count(), total: sql<number>`coalesce(${sum(s.subscriptions.amount)}, 0)::int` })
      .from(s.subscriptions)
      .where(eq(s.subscriptions.status, 'active')),
    db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${paidOn}), 'YYYY-MM')`,
        amount: sql<number>`coalesce(${sum(s.donations.amount)}, 0)::int`,
        gifts: count(),
      })
      .from(s.donations)
      .where(and(ok, sql`${paidOn} >= ${twelveMonthsAgo}`))
      .groupBy(sql`1`)
      .orderBy(sql`1`),
    db
      .select({
        cause: sql<string>`coalesce(${s.programmes.title}, 'Where it''s needed most')`,
        amount: sql<number>`coalesce(${sum(s.donations.amount)}, 0)::int`,
        gifts: count(),
      })
      .from(s.donations)
      .leftJoin(s.programmes, eq(s.donations.programmeId, s.programmes.id))
      .where(ok)
      .groupBy(sql`1`)
      .orderBy(sql`2 desc`),
    baseDonationQuery().where(ok).orderBy(desc(sql`${paidOn}`)).limit(8),
  ]);

  // Fill in empty months so the chart has a steady 12-month axis.
  const found = new Map(byMonthRows.map((r) => [r.month, r]));
  const byMonth = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(twelveMonthsAgo.getUTCFullYear(), twelveMonthsAgo.getUTCMonth() + i, 1));
    const key = d.toISOString().slice(0, 7);
    return { month: key, amount: found.get(key)?.amount ?? 0, gifts: found.get(key)?.gifts ?? 0 };
  });

  const body: DashboardStats = {
    raised: { allTime: totals!.raised, thisYear: year!.v, thisMonth: month!.v },
    feesCovered: totals!.fees,
    successfulGifts: totals!.gifts,
    donors: totals!.donors,
    activeMonthlyDonors: subs!.n,
    monthlyRecurringTotal: subs!.total,
    byMonth,
    byCause: byCauseRows,
    latest: latest.map((r) => toRow(r as SelectedRow)),
  };
  res.set('Cache-Control', 'no-store');
  res.json(body);
});
