/**
 * Photo processing for uploads from the admin (often straight from a phone):
 *   - rotated upright from EXIF, EXIF/GPS metadata stripped (privacy),
 *   - WebP + AVIF at 640 / 1280 / 2048 wide (never upscaled),
 *   - a 1200×630 JPEG for link previews, cropped around the focal point,
 *   - a tiny blurred placeholder shown while the real image loads.
 * Files live in UPLOAD_DIR/<yyyy>/<mm>/<id>/ and are served from /uploads.
 */
import crypto from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type { MediaVariant } from '../db/schema';
import { env } from '../env';

// Don't keep source files open between operations (otherwise Windows can't delete them).
sharp.cache({ files: 0 });

export const WIDTHS = [640, 1280, 2048] as const;
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif'];

const uploadRoot = () => path.resolve(env.UPLOAD_DIR);

export interface ProcessedImage {
  storageKey: string;
  width: number;
  height: number;
  bytes: number;
  variants: MediaVariant[];
  blurDataUrl: string;
}

export async function processUpload(buffer: Buffer): Promise<ProcessedImage> {
  // .rotate() applies EXIF orientation; metadata is dropped by default on output.
  const base = sharp(buffer, { failOn: 'error' }).rotate();
  const { width = 0, height = 0 } = await base.clone().toBuffer({ resolveWithObject: true }).then((r) => r.info);
  if (!width || !height) throw new Error('Could not read this image.');
  if (width < 400 || height < 300) throw new Error('This photo is too small. Please use one at least 400 × 300 pixels.');

  const now = new Date();
  const id = crypto.randomUUID();
  const storageKey = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${id}`;
  const dir = path.join(uploadRoot(), storageKey);
  await mkdir(dir, { recursive: true });

  const variants: MediaVariant[] = [];
  const widths = WIDTHS.filter((w, i) => w <= width || i === 0);
  for (const w of widths) {
    const target = Math.min(w, width);
    const resized = base.clone().resize({ width: target, withoutEnlargement: true });
    const h = Math.round((height / width) * target);
    await resized.clone().webp({ quality: 80 }).toFile(path.join(dir, `w${w}.webp`));
    variants.push({ width: target, height: h, format: 'webp', path: `${storageKey}/w${w}.webp` });
    await resized.clone().avif({ quality: 55, effort: 4 }).toFile(path.join(dir, `w${w}.avif`));
    variants.push({ width: target, height: h, format: 'avif', path: `${storageKey}/w${w}.avif` });
  }
  await writeOgImage(buffer, storageKey, 0.5, 0.5);
  variants.push({ width: 1200, height: 630, format: 'jpeg', path: `${storageKey}/og.jpg` });

  const blur = await base.clone().resize(16).webp({ quality: 40 }).toBuffer();
  return {
    storageKey,
    width,
    height,
    bytes: buffer.length,
    variants,
    blurDataUrl: `data:image/webp;base64,${blur.toString('base64')}`,
  };
}

/** 1200×630 link-preview crop that keeps the focal point in frame. */
export async function writeOgImage(source: Buffer | string, storageKey: string, focalX: number, focalY: number) {
  const img = sharp(source).rotate();
  const { info, data } = await img.toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const targetRatio = 1200 / 630;
  let cw = width;
  let ch = Math.round(width / targetRatio);
  if (ch > height) {
    ch = height;
    cw = Math.round(height * targetRatio);
  }
  const left = Math.round(Math.min(Math.max(focalX * width - cw / 2, 0), width - cw));
  const top = Math.round(Math.min(Math.max(focalY * height - ch / 2, 0), height - ch));
  await sharp(data)
    .extract({ left, top, width: cw, height: ch })
    .resize(1200, 630)
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(uploadRoot(), storageKey, 'og.jpg'));
}

/** Regenerate the preview crop after the focal point changes (uses the largest WebP as source). */
export async function refreshOgImage(storageKey: string, variants: MediaVariant[], focalX: number, focalY: number) {
  const largest = variants.filter((v) => v.format === 'webp').sort((a, b) => b.width - a.width)[0];
  if (!largest) return;
  await writeOgImage(path.join(uploadRoot(), largest.path), storageKey, focalX, focalY);
}

export async function deleteFiles(storageKey: string) {
  // Guard against path tricks: storage keys are always yyyy/mm/uuid.
  if (!/^\d{4}\/\d{2}\/[0-9a-f-]{36}$/.test(storageKey)) return;
  await rm(path.join(uploadRoot(), storageKey), { recursive: true, force: true });
}
