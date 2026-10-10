import { asc, eq } from 'drizzle-orm';
import { defaultSiteSettings, homeSections as defaultSections, selectionSteps, type SiteSettings } from '@gtyf/shared/content';
import type { HomeSection } from '@gtyf/shared/api';
import type { Db } from '../db/client';
import { homeSections, siteSettings } from '../db/schema';

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Deep-merge `over` onto `base`. Arrays and scalars in `over` replace; missing keys keep the default. */
function deepMerge<T>(base: T, over: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(over)) return (over ?? base) as T;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(over)) {
    if (!(k in base) || v === undefined) continue; // ignore stale keys no longer in the schema
    out[k] = isPlainObject(base[k]) ? deepMerge(base[k], v) : v;
  }
  return out as T;
}

/**
 * Site settings from the database, layered over the defaults so a group or
 * field added in a later release is never missing.
 */
export async function getSiteSettings(db: Db): Promise<SiteSettings> {
  const rows = await db.select().from(siteSettings);
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return deepMerge(defaultSiteSettings, stored);
}

/**
 * Home sections added in a later release (e.g. "Our team") are inserted into
 * existing databases automatically, right after the section that precedes
 * them in the default order, so nothing needs a manual migration.
 */
export async function ensureHomeSections(db: Db) {
  const rows = await db.select().from(homeSections).orderBy(asc(homeSections.sortOrder));
  const have = new Set(rows.map((r) => r.key));
  const missing = defaultSections.filter((d) => !have.has(d.key));
  if (!missing.length) return rows;

  const order = rows.map((r) => r.key as string);
  for (const m of missing) {
    const i = defaultSections.findIndex((d) => d.key === m.key);
    let at = 0;
    for (let k = i - 1; k >= 0; k--) {
      const idx = order.indexOf(defaultSections[k]!.key);
      if (idx >= 0) {
        at = idx + 1;
        break;
      }
    }
    order.splice(at, 0, m.key);
  }
  await db.transaction(async (tx) => {
    for (const m of missing) {
      await tx
        .insert(homeSections)
        .values({ key: m.key, eyebrow: m.eyebrow, heading: m.heading, underlineWord: m.underlineWord, body: m.body, items: m.key === 'selection' ? selectionSteps : [], isVisible: true, sortOrder: order.indexOf(m.key) })
        .onConflictDoNothing();
    }
    for (const [i, key] of order.entries()) await tx.update(homeSections).set({ sortOrder: i }).where(eq(homeSections.key, key));
  });
  return db.select().from(homeSections).orderBy(asc(homeSections.sortOrder));
}

export async function getHomeSections(db: Db): Promise<HomeSection[]> {
  const rows = await ensureHomeSections(db);
  return rows.map(({ updatedAt: _u, ...r }) => r as HomeSection);
}
