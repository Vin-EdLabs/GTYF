import type { PublicImage } from '@gtyf/shared/api';
import type { media } from '../db/schema';

type MediaRow = typeof media.$inferSelect;

/** Every uploaded photo with processed sizes is public. A missing description falls back to a generic one. */
export function isPublishable(m: MediaRow): boolean {
  return m.variants.length > 0;
}

const url = (path: string) => (path.startsWith('/') || path.startsWith('http') ? path : `/uploads/${path}`);

export function toPublicImage(m: MediaRow | null | undefined): PublicImage | null {
  if (!m || !isPublishable(m)) return null;
  const byFormat = (format: 'webp' | 'avif') =>
    m.variants.filter((v) => v.format === format).sort((a, b) => a.width - b.width);
  const webp = byFormat('webp');
  const avif = byFormat('avif');
  const og = m.variants.find((v) => v.format === 'jpeg');
  const srcSet = (list: typeof webp) => list.map((v) => `${url(v.path)} ${v.width}w`).join(', ');
  return {
    id: m.id,
    alt: m.altText.trim() || 'Guide The Youth Foundation photo',
    caption: m.caption,
    width: m.width,
    height: m.height,
    focalX: m.focalX,
    focalY: m.focalY,
    blurDataUrl: m.blurDataUrl,
    src: url((webp.at(-1) ?? m.variants[0]!).path),
    srcSetWebp: srcSet(webp),
    srcSetAvif: srcSet(avif),
    ogUrl: og ? url(og.path) : null,
  };
}

/** Map a list, dropping anything that isn't publishable. */
export const publicImages = (rows: MediaRow[]) => rows.map(toPublicImage).filter((i): i is PublicImage => i !== null);
