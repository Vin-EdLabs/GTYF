/**
 * Admin content API (/api/admin/content/*): photos and every editable part of
 * the public site. Editors and super admins only. Every change is logged.
 */
import { Router } from 'express';
import multer from 'multer';
import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';
import { and, asc, desc, eq, ilike, inArray, ne, or, sql } from 'drizzle-orm';
import {
  coreValuesSchema,
  eventSchema,
  heroSlideSchema,
  homeSectionSchema,
  impactItemSchema,
  impactStatsSchema,
  mediaUpdateSchema,
  newsSchema,
  programmeSchema,
  reorderSchema,
  slugify,
  teamMemberSchema,
  type AdminMedia,
} from '@gtyf/shared/admin-content';
import { defaultSiteSettings, type SiteSettingsKey } from '@gtyf/shared/content';
import { db } from '../db/client';
import * as s from '../db/schema';
import { logActivity, requireAdmin, type AdminRow } from '../lib/auth';
import { HttpError, parseBody } from '../lib/http';
import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES, deleteFiles, processUpload, refreshOgImage } from '../lib/media';
import { ensureHomeSections, getSiteSettings } from '../lib/settings';
import { DEMO_TAG } from '../db/demoPhotos';
import { removeDemoPhotos, seedDemoPhotos } from '../db/seedDemoPhotos';

export const adminContentRouter = Router();
adminContentRouter.use(requireAdmin('editor'));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, ACCEPTED_TYPES.includes(file.mimetype)),
});

const HIDE_TAG = 'hide-from-gallery';
const param = (v: unknown) => String(v);

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

type MediaRow = typeof s.media.$inferSelect;
const fileUrl = (p: string) => `/uploads/${p}`;

function toAdminMedia(m: MediaRow): AdminMedia {
  const webp = m.variants.filter((v) => v.format === 'webp').sort((a, b) => a.width - b.width);
  const hiddenReason = !m.altText.trim()
    ? 'Add a description so it can be shown'
    : m.showsChildren && !m.consentConfirmed
      ? 'Waiting for consent confirmation'
      : null;
  return {
    id: m.id,
    src: fileUrl((webp.at(-1) ?? m.variants[0]!).path),
    thumb: fileUrl((webp[0] ?? m.variants[0]!).path),
    width: m.width,
    height: m.height,
    altText: m.altText,
    caption: m.caption,
    focalX: m.focalX,
    focalY: m.focalY,
    showsChildren: m.showsChildren,
    consentConfirmed: m.consentConfirmed,
    programmeId: m.programmeId,
    eventId: m.eventId,
    year: m.year,
    hideFromGallery: m.tags.includes(HIDE_TAG),
    isDemo: m.tags.includes(DEMO_TAG),
    hiddenReason,
    originalFilename: m.originalFilename,
    createdAt: m.createdAt.toISOString(),
  };
}

adminContentRouter.get('/media', async (req, res) => {
  const where = [];
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q) where.push(or(ilike(s.media.altText, `%${q}%`), ilike(s.media.caption, `%${q}%`), ilike(s.media.originalFilename, `%${q}%`))!);
  if (typeof req.query.programmeId === 'string' && req.query.programmeId) where.push(eq(s.media.programmeId, req.query.programmeId));
  if (typeof req.query.eventId === 'string' && req.query.eventId) where.push(eq(s.media.eventId, req.query.eventId));
  if (typeof req.query.year === 'string' && /^\d{4}$/.test(req.query.year)) where.push(eq(s.media.year, Number(req.query.year)));
  if (req.query.attention === '1') where.push(or(eq(s.media.altText, ''), and(eq(s.media.showsChildren, true), eq(s.media.consentConfirmed, false)))!);
  const rows = await db
    .select()
    .from(s.media)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(s.media.createdAt))
    .limit(500);
  res.set('Cache-Control', 'no-store');
  res.json(rows.map(toAdminMedia));
});

