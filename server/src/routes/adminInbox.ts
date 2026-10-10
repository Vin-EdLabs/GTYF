/**
 * Admin Inbox (/api/admin/inbox/*): everything people send through the site's
 * forms (volunteers, partners, contact messages) plus newsletter sign-ups.
 * Staff mark each item New → In progress → Done (or Archived) and keep notes.
 */
import { Router } from 'express';
import { and, count, desc, eq, isNull, ne } from 'drizzle-orm';
import { z } from 'zod';
import { INBOX_STATUSES } from '@gtyf/shared';
import { db } from '../db/client';
import * as s from '../db/schema';
import { logActivity, requireAdmin } from '../lib/auth';
import { HttpError, parseBody } from '../lib/http';

export const adminInboxRouter = Router();
adminInboxRouter.use(requireAdmin('editor'));

const TABLES = {
  volunteer: s.volunteers,
  partner: s.partnerEnquiries,
  contact: s.contactMessages,
} as const;
type Kind = keyof typeof TABLES;
const kindOf = (v: unknown): Kind => {
  if (v === 'volunteer' || v === 'partner' || v === 'contact') return v;
  throw new HttpError(404, 'Unknown inbox');
};

adminInboxRouter.get('/summary', async (_req, res) => {
  const [[v], [p], [c], [n]] = await Promise.all([
    db.select({ n: count() }).from(s.volunteers).where(eq(s.volunteers.status, 'new')),
    db.select({ n: count() }).from(s.partnerEnquiries).where(eq(s.partnerEnquiries.status, 'new')),
    db.select({ n: count() }).from(s.contactMessages).where(eq(s.contactMessages.status, 'new')),
    db.select({ n: count() }).from(s.newsletterSubscribers).where(isNull(s.newsletterSubscribers.unsubscribedAt)),
  ]);
  res.set('Cache-Control', 'no-store');
  res.json({ volunteer: v!.n, partner: p!.n, contact: c!.n, newTotal: v!.n + p!.n + c!.n, subscribers: n!.n });
});

adminInboxRouter.get('/subscribers', async (_req, res) => {
  const rows = await db.select().from(s.newsletterSubscribers).where(isNull(s.newsletterSubscribers.unsubscribedAt)).orderBy(desc(s.newsletterSubscribers.createdAt));
  res.set('Cache-Control', 'no-store');
  res.json(rows.map((r) => ({ id: r.id, email: r.email, name: r.name, source: r.source, createdAt: r.createdAt.toISOString() })));
});

adminInboxRouter.get('/:kind', async (req, res) => {
  const kind = kindOf(req.params.kind);
  const table = TABLES[kind];
  const status = typeof req.query.status === 'string' ? req.query.status : 'open';
  const where =
    status === 'all' ? undefined : status === 'open' ? ne(table.status, 'archived') : (INBOX_STATUSES as readonly string[]).includes(status) ? eq(table.status, status as (typeof INBOX_STATUSES)[number]) : undefined;
  const rows =
    kind === 'volunteer'
      ? await db
          .select({ item: s.volunteers, eventTitle: s.events.title })
          .from(s.volunteers)
          .leftJoin(s.events, eq(s.volunteers.eventId, s.events.id))
          .where(where)
          .orderBy(desc(s.volunteers.createdAt))
          .limit(500)
          .then((r) => r.map(({ item, eventTitle }) => ({ ...item, eventTitle })))
      : await db.select().from(table).where(where).orderBy(desc(table.createdAt)).limit(500);
  res.set('Cache-Control', 'no-store');
  res.json(rows);
});

const updateSchema = z.object({ status: z.enum(INBOX_STATUSES).optional(), notes: z.string().trim().max(4000).optional() });

adminInboxRouter.patch('/:kind/:id', async (req, res) => {
  const kind = kindOf(req.params.kind);
  const table = TABLES[kind];
  const input = parseBody(updateSchema, req.body);
  const [row] = await db.update(table).set(input).where(and(eq(table.id, String(req.params.id)))).returning();
  if (!row) throw new HttpError(404, 'Not found');
  const who = 'fullName' in row ? row.fullName : 'contactName' in row ? row.contactName : '';
  await logActivity(req.admin, 'update', `inbox_${kind}`, row.id, `${input.status ? `Marked ${kind} from ${who} as ${input.status.replace('_', ' ')}` : `Added a note on ${kind} from ${who}`}`);
  res.json(row);
});

const csvCell = (v: unknown) => {
  const t = v === null || v === undefined ? '' : Array.isArray(v) ? v.join('; ') : v instanceof Date ? v.toISOString().slice(0, 16).replace('T', ' ') : String(v);
  return `"${(/^[=+\-@]/.test(t) ? `'${t}` : t).replace(/"/g, '""')}"`;
};

adminInboxRouter.get('/:kind/export.csv', async (req, res) => {
  const kind = req.params.kind === 'subscribers' ? 'subscribers' : kindOf(req.params.kind);
  const rows: Record<string, unknown>[] =
    kind === 'subscribers'
      ? await db.select({ email: s.newsletterSubscribers.email, name: s.newsletterSubscribers.name, source: s.newsletterSubscribers.source, joined: s.newsletterSubscribers.createdAt }).from(s.newsletterSubscribers).where(isNull(s.newsletterSubscribers.unsubscribedAt))
      : await db.select().from(TABLES[kind]).orderBy(desc(TABLES[kind].createdAt));
  const cols = rows[0] ? Object.keys(rows[0]).filter((c) => c !== 'id' && c !== 'eventId' && c !== 'updatedAt') : ['email'];
  const body = [cols.map(csvCell).join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\r\n');
  await logActivity(req.admin, 'export', 'inbox', null, `Exported ${rows.length} ${kind} to CSV`);
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="gtyf-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`, 'Cache-Control': 'no-store' });
  res.send('﻿' + body);
});
