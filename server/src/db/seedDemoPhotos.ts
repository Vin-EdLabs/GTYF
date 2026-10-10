/**
 * Loads the demo photos (see demoPhotos.ts) into the photo library and puts
 * them in photo spots that are still EMPTY. Never replaces a photo someone chose.
 * Safe to run again: photos already loaded are reused, not duplicated.
 */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fromServerRoot } from '../lib/paths';
import { and, arrayContains, asc, eq, inArray, isNull } from 'drizzle-orm';
import type { Db } from './client';
import * as s from './schema';
import { DEMO_TAG, demoPhotos } from './demoPhotos';
import { deleteFiles, processUpload, refreshOgImage } from '../lib/media';
import { getSiteSettings } from '../lib/settings';

const photoDir = fromServerRoot('seed', 'demo-photos');

export async function seedDemoPhotos(db: Db, log: (m: string) => void = console.log) {
  if (!existsSync(photoDir)) {
    log('demo photos: folder missing (run npm run demo-photos:fetch -w server); skipped');
    return { loaded: 0, placed: 0 };
  }
  const [programmes, events, sections, slides] = await Promise.all([
    db.select().from(s.programmes),
    db.select().from(s.events),
    db.select().from(s.programmeSections).orderBy(asc(s.programmeSections.sortOrder)),
    db.select().from(s.heroSlides).orderBy(asc(s.heroSlides.sortOrder)),
  ]);
  const programmeId = (slug?: string) => programmes.find((p) => p.slug === slug)?.id ?? null;
  const eventId = (slug?: string) => events.find((e) => e.slug === slug)?.id ?? null;

  let loaded = 0;
  let placed = 0;
  for (const photo of demoPhotos) {
    const file = path.join(photoDir, `${photo.key}.jpg`);
    if (!existsSync(file)) continue;
    const tag = `${DEMO_TAG}:${photo.key}`;

    let [media] = await db.select().from(s.media).where(arrayContains(s.media.tags, [tag]));
    if (!media) {
      const processed = await processUpload(await readFile(file));
      [media] = await db
        .insert(s.media)
        .values({
          ...processed,
          originalFilename: `demo-${photo.key}.jpg`,
          mimeType: 'image/jpeg',
          altText: photo.alt,
          focalX: photo.focalX,
          focalY: photo.focalY,
          // Free-licence stock photo (Unsplash licence), not a GTYF beneficiary photo.
          showsChildren: true,
          consentConfirmed: true,
          consentConfirmedAt: new Date(),
          programmeId: programmeId(photo.programme),
          eventId: eventId(photo.event),
          year: photo.event ? Number(photo.event.slice(-4)) || null : null,
          tags: [DEMO_TAG, tag],
        })
        .returning();
      await refreshOgImage(media!.storageKey, media!.variants, photo.focalX, photo.focalY);
      loaded++;
    }
    const id = media!.id;

    for (const slot of photo.slots) {
      let n = 0;
      if (slot.kind === 'slide') {
        const slide = slides[slot.index];
        if (slide) n = (await db.update(s.heroSlides).set({ imageId: id }).where(and(eq(s.heroSlides.id, slide.id), isNull(s.heroSlides.imageId))).returning()).length;
      } else if (slot.kind === 'programme') {
        const pid = programmeId(slot.slug);
        if (pid) n = (await db.update(s.programmes).set({ heroImageId: id }).where(and(eq(s.programmes.id, pid), isNull(s.programmes.heroImageId))).returning()).length;
      } else if (slot.kind === 'section') {
        const pid = programmeId(slot.programme);
        const section = sections.filter((x) => x.programmeId === pid)[slot.index];
        if (section) n = (await db.update(s.programmeSections).set({ imageId: id }).where(and(eq(s.programmeSections.id, section.id), isNull(s.programmeSections.imageId))).returning()).length;
      } else if (slot.kind === 'event') {
        const eid = eventId(slot.slug);
        if (eid) n = (await db.update(s.events).set({ heroImageId: id }).where(and(eq(s.events.id, eid), isNull(s.events.heroImageId))).returning()).length;
      } else if (slot.kind === 'about') {
        // (The link-preview image is the GTYF logo card by default, never a stock photo.)
        const group = 'about';
        const field = 'photoId';
        const current = (await getSiteSettings(db))[group] as Record<string, unknown>;
        if (!current[field]) {
          const value = { ...current, [field]: id };
          await db.insert(s.siteSettings).values({ key: group, value }).onConflictDoUpdate({ target: s.siteSettings.key, set: { value } });
          n = 1;
        }
      }
      placed += n;
    }
  }
  log(`demo photos: ${loaded} loaded, ${placed} empty photo spots filled`);
  return { loaded, placed };
}

/** Remove every demo photo (and its files). Spots they filled become empty again. */
export async function removeDemoPhotos(db: Db) {
  const rows = await db.select().from(s.media).where(arrayContains(s.media.tags, [DEMO_TAG]));
  if (!rows.length) return 0;
  const ids = rows.map((r) => r.id);
  // Settings hold photo ids as plain values (no foreign key), so clear those by hand.
  const settings = await getSiteSettings(db);
  for (const [group, field] of [
    ['about', 'photoId'],
    ['seo', 'defaultOgImageId'],
  ] as const) {
    const current = settings[group] as Record<string, unknown>;
    if (ids.includes(current[field] as string)) {
      const value = { ...current, [field]: null };
      await db.insert(s.siteSettings).values({ key: group, value }).onConflictDoUpdate({ target: s.siteSettings.key, set: { value } });
    }
  }
  await db.delete(s.media).where(inArray(s.media.id, ids)); // other spots: ON DELETE SET NULL
  for (const r of rows) await deleteFiles(r.storageKey).catch(() => undefined);
  return rows.length;
}