adminContentRouter.post('/media', upload.single('file'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Please choose a JPEG, PNG, WebP or HEIC photo (up to 20 MB).');
  let processed;
  try {
    processed = await processUpload(req.file.buffer);
  } catch (err) {
    throw new HttpError(400, err instanceof Error && err.message.startsWith('This photo') ? err.message : 'We couldn’t read that photo. Try another file.');
  }
  const b = req.body as Record<string, string | undefined>;
  const [row] = await db
    .insert(s.media)
    .values({
      ...processed,
      originalFilename: req.file.originalname.slice(0, 200),
      mimeType: req.file.mimetype,
      altText: (b.altText ?? '').trim().slice(0, 300) || 'Guide The Youth Foundation photo',
      showsChildren: b.showsChildren === 'true',
      consentConfirmed: b.showsChildren === 'true' && b.consentConfirmed === 'true',
      consentConfirmedBy: b.showsChildren === 'true' && b.consentConfirmed === 'true' ? req.admin!.id : null,
      consentConfirmedAt: b.showsChildren === 'true' && b.consentConfirmed === 'true' ? new Date() : null,
      programmeId: b.programmeId || null,
      eventId: b.eventId || null,
      year: b.year && /^\d{4}$/.test(b.year) ? Number(b.year) : new Date().getUTCFullYear(),
      uploadedBy: req.admin!.id,
    })
    .returning();
  await logActivity(req.admin, 'upload', 'media', row!.id, `Uploaded photo ${req.file.originalname}`);
  res.status(201).json(toAdminMedia(row!));
});

// Demo photos: registered before /media/:id so "demo" isn't read as a photo id.
adminContentRouter.post('/media/demo', async (req, res) => {
  const result = await seedDemoPhotos(db, () => undefined);
  await logActivity(req.admin, 'create', 'media', null, `Added demo photos (${result.loaded} new, ${result.placed} empty spots filled)`);
  res.json(result);
});

adminContentRouter.delete('/media/demo', async (req, res) => {
  const removed = await removeDemoPhotos(db);
  await logActivity(req.admin, 'delete', 'media', null, `Removed all demo photos (${removed})`);
  res.json({ removed });
});

adminContentRouter.patch('/media/:id', async (req, res) => {
  const input = parseBody(mediaUpdateSchema, req.body);
  const [m] = await db.select().from(s.media).where(eq(s.media.id, param(req.params.id)));
  if (!m) throw new HttpError(404, 'Photo not found');
  const { hideFromGallery, consentConfirmed, ...rest } = input;
  const showsChildren = rest.showsChildren ?? m.showsChildren;
  const confirm = showsChildren ? (consentConfirmed ?? m.consentConfirmed) : false;
  const tags = hideFromGallery === undefined ? m.tags : hideFromGallery ? [...new Set([...m.tags, HIDE_TAG])] : m.tags.filter((t) => t !== HIDE_TAG);
  const [updated] = await db
    .update(s.media)
    .set({
      ...rest,
      tags,
      consentConfirmed: confirm,
      consentConfirmedBy: confirm && !m.consentConfirmed ? req.admin!.id : confirm ? m.consentConfirmedBy : null,
      consentConfirmedAt: confirm && !m.consentConfirmed ? new Date() : confirm ? m.consentConfirmedAt : null,
    })
    .where(eq(s.media.id, m.id))
    .returning();
  if ((input.focalX !== undefined && input.focalX !== m.focalX) || (input.focalY !== undefined && input.focalY !== m.focalY)) {
    await refreshOgImage(m.storageKey, m.variants, updated!.focalX, updated!.focalY).catch((e) => console.error('[media] og refresh', e));
  }
  if (confirm && !m.consentConfirmed) await logActivity(req.admin, 'consent', 'media', m.id, `Confirmed consent for photo ${m.originalFilename}`);
  else await logActivity(req.admin, 'update', 'media', m.id, `Edited photo ${m.originalFilename}`);
  res.json(toAdminMedia(updated!));
});

