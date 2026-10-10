/**
 * Loads GTYF's real content (from @gtyf/shared/content) into the database.
 *
 * Safe to re-run: rows are matched by slug/key and existing rows are left
 * alone, so edits made in the admin are never overwritten. Pass
 * `{ overwrite: true }` only on a fresh install to reset content to defaults.
 */
import { inArray } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import {
  coreValues,
  defaultSiteSettings,
  heroSlides,
  homeSections,
  impactItems,
  impactStats,
  pastEvents,
  programmes,
  selectionSteps,
} from '@gtyf/shared/content';
import * as s from './schema';

type AnyDb = PgDatabase<PgQueryResultHKT, typeof s>;

export interface SeedOptions {
  overwrite?: boolean;
  log?: (msg: string) => void;
}

export async function seedContent(db: AnyDb, opts: SeedOptions = {}) {
  const log = opts.log ?? console.log;

  await db.transaction(async (tx) => {
    // --- Site settings (one row per group) --------------------------------
    for (const [key, value] of Object.entries(defaultSiteSettings)) {
      const q = tx.insert(s.siteSettings).values({ key, value });
      await (opts.overwrite
        ? q.onConflictDoUpdate({ target: s.siteSettings.key, set: { value } })
        : q.onConflictDoNothing());
    }
    log(`site_settings: ${Object.keys(defaultSiteSettings).length} groups`);

    // --- Home sections ----------------------------------------------------
    for (const [i, sec] of homeSections.entries()) {
      const row = { ...sec, items: sec.key === 'selection' ? selectionSteps : [], sortOrder: i };
      const q = tx.insert(s.homeSections).values(row);
      await (opts.overwrite
        ? q.onConflictDoUpdate({ target: s.homeSections.key, set: row })
        : q.onConflictDoNothing());
    }
    log(`home_sections: ${homeSections.length}`);

    // --- Programmes + "how it works" sections -----------------------------
    const insertedProgrammes = await tx
      .insert(s.programmes)
      .values(
        programmes.map((p, i) => ({
          slug: p.slug,
          title: p.title,
          shortTitle: p.shortTitle,
          summary: p.summary,
          body: p.body,
          status: 'published' as const,
          sortOrder: i,
        })),
      )
      .onConflictDoNothing({ target: s.programmes.slug })
      .returning({ id: s.programmes.id, slug: s.programmes.slug });

    const newProgrammeSlugs = new Set(insertedProgrammes.map((p) => p.slug));
    const programmeRows = await tx
      .select({ id: s.programmes.id, slug: s.programmes.slug })
      .from(s.programmes)
      .where(inArray(s.programmes.slug, programmes.map((p) => p.slug)));
    const programmeId = new Map(programmeRows.map((p) => [p.slug, p.id]));
    const pid = (slug: string | null) => (slug ? (programmeId.get(slug) ?? null) : null);

    const sectionRows = programmes
      .filter((p) => opts.overwrite || newProgrammeSlugs.has(p.slug))
      .flatMap((p) =>
        p.sections.map((sec, i) => ({
          programmeId: pid(p.slug)!,
          heading: sec.heading,
          body: sec.body,
          sortOrder: i,
        })),
      );
    if (opts.overwrite) {
      await tx.delete(s.programmeSections).where(inArray(s.programmeSections.programmeId, [...programmeId.values()]));
    }
    if (sectionRows.length) await tx.insert(s.programmeSections).values(sectionRows);
    log(`programmes: ${insertedProgrammes.length} new, ${sectionRows.length} sections`);

    // --- Past events + highlights -----------------------------------------
    const insertedEvents = await tx
      .insert(s.events)
      .values(
        pastEvents.map((e) => ({
          slug: e.slug,
          title: e.title,
          programmeId: pid(e.programme),
          dateStart: e.dateStart,
          dateEnd: e.dateEnd ?? null,
          venue: e.venue,
          participants: e.participants ?? null,
          story: e.story ?? null,
          closingNote: e.closingNote ?? null,
          status: 'published' as const,
        })),
      )
      .onConflictDoNothing({ target: s.events.slug })
      .returning({ id: s.events.id, slug: s.events.slug });

    const eventId = new Map(insertedEvents.map((e) => [e.slug, e.id]));
    const highlightRows = pastEvents
      .filter((e) => eventId.has(e.slug))
      .flatMap((e) => [
        ...e.highlights.map((text, i) => ({ eventId: eventId.get(e.slug)!, kind: 'highlight' as const, text, sortOrder: i })),
        ...(e.schoolsVisited ?? []).map((text, i) => ({
          eventId: eventId.get(e.slug)!,
          kind: 'school_visited' as const,
          text,
          sortOrder: i,
        })),
      ]);
    if (highlightRows.length) await tx.insert(s.eventHighlights).values(highlightRows);
    log(`events: ${insertedEvents.length} new, ${highlightRows.length} list items`);

    // --- Hero slides (only on an empty table; they have no natural key) ---
    const existingSlides = await tx.select({ id: s.heroSlides.id }).from(s.heroSlides).limit(1);
    if (existingSlides.length === 0) {
      await tx.insert(s.heroSlides).values(
        heroSlides.map((h, i) => ({
          eyebrow: h.eyebrow,
          headline: h.headline,
          underlineWord: h.underlineWord,
          subtext: h.subtext,
          programmeId: pid(h.programme),
          primaryLabel: h.primaryLabel,
          primaryHref: h.primaryHref,
          secondaryLabel: h.secondaryLabel,
          secondaryHref: h.secondaryHref,
          sortOrder: i,
        })),
      );
      log(`hero_slides: ${heroSlides.length}`);
    }

    // --- Core values (only on an empty table) -----------------------------
    const existingValues = await tx.select({ id: s.coreValues.id }).from(s.coreValues).limit(1);
    if (existingValues.length === 0) {
      await tx.insert(s.coreValues).values(
        coreValues.map((v, i) => ({
          name: v.name,
          description: v.description,
          descriptionIsDraft: v.isDraft,
          sortOrder: i,
        })),
      );
      log(`core_values: ${coreValues.length}`);
    }

    // --- Impact numbers and impact items ----------------------------------
    for (const [i, st] of impactStats.entries()) {
      const row = {
        key: st.key,
        value: st.value,
        prefix: st.prefix ?? '',
        suffix: st.suffix ?? '',
        label: st.label,
        isYear: st.isYear ?? false,
        sortOrder: i,
      };
      const q = tx.insert(s.impactStats).values(row);
      await (opts.overwrite
        ? q.onConflictDoUpdate({ target: s.impactStats.key, set: row })
        : q.onConflictDoNothing());
    }
    log(`impact_stats: ${impactStats.length}`);

    for (const [i, it] of impactItems.entries()) {
      const row = {
        key: it.key,
        programmeId: pid(it.programme),
        label: it.label,
        singular: it.singular,
        plural: it.plural,
        unitPrice: it.unitPrice,
        icon: it.icon,
        needsConfirmation: it.needsConfirmation,
        sortOrder: i,
      };
      const q = tx.insert(s.impactItems).values(row);
      await (opts.overwrite
        ? q.onConflictDoUpdate({ target: s.impactItems.key, set: row })
        : q.onConflictDoNothing());
    }
    log(`impact_items: ${impactItems.length} (prices: CONFIRM WITH GTYF)`);
  });
}

/** Creates the first super admin if one with this email doesn't exist yet. */
export async function seedSuperAdmin(db: AnyDb, email: string, name: string, passwordHash: string) {
  const rows = await db
    .insert(s.admins)
    .values({ email: email.toLowerCase(), name, passwordHash, role: 'super_admin' })
    .onConflictDoNothing({ target: s.admins.email })
    .returning({ id: s.admins.id });
  return rows.length > 0;
}
