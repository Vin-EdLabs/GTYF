/**
 * Public, read-only content API. Used by the prerender at build time and by
 * the browser to pick up admin edits without a rebuild. Only published
 * content and safe images (see publicMedia.ts) ever leave this router.
 */
import { Router, type Request, type Response } from 'express';
import { and, asc, desc, eq, inArray, isNotNull, or } from 'drizzle-orm';
import { todayInGhana } from '@gtyf/shared';
import type {
  AboutContent,
  CoreValue,
  EventDetail,
  EventsContent,
  EventSummary,
  GalleryContent,
  HomeContent,
  ImpactItem,
  ImpactStat,
  NewsDetail,
  NewsSummary,
  ProgrammeDetail,
  ProgrammeSummary,
  StaticPaths,
  TeamMember,
} from '@gtyf/shared/api';
import { db } from '../db/client';
import * as s from '../db/schema';
import { HttpError } from '../lib/http';
import { loadAdmin } from '../lib/auth';
import { getSiteSettings } from '../lib/settings';
import { publicImages, toPublicImage } from '../lib/publicMedia';

export const contentRouter = Router();

// Browsers revalidate every time (cheap 304s via ETag) so admin edits show at once;
// a CDN may hold responses for up to a minute.
/** Signed-in admins can preview drafts with ?preview=1 (never cached). */
async function isPreview(req: Request) {
  return req.query.preview === '1' && (await loadAdmin(req)) !== null;
}

const cache = (res: Response) => res.set('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');

// ---------------------------------------------------------------------------
// Loaders + mappers
// ---------------------------------------------------------------------------

const programmeRef = { columns: { slug: true, shortTitle: true } } as const;

async function loadEvents(where?: ReturnType<typeof eq>, includeDrafts = false) {
  const published = includeDrafts ? undefined : eq(s.events.status, 'published');
  return db.query.events.findMany({
    where: where && published ? and(published, where) : (where ?? published),
    with: {
      programme: programmeRef,
      heroImage: true,
      highlights: { orderBy: (h, { asc }) => [asc(h.kind), asc(h.sortOrder)] },
    },
    orderBy: (e, { asc }) => [asc(e.dateStart)],
  });
}
type EventRow = Awaited<ReturnType<typeof loadEvents>>[number];

const firstSentence = (text: string) => {
  const m = text.match(/^.+?[.!?](\s|$)/);
  return (m ? m[0] : text).trim();
};

function toEventSummary(e: EventRow, today = todayInGhana()): EventSummary {
  const firstHighlight = e.highlights.find((h) => h.kind === 'highlight')?.text;
  return {
    slug: e.slug,
    title: e.title,
    dateStart: e.dateStart,
    dateEnd: e.dateEnd,
    startTime: e.startTime,
    venue: e.venue,
    participants: e.participants,
    teaser: e.summary ?? (e.story ? firstSentence(e.story) : (firstHighlight ?? '')),
    heroImage: toPublicImage(e.heroImage),
    programme: e.programme,
    isUpcoming: (e.dateEnd ?? e.dateStart) >= today,
  };
}

async function loadProgrammes() {
  const rows = await db.query.programmes.findMany({
    where: eq(s.programmes.status, 'published'),
    with: { heroImage: true },
    orderBy: (p, { asc }) => [asc(p.sortOrder)],
  });
  return rows.map(
    (p): ProgrammeSummary => ({
      slug: p.slug,
      title: p.title,
      shortTitle: p.shortTitle,
      summary: p.summary,
      heroImage: toPublicImage(p.heroImage),
    }),
  );
}

async function loadImpactStats(): Promise<ImpactStat[]> {
  const rows = await db
    .select()
    .from(s.impactStats)
    .where(eq(s.impactStats.isVisible, true))
    .orderBy(asc(s.impactStats.sortOrder));
  return rows.map(({ key, value, prefix, suffix, label, isYear }) => ({ key, value, prefix, suffix, label, isYear }));
}

async function loadImpactItems(programmeId?: string): Promise<ImpactItem[]> {
  const rows = await db.query.impactItems.findMany({
    where: programmeId
      ? and(eq(s.impactItems.isActive, true), eq(s.impactItems.programmeId, programmeId))
      : eq(s.impactItems.isActive, true),
    with: { programme: { columns: { slug: true } } },
    orderBy: (i, { asc }) => [asc(i.sortOrder)],
  });
  return rows.map((i) => ({
    key: i.key,
    programmeSlug: i.programme?.slug ?? null,
    label: i.label,
    singular: i.singular,
    plural: i.plural,
    unitPrice: i.unitPrice,
    icon: i.icon,
  }));
}