adminContentRouter.delete('/media/:id', async (req, res) => {
  const [m] = await db.delete(s.media).where(eq(s.media.id, param(req.params.id))).returning();
  if (!m) throw new HttpError(404, 'Photo not found');
  // The photo is gone from the site either way; a leftover file is only logged.
  await deleteFiles(m.storageKey).catch((e) => console.error('[media] could not remove files', m.storageKey, e));
  await logActivity(req.admin, 'delete', 'media', m.id, `Deleted photo ${m.originalFilename}`);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Hero slides + home sections
// ---------------------------------------------------------------------------

adminContentRouter.get('/hero-slides', async (_req, res) => {
  res.json(await db.select().from(s.heroSlides).orderBy(asc(s.heroSlides.sortOrder)));
});

adminContentRouter.post('/hero-slides', async (req, res) => {
  const input = parseBody(heroSlideSchema, req.body);
  const [{ max }] = (await db.select({ max: sql<number>`coalesce(max(${s.heroSlides.sortOrder}), -1)::int` }).from(s.heroSlides)) as [{ max: number }];
  const [row] = await db.insert(s.heroSlides).values({ ...input, sortOrder: max + 1 }).returning();
  await logActivity(req.admin, 'create', 'hero_slide', row!.id, `Added home slide “${row!.headline}”`);
  res.status(201).json(row);
});

adminContentRouter.patch('/hero-slides/:id', async (req, res) => {
  const input = parseBody(heroSlideSchema, req.body);
  const [row] = await db.update(s.heroSlides).set(input).where(eq(s.heroSlides.id, param(req.params.id))).returning();
  if (!row) throw new HttpError(404, 'Slide not found');
  await logActivity(req.admin, 'update', 'hero_slide', row.id, `Edited home slide “${row.headline}”`);
  res.json(row);
});

adminContentRouter.delete('/hero-slides/:id', async (req, res) => {
  const [row] = await db.delete(s.heroSlides).where(eq(s.heroSlides.id, param(req.params.id))).returning();
  if (!row) throw new HttpError(404, 'Slide not found');
  await logActivity(req.admin, 'delete', 'hero_slide', row.id, `Deleted home slide “${row.headline}”`);
  res.json({ ok: true });
});

async function reorder(table: typeof s.heroSlides | typeof s.teamMembers, ids: string[]) {
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries()) await tx.update(table).set({ sortOrder: i }).where(eq(table.id, id));
  });
}

adminContentRouter.post('/hero-slides/reorder', async (req, res) => {
  const { ids } = parseBody(reorderSchema, req.body);
  await reorder(s.heroSlides, ids);
  await logActivity(req.admin, 'reorder', 'hero_slide', null, 'Reordered home slides');
  res.json({ ok: true });
});

adminContentRouter.get('/home-sections', async (_req, res) => {
  res.json(await ensureHomeSections(db));
});

adminContentRouter.patch('/home-sections/:key', async (req, res) => {
  const input = parseBody(homeSectionSchema, req.body);
  const [row] = await db.update(s.homeSections).set(input).where(eq(s.homeSections.key, param(req.params.key))).returning();
  if (!row) throw new HttpError(404, 'Section not found');
  await logActivity(req.admin, 'update', 'home_section', row.key, `Edited the “${row.key}” section of the home page`);
  res.json(row);
});

