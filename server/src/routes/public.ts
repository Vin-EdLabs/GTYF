import { Router } from 'express';
import { sql } from 'drizzle-orm';
import type { SiteResponse } from '@gtyf/shared/api';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { media } from '../db/schema';
import { toPublicImage } from '../lib/publicMedia';
import { getDonationConfig } from '../lib/donationConfig';
import { getHomeSections, getSiteSettings } from '../lib/settings';

export const publicRouter = Router();

publicRouter.get('/health', async (_req, res) => {
  await db.execute(sql`select 1`);
  res.json({ ok: true });
});

publicRouter.get('/site', async (_req, res) => {
  const [settings, homeSections, donation] = await Promise.all([getSiteSettings(db), getHomeSections(db), getDonationConfig()]);
  const ogId = settings.seo.defaultOgImageId;
  const [og] = ogId ? await db.select().from(media).where(eq(media.id, ogId)) : [];
  const share = toPublicImage(og);
  const body: SiteResponse = { settings, homeSections, donation, defaultShareImage: share?.ogUrl ?? share?.src ?? null };
  res.set('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  res.json(body);
});
