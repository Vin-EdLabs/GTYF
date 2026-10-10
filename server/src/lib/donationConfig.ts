import { asc, eq } from 'drizzle-orm';
import { CURRENCY } from '@gtyf/shared';
import type { DonationConfig } from '@gtyf/shared/donations';
import { db } from '../db/client';
import * as s from '../db/schema';
import { env } from '../env';
import { toPublicImage } from './publicMedia';

/** What the donation card needs: causes, impact prices, fee rate, limits and the public key. */
export async function getDonationConfig(): Promise<DonationConfig> {
  const [programmes, items] = await Promise.all([
    db.query.programmes.findMany({
      where: eq(s.programmes.status, 'published'),
      with: { heroImage: true },
      orderBy: (p) => [asc(p.sortOrder)],
    }),
    db.query.impactItems.findMany({
      where: eq(s.impactItems.isActive, true),
      with: { programme: { columns: { slug: true } } },
      orderBy: (i) => [asc(i.sortOrder)],
    }),
  ]);
  return {
    publicKey: env.PAYSTACK_PUBLIC_KEY,
    currency: CURRENCY,
    feePercent: env.PAYSTACK_FEE_PERCENT,
    min: 500,
    max: env.DONATION_MAX_CEDIS * 100,
    impactItems: items.map((i) => ({
      key: i.key,
      programmeSlug: i.programme?.slug ?? null,
      label: i.label,
      singular: i.singular,
      plural: i.plural,
      unitPrice: i.unitPrice,
      icon: i.icon,
    })),
    causes: programmes.map((p) => ({ slug: p.slug, title: p.title, shortTitle: p.shortTitle, heroImage: toPublicImage(p.heroImage) })),
  };
}