async function loadCoreValues(): Promise<CoreValue[]> {
  const rows = await db.select().from(s.coreValues).orderBy(asc(s.coreValues.sortOrder));
  return rows.map(({ name, description, descriptionIsDraft }) => ({ name, description, descriptionIsDraft }));
}

async function loadTeam(): Promise<TeamMember[]> {
  const rows = await db.query.teamMembers.findMany({
    where: eq(s.teamMembers.isVisible, true),
    with: { photo: true },
    // Leaders first, then the order set in the admin.
    orderBy: (t, { asc, desc }) => [desc(t.isLeader), asc(t.sortOrder)],
  });
  return rows.map((t) => ({ id: t.id, name: t.name, role: t.role, bio: t.bio, photo: toPublicImage(t.photo), isLeader: t.isLeader, email: t.email, linkedin: t.linkedin, instagram: t.instagram, tiktok: t.tiktok }));
}

async function loadNews(limit?: number): Promise<NewsSummary[]> {
  const rows = await db.query.newsPosts.findMany({
    where: and(eq(s.newsPosts.status, 'published'), isNotNull(s.newsPosts.publishedAt)),
    with: { coverImage: true, programme: programmeRef },
    orderBy: (n, { desc }) => [desc(n.publishedAt)],
    limit,
  });
  return rows.map((n) => ({
    slug: n.slug,
    title: n.title,
    excerpt: n.excerpt,
    publishedAt: n.publishedAt!.toISOString(),
    coverImage: toPublicImage(n.coverImage),
    programme: n.programme,
  }));
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

contentRouter.get('/home', async (_req, res) => {
  const [slides, impactStats, programmes, events, coreValues, latestNews, impactItems] = await Promise.all([
    db.query.heroSlides.findMany({
      where: eq(s.heroSlides.isActive, true),
      with: { image: true, programme: { columns: { slug: true } } },
      orderBy: (h, { asc }) => [asc(h.sortOrder)],
    }),
    loadImpactStats(),
    loadProgrammes(),
    loadEvents(),
    loadCoreValues(),
    loadNews(3),
    loadImpactItems(),
  ]);
  const summaries = events.map((e) => toEventSummary(e));
  const body: HomeContent = {
    heroSlides: slides.map((h) => ({
      id: h.id,
      eyebrow: h.eyebrow,
      headline: h.headline,
      underlineWord: h.underlineWord,
      subtext: h.subtext,
      image: toPublicImage(h.image),
      programmeSlug: h.programme?.slug ?? null,
      primaryLabel: h.primaryLabel,
      primaryHref: h.primaryHref,
      secondaryLabel: h.secondaryLabel,
      secondaryHref: h.secondaryHref,
    })),
    impactStats,
    programmes,
    upcomingEvent: summaries.find((e) => e.isUpcoming) ?? null,
    journey: summaries.filter((e) => !e.isUpcoming),
    coreValues,
    latestNews,
    impactItems,
  };
  cache(res).json(body);
});

contentRouter.get('/about', async (_req, res) => {
  const [coreValues, impactStats, team, programmes, settings] = await Promise.all([
    loadCoreValues(),
    loadImpactStats(),
    loadTeam(),
    loadProgrammes(),
    getSiteSettings(db),
  ]);
  const photoId = settings.about.photoId;
  const [photoRow] = photoId ? await db.select().from(s.media).where(eq(s.media.id, photoId)) : [];
  const body: AboutContent = { coreValues, impactStats, team, programmes, photo: toPublicImage(photoRow) };
  cache(res).json(body);
});

contentRouter.get('/programmes', async (_req, res) => {
  cache(res).json(await loadProgrammes());
});

contentRouter.get('/programmes/:slug', async (req, res) => {
  const p = await db.query.programmes.findFirst({
    where: and(eq(s.programmes.slug, req.params.slug), eq(s.programmes.status, 'published')),
    with: {
      heroImage: true,
      sections: { with: { image: true }, orderBy: (x, { asc }) => [asc(x.sortOrder)] },
    },
  });
  if (!p) throw new HttpError(404, 'Programme not found');

  const events = await loadEvents(eq(s.events.programmeId, p.id));
  const eventIds = events.map((e) => e.id);
  const [galleryRows, impactItems] = await Promise.all([
    db
      .select()
      .from(s.media)
      .where(
        eventIds.length
          ? or(eq(s.media.programmeId, p.id), inArray(s.media.eventId, eventIds))
          : eq(s.media.programmeId, p.id),
      )
      .orderBy(asc(s.media.sortOrder), desc(s.media.createdAt))
      .limit(24),
    loadImpactItems(p.id),
  ]);

  const body: ProgrammeDetail = {
    slug: p.slug,
    title: p.title,
    shortTitle: p.shortTitle,
    summary: p.summary,
    body: p.body,
    heroImage: toPublicImage(p.heroImage),
    sections: p.sections.map((x) => ({ heading: x.heading, body: x.body, image: toPublicImage(x.image) })),
    // Most recent first on a programme page.
    events: events.map((e) => toEventSummary(e)).reverse(),
    gallery: publicImages(galleryRows),
    impactItems,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
  };
  cache(res).json(body);
});

contentRouter.get('/events', async (_req, res) => {
  const all = (await loadEvents()).map((e) => toEventSummary(e));
  const body: EventsContent = {
    upcoming: all.filter((e) => e.isUpcoming),
    past: all.filter((e) => !e.isUpcoming).reverse(),
  };
  cache(res).json(body);
});

contentRouter.get('/events/:slug', async (req, res) => {
  const preview = await isPreview(req);
  const [e] = await loadEvents(eq(s.events.slug, req.params.slug), preview);
  if (preview) res.set('Cache-Control', 'no-store');
  if (!e) throw new HttpError(404, 'Event not found');
  const gallery = await db
    .select()
    .from(s.media)
    .where(eq(s.media.eventId, e.id))
    .orderBy(asc(s.media.sortOrder), asc(s.media.createdAt));

  const body: EventDetail = {
    ...toEventSummary(e),
    story: e.story,
    closingNote: e.closingNote,
    highlights: e.highlights.filter((h) => h.kind === 'highlight').map((h) => h.text),
    schoolsVisited: e.highlights.filter((h) => h.kind === 'school_visited').map((h) => h.text),
    volunteersWanted: e.volunteersWanted,
    gallery: publicImages(gallery),
    seoTitle: e.seoTitle,
    seoDescription: e.seoDescription,
  };
  cache(res).json(body);
});

contentRouter.get('/news', async (_req, res) => {
  cache(res).json(await loadNews());
});

contentRouter.get('/news/:slug', async (req, res) => {
  const preview = await isPreview(req);
  const n = await db.query.newsPosts.findFirst({
    where: preview ? eq(s.newsPosts.slug, req.params.slug) : and(eq(s.newsPosts.slug, req.params.slug), eq(s.newsPosts.status, 'published')),
    with: { coverImage: true, programme: programmeRef },
  });
  if (!n || (!n.publishedAt && !preview)) throw new HttpError(404, 'Story not found');
  const body: NewsDetail = {
    slug: n.slug,
    title: n.title,
    excerpt: n.excerpt,
    publishedAt: (n.publishedAt ?? n.updatedAt).toISOString(),
    coverImage: toPublicImage(n.coverImage),
    programme: n.programme,
    bodyHtml: n.bodyHtml, // sanitised when saved in the admin
    seoTitle: n.seoTitle,
    seoDescription: n.seoDescription,
  };
  cache(res).json(body);
});

contentRouter.get('/gallery', async (_req, res) => {
  const rows = await db.query.media.findMany({
    with: {
      programme: programmeRef,
      event: { columns: { slug: true, title: true, status: true } },
    },
    orderBy: (m, { desc }) => [desc(m.year), desc(m.createdAt)],
  });
  const items: GalleryContent['items'] = [];
  for (const m of rows) {
    if (m.tags.includes('hide-from-gallery')) continue;
    const img = toPublicImage(m);
    if (!img) continue;
    const event = m.event?.status === 'published' ? { slug: m.event.slug, title: m.event.title } : null;
    items.push({ ...img, year: m.year, programme: m.programme, event });
  }
  const programmes = (await loadProgrammes()).map(({ slug, shortTitle }) => ({ slug, shortTitle }));
  const years = [...new Set(items.map((i) => i.year).filter((y): y is number => y !== null))].sort((a, b) => b - a);
  const body: GalleryContent = { items, programmes, years };
  cache(res).json(body);
});

contentRouter.get('/team', async (_req, res) => {
  cache(res).json(await loadTeam());
});

/** Every slug to prerender. Called once at build time. */
contentRouter.get('/paths', async (_req, res) => {
  const [programmes, events, news] = await Promise.all([
    db.select({ slug: s.programmes.slug }).from(s.programmes).where(eq(s.programmes.status, 'published')),
    db.select({ slug: s.events.slug }).from(s.events).where(eq(s.events.status, 'published')),
    db
      .select({ slug: s.newsPosts.slug })
      .from(s.newsPosts)
      .where(and(eq(s.newsPosts.status, 'published'), isNotNull(s.newsPosts.publishedAt))),
  ]);
  const body: StaticPaths = {
    programmes: programmes.map((r) => r.slug),
    events: events.map((r) => r.slug),
    news: news.map((r) => r.slug),
  };
  res.json(body);
});