adminContentRouter.post('/home-sections/reorder', async (req, res) => {
  const { ids } = parseBody(reorderSchema, req.body);
  await db.transaction(async (tx) => {
    for (const [i, key] of ids.entries()) await tx.update(s.homeSections).set({ sortOrder: i }).where(eq(s.homeSections.key, key));
  });
  await logActivity(req.admin, 'reorder', 'home_section', null, 'Reordered the home page sections');
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Programmes
// ---------------------------------------------------------------------------

adminContentRouter.get('/programmes', async (_req, res) => {
  res.json(await db.select().from(s.programmes).orderBy(asc(s.programmes.sortOrder)));
});

adminContentRouter.get('/programmes/:id', async (req, res) => {
  const p = await db.query.programmes.findFirst({
    where: eq(s.programmes.id, param(req.params.id)),
    with: { sections: { orderBy: (x, { asc }) => [asc(x.sortOrder)] } },
  });
  if (!p) throw new HttpError(404, 'Programme not found');
  res.json(p);
});

adminContentRouter.patch('/programmes/:id', async (req, res) => {
  const { sections, ...input } = parseBody(programmeSchema, req.body);
  const id = param(req.params.id);
  const row = await db.transaction(async (tx) => {
    const [p] = await tx.update(s.programmes).set(input).where(eq(s.programmes.id, id)).returning();
    if (!p) throw new HttpError(404, 'Programme not found');
    await tx.delete(s.programmeSections).where(eq(s.programmeSections.programmeId, id));
    if (sections.length) await tx.insert(s.programmeSections).values(sections.map((x, i) => ({ ...x, programmeId: id, sortOrder: i })));
    return p;
  });
  await logActivity(req.admin, 'update', 'programme', id, `Edited programme “${row.title}”`);
  res.json(row);
});

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

async function uniqueSlug(table: typeof s.events | typeof s.newsPosts, wanted: string, exceptId?: string) {
  let candidate = wanted;
  for (let n = 2; ; n++) {
    const [clash] = await db
      .select({ id: table.id })
      .from(table)
      .where(exceptId ? and(eq(table.slug, candidate), ne(table.id, exceptId)) : eq(table.slug, candidate));
    if (!clash) return candidate;
    candidate = `${wanted}-${n}`;
  }
}

adminContentRouter.get('/events', async (_req, res) => {
  const rows = await db
    .select({ id: s.events.id, slug: s.events.slug, title: s.events.title, dateStart: s.events.dateStart, dateEnd: s.events.dateEnd, venue: s.events.venue, status: s.events.status, heroImageId: s.events.heroImageId, programmeTitle: s.programmes.shortTitle })
    .from(s.events)
    .leftJoin(s.programmes, eq(s.events.programmeId, s.programmes.id))
    .orderBy(desc(s.events.dateStart));
  res.set('Cache-Control', 'no-store');
  res.json(rows);
});

adminContentRouter.get('/events/:id', async (req, res) => {
  const e = await db.query.events.findFirst({
    where: eq(s.events.id, param(req.params.id)),
    with: { highlights: { orderBy: (h, { asc }) => [asc(h.sortOrder)] } },
  });
  if (!e) throw new HttpError(404, 'Event not found');
  const { highlights, ...rest } = e;
  res.json({
    ...rest,
    startTime: rest.startTime?.slice(0, 5) ?? null,
    highlights: highlights.filter((h) => h.kind === 'highlight').map((h) => h.text),
    schoolsVisited: highlights.filter((h) => h.kind === 'school_visited').map((h) => h.text),
  });
});

async function saveEvent(id: string | null, body: unknown, admin: AdminRow | undefined) {
  const { highlights, schoolsVisited, slug, ...input } = parseBody(eventSchema, body);
  const wanted = slug || slugify(`${input.title}-${input.dateStart.slice(0, 4)}`);
  const finalSlug = await uniqueSlug(s.events, wanted, id ?? undefined);
  const row = await db.transaction(async (tx) => {
    const [e] = id
      ? await tx.update(s.events).set({ ...input, slug: finalSlug }).where(eq(s.events.id, id)).returning()
      : await tx.insert(s.events).values({ ...input, slug: finalSlug }).returning();
    if (!e) throw new HttpError(404, 'Event not found');
    await tx.delete(s.eventHighlights).where(eq(s.eventHighlights.eventId, e.id));
    const items = [
      ...highlights.map((text, i) => ({ eventId: e.id, kind: 'highlight' as const, text, sortOrder: i })),
      ...schoolsVisited.map((text, i) => ({ eventId: e.id, kind: 'school_visited' as const, text, sortOrder: i })),
    ];
    if (items.length) await tx.insert(s.eventHighlights).values(items);
    return e;
  });
  await logActivity(admin, id ? 'update' : 'create', 'event', row.id, `${id ? 'Edited' : 'Created'} event “${row.title}” (${row.status})`);
  return row;
}

adminContentRouter.post('/events', async (req, res) => {
  res.status(201).json(await saveEvent(null, req.body, req.admin));
});
adminContentRouter.patch('/events/:id', async (req, res) => {
  res.json(await saveEvent(param(req.params.id), req.body, req.admin));
});
adminContentRouter.delete('/events/:id', async (req, res) => {
  const [e] = await db.delete(s.events).where(eq(s.events.id, param(req.params.id))).returning();
  if (!e) throw new HttpError(404, 'Event not found');
  await logActivity(req.admin, 'delete', 'event', e.id, `Deleted event “${e.title}”`);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// News
// ---------------------------------------------------------------------------

/** Only safe formatting survives; images must come from our own uploads. */
const cleanHtml = (html: string) =>
  sanitizeHtml(html, {
    allowedTags: ['p', 'h2', 'h3', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'blockquote', 'img', 'br', 'hr'],
    allowedAttributes: { a: ['href', 'target', 'rel'], img: ['src', 'alt'] },
    allowedSchemes: ['https', 'http', 'mailto', 'tel'],
    allowedSchemesAppliedToAttributes: ['href'],
    exclusiveFilter: (frame) => frame.tag === 'img' && !String(frame.attribs.src ?? '').startsWith('/uploads/'),
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: /^https?:/.test(attribs.href ?? '') ? { ...attribs, target: '_blank', rel: 'noopener noreferrer' } : attribs,
      }),
    },
  });

adminContentRouter.get('/news', async (_req, res) => {
  const rows = await db
    .select({ id: s.newsPosts.id, slug: s.newsPosts.slug, title: s.newsPosts.title, status: s.newsPosts.status, publishedAt: s.newsPosts.publishedAt, updatedAt: s.newsPosts.updatedAt, coverImageId: s.newsPosts.coverImageId })
    .from(s.newsPosts)
    .orderBy(desc(s.newsPosts.updatedAt));
  res.set('Cache-Control', 'no-store');
  res.json(rows);
});

adminContentRouter.get('/news/:id', async (req, res) => {
  const [n] = await db.select().from(s.newsPosts).where(eq(s.newsPosts.id, param(req.params.id)));
  if (!n) throw new HttpError(404, 'Story not found');
  res.json(n);
});

async function saveNews(id: string | null, body: unknown, admin: AdminRow | undefined) {
  const { slug, bodyHtml, publishedAt, ...input } = parseBody(newsSchema, body);
  const finalSlug = await uniqueSlug(s.newsPosts, slug || slugify(input.title), id ?? undefined);
  const [existing] = id ? await db.select().from(s.newsPosts).where(eq(s.newsPosts.id, id)) : [];
  if (id && !existing) throw new HttpError(404, 'Story not found');
  // First publish stamps the date; it can also be set by hand.
  const when = publishedAt ? new Date(publishedAt) : input.status === 'published' ? (existing?.publishedAt ?? new Date()) : (existing?.publishedAt ?? null);
  const values = { ...input, slug: finalSlug, bodyHtml: cleanHtml(bodyHtml), publishedAt: when };
  const [row] = id
    ? await db.update(s.newsPosts).set(values).where(eq(s.newsPosts.id, id)).returning()
    : await db.insert(s.newsPosts).values({ ...values, authorId: admin?.id ?? null }).returning();
  await logActivity(admin, id ? 'update' : 'create', 'news', row!.id, `${id ? 'Edited' : 'Wrote'} story “${row!.title}” (${row!.status})`);
  return row!;
}

adminContentRouter.post('/news', async (req, res) => {
  res.status(201).json(await saveNews(null, req.body, req.admin));
});
adminContentRouter.patch('/news/:id', async (req, res) => {
  res.json(await saveNews(param(req.params.id), req.body, req.admin));
});
adminContentRouter.delete('/news/:id', async (req, res) => {
  const [n] = await db.delete(s.newsPosts).where(eq(s.newsPosts.id, param(req.params.id))).returning();
  if (!n) throw new HttpError(404, 'Story not found');
  await logActivity(req.admin, 'delete', 'news', n.id, `Deleted story “${n.title}”`);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

adminContentRouter.get('/team', async (_req, res) => {
  // Leaders first, exactly as on the website.
  res.json(await db.select().from(s.teamMembers).orderBy(desc(s.teamMembers.isLeader), asc(s.teamMembers.sortOrder)));
});
adminContentRouter.post('/team', async (req, res) => {
  const input = parseBody(teamMemberSchema, req.body);
  const [{ max }] = (await db.select({ max: sql<number>`coalesce(max(${s.teamMembers.sortOrder}), -1)::int` }).from(s.teamMembers)) as [{ max: number }];
  const [row] = await db.insert(s.teamMembers).values({ ...input, sortOrder: max + 1 }).returning();
  await logActivity(req.admin, 'create', 'team', row!.id, `Added team member ${row!.name}`);
  res.status(201).json(row);
});
adminContentRouter.patch('/team/:id', async (req, res) => {
  const input = parseBody(teamMemberSchema, req.body);
  const [row] = await db.update(s.teamMembers).set(input).where(eq(s.teamMembers.id, param(req.params.id))).returning();
  if (!row) throw new HttpError(404, 'Team member not found');
  await logActivity(req.admin, 'update', 'team', row.id, `Edited team member ${row.name}`);
  res.json(row);
});
adminContentRouter.delete('/team/:id', async (req, res) => {
  const [row] = await db.delete(s.teamMembers).where(eq(s.teamMembers.id, param(req.params.id))).returning();
  if (!row) throw new HttpError(404, 'Team member not found');
  await logActivity(req.admin, 'delete', 'team', row.id, `Removed team member ${row.name}`);
  res.json({ ok: true });
});
adminContentRouter.post('/team/reorder', async (req, res) => {
  const { ids } = parseBody(reorderSchema, req.body);
  await reorder(s.teamMembers, ids);
  await logActivity(req.admin, 'reorder', 'team', null, 'Reordered the team');
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Values, impact numbers, impact prices
// ---------------------------------------------------------------------------

adminContentRouter.get('/core-values', async (_req, res) => {
  res.json(await db.select().from(s.coreValues).orderBy(asc(s.coreValues.sortOrder)));
});
adminContentRouter.put('/core-values', async (req, res) => {
  const { values } = parseBody(coreValuesSchema, req.body);
  await db.transaction(async (tx) => {
    await tx.delete(s.coreValues);
    await tx.insert(s.coreValues).values(values.map((v, i) => ({ ...v, sortOrder: i })));
  });
  await logActivity(req.admin, 'update', 'core_values', null, 'Edited the core values');
  res.json(await db.select().from(s.coreValues).orderBy(asc(s.coreValues.sortOrder)));
});

adminContentRouter.get('/impact-stats', async (_req, res) => {
  res.json(await db.select().from(s.impactStats).orderBy(asc(s.impactStats.sortOrder)));
});
adminContentRouter.put('/impact-stats', async (req, res) => {
  const { stats } = parseBody(impactStatsSchema, req.body);
  await db.transaction(async (tx) => {
    await tx.delete(s.impactStats);
    if (stats.length) await tx.insert(s.impactStats).values(stats.map((x, i) => ({ ...x, sortOrder: i })));
  });
  await logActivity(req.admin, 'update', 'impact_stats', null, 'Edited the impact numbers');
  res.json(await db.select().from(s.impactStats).orderBy(asc(s.impactStats.sortOrder)));
});

adminContentRouter.get('/impact-items', async (_req, res) => {
  res.json(await db.select().from(s.impactItems).orderBy(asc(s.impactItems.sortOrder)));
});
adminContentRouter.patch('/impact-items/:id', async (req, res) => {
  const input = parseBody(impactItemSchema, req.body);
  const [row] = await db.update(s.impactItems).set(input).where(eq(s.impactItems.id, param(req.params.id))).returning();
  if (!row) throw new HttpError(404, 'Item not found');
  await logActivity(req.admin, 'update', 'impact_item', row.id, `Set “${row.label}” to GH₵ ${(row.unitPrice / 100).toFixed(2)}`);
  res.json(row);
});

// ---------------------------------------------------------------------------
// Site settings (contact, socials, bank, footer, page texts…)
// ---------------------------------------------------------------------------

/**
 * Settings are validated against the shape of the defaults: only known keys,
 * same types, sensible lengths. Anything unexpected is dropped.
 */
function conform(template: unknown, value: unknown, path: string): unknown {
  if (Array.isArray(template)) {
    if (!Array.isArray(value)) throw new HttpError(400, `${path} should be a list.`);
    const itemTemplate = template[0];
    return value.slice(0, 30).map((v, i) => conform(itemTemplate, v, `${path}[${i}]`));
  }
  if (template !== null && typeof template === 'object') {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, `${path} is not valid.`);
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(template)) {
      if (key in (value as object)) out[key] = conform((template as Record<string, unknown>)[key], (value as Record<string, unknown>)[key], `${path}.${key}`);
    }
    return out;
  }
  if (typeof template === 'number') {
    const n = Number(value);
    if (!Number.isFinite(n)) throw new HttpError(400, `${path} should be a number.`);
    return n;
  }
  if (template === null) return value === null || value === '' ? null : String(value).slice(0, 100);
  if (typeof value !== 'string') throw new HttpError(400, `${path} should be text.`);
  return value.trim().slice(0, 8000);
}

adminContentRouter.get('/settings', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await getSiteSettings(db));
});

adminContentRouter.put('/settings/:key', async (req, res) => {
  const key = param(req.params.key) as SiteSettingsKey;
  if (!(key in defaultSiteSettings)) throw new HttpError(404, 'Unknown settings group');
  const current = (await getSiteSettings(db))[key];
  const value = { ...(current as object), ...(conform(defaultSiteSettings[key], req.body, key) as object) };
  await db.insert(s.siteSettings).values({ key, value, updatedBy: req.admin!.id }).onConflictDoUpdate({ target: s.siteSettings.key, set: { value, updatedBy: req.admin!.id } });
  await logActivity(req.admin, 'update', 'settings', key, `Edited site settings: ${key}`);
  res.json(value);
});

/** Programmes + events for pickers (tagging photos, linking slides). */
adminContentRouter.get('/options', async (_req, res) => {
  const [programmes, events] = await Promise.all([
    db.select({ id: s.programmes.id, title: s.programmes.shortTitle, slug: s.programmes.slug }).from(s.programmes).orderBy(asc(s.programmes.sortOrder)),
    db.select({ id: s.events.id, title: s.events.title, dateStart: s.events.dateStart }).from(s.events).orderBy(desc(s.events.dateStart)),
  ]);
  res.json({ programmes, events });
});

// ---------------------------------------------------------------------------
// Website photos: every photo spot on the site in one place
// ---------------------------------------------------------------------------

interface Slot {
  key: string;
  label: string;
  sublabel?: string;
  mediaId: string | null;
  /** Shape the photo is shown in on the site, for the preview box. */
  aspect: 'wide' | 'landscape' | 'portrait' | 'square';
  editHref?: string;
}

adminContentRouter.get('/photo-slots', async (_req, res) => {
  const [slides, programmes, sections, events, team, settings] = await Promise.all([
    db.select().from(s.heroSlides).orderBy(asc(s.heroSlides.sortOrder)),
    db.select().from(s.programmes).orderBy(asc(s.programmes.sortOrder)),
    db.select().from(s.programmeSections).orderBy(asc(s.programmeSections.sortOrder)),
    db.select().from(s.events).orderBy(desc(s.events.dateStart)),
    db.select().from(s.teamMembers).orderBy(asc(s.teamMembers.sortOrder)),
    getSiteSettings(db),
  ]);
  const groups: { title: string; help: string; slots: Slot[] }[] = [
    {
      title: 'Home page slides',
      help: 'The big photos at the very top of the home page. Wide, bright photos work best.',
      slots: slides.map((x, i) => ({ key: `slide:${x.id}`, label: `Slide ${i + 1}`, sublabel: x.headline, mediaId: x.imageId, aspect: 'wide', editHref: '/admin/content/slides' })),
    },
    {
      title: 'Programmes',
      help: 'The cover photo of each programme, used on the home page, the Programmes page and its own page.',
      slots: programmes.map((p) => ({ key: `programme:${p.id}`, label: p.shortTitle, sublabel: 'Cover photo', mediaId: p.heroImageId, aspect: 'landscape', editHref: `/admin/content/programmes/${p.id}` })),
    },
    {
      title: '“How it works” photos',
      help: 'Shown beside each part of a programme’s “How it works” section.',
      slots: sections.map((x) => ({
        key: `section:${x.id}`,
        label: programmes.find((p) => p.id === x.programmeId)?.shortTitle ?? 'Programme',
        sublabel: x.heading,
        mediaId: x.imageId,
        aspect: 'landscape',
        editHref: `/admin/content/programmes/${x.programmeId}`,
      })),
    },
    {
      title: 'About page',
      help: 'The photo beside “Where we work” and “Our story”.',
      slots: [{ key: 'setting:about.photoId', label: 'About page photo', mediaId: settings.about.photoId, aspect: 'portrait' }],
    },
    {
      title: 'Events',
      help: 'The cover photo of each event, shown on its page, on event cards and in the timeline.',
      slots: events.map((e) => ({ key: `event:${e.id}`, label: e.title, sublabel: e.dateStart, mediaId: e.heroImageId, aspect: 'landscape', editHref: `/admin/content/events/${e.id}` })),
    },
    {
      title: 'Team',
      help: 'Portraits on the Team and About pages.',
      slots: team.map((m) => ({ key: `team:${m.id}`, label: m.name, sublabel: m.role, mediaId: m.photoId, aspect: 'portrait', editHref: '/admin/content/team' })),
    },
    {
      title: 'Sharing',
      help: 'Shown when a page without its own photo is shared on WhatsApp or Facebook.',
      slots: [{ key: 'setting:seo.defaultOgImageId', label: 'Default share image', mediaId: settings.seo.defaultOgImageId, aspect: 'wide' }],
    },
  ];
  res.set('Cache-Control', 'no-store');
  res.json(groups.filter((g) => g.slots.length));
});

const slotSchema = z.object({ key: z.string().min(3).max(120), mediaId: z.uuid().nullable() });

/** Put a photo in (or remove it from) one spot on the site. */
adminContentRouter.put('/photo-slots', async (req, res) => {
  const { key, mediaId } = parseBody(slotSchema, req.body);
  if (mediaId) {
    const [m] = await db.select({ id: s.media.id }).from(s.media).where(eq(s.media.id, mediaId));
    if (!m) throw new HttpError(400, 'That photo no longer exists.');
  }
  const [kind, id] = key.split(':') as [string, string];
  const done = async (n: number) => {
    if (!n) throw new HttpError(404, 'That spot no longer exists.');
  };
  switch (kind) {
    case 'slide':
      await done((await db.update(s.heroSlides).set({ imageId: mediaId }).where(eq(s.heroSlides.id, id)).returning()).length);
      break;
    case 'programme':
      await done((await db.update(s.programmes).set({ heroImageId: mediaId }).where(eq(s.programmes.id, id)).returning()).length);
      break;
    case 'section':
      await done((await db.update(s.programmeSections).set({ imageId: mediaId }).where(eq(s.programmeSections.id, id)).returning()).length);
      break;
    case 'event':
      await done((await db.update(s.events).set({ heroImageId: mediaId }).where(eq(s.events.id, id)).returning()).length);
      break;
    case 'team':
      await done((await db.update(s.teamMembers).set({ photoId: mediaId }).where(eq(s.teamMembers.id, id)).returning()).length);
      break;
    case 'setting': {
      const [group, field] = id.split('.') as ['about' | 'seo', string];
      if (!((group === 'about' && field === 'photoId') || (group === 'seo' && field === 'defaultOgImageId'))) throw new HttpError(400, 'Unknown spot');
      const current = (await getSiteSettings(db))[group];
      const value = { ...current, [field]: mediaId };
      await db.insert(s.siteSettings).values({ key: group, value, updatedBy: req.admin!.id }).onConflictDoUpdate({ target: s.siteSettings.key, set: { value, updatedBy: req.admin!.id } });
      break;
    }
    default:
      throw new HttpError(400, 'Unknown spot');
  }
  await logActivity(req.admin, 'update', 'photo_slot', key, mediaId ? `Changed a website photo (${kind})` : `Removed a website photo (${kind})`);
  res.json({ ok: true });
});

/** Photos by id, for showing thumbnails of chosen images in forms. */
adminContentRouter.post('/media/lookup', async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? (req.body.ids as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 100) : [];
  const rows = ids.length ? await db.select().from(s.media).where(inArray(s.media.id, ids)) : [];
  res.json(rows.map(toAdminMedia));
});
