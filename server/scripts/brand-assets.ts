/**
 * npm run brand -w server
 *
 * Builds every logo file the site needs from GTYF's logo (shared/pic/logo.jpeg):
 * the round emblem for the nav/footer, favicons and home-screen icons, and the
 * full logo for receipts, emails and PDFs. Re-run after replacing the logo.
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '../..');
const source = path.join(root, 'shared/pic/logo.jpeg');
const out = path.join(root, 'client/public/brand');
await mkdir(out, { recursive: true });

// The round emblem (three figures above a hand), without the wordmark below it.
// Coordinates are for the 600×600 source file.
const emblem = () =>
  sharp(source)
    .extract({ left: 168, top: 72, width: 280, height: 264 })
    .extend({ top: 8, bottom: 8, left: 0, right: 0, background: '#ffffff' })
    .flatten({ background: '#ffffff' });

const jobs: [string, () => Promise<unknown>][] = [
  ['logo-mark.png (nav, footer)', () => emblem().resize(160, 160).png({ compressionLevel: 9 }).toFile(path.join(out, 'logo-mark.png'))],
  ['logo-mark.webp', () => emblem().resize(160, 160).webp({ quality: 88 }).toFile(path.join(out, 'logo-mark.webp'))],
  ['favicon-32.png', () => emblem().resize(32, 32).png().toFile(path.join(out, 'favicon-32.png'))],
  ['icon-192.png', () => emblem().resize(192, 192).png().toFile(path.join(out, 'icon-192.png'))],
  ['icon-512.png', () => emblem().resize(512, 512).png().toFile(path.join(out, 'icon-512.png'))],
  // iOS home-screen icon: emblem with breathing room on white.
  [
    'apple-touch-icon.png',
    () =>
      emblem()
        .resize(148, 148)
        .extend({ top: 16, bottom: 16, left: 16, right: 16, background: '#ffffff' })
        .png()
        .toFile(path.join(out, 'apple-touch-icon.png')),
  ],
  // Full logo (emblem + name) for receipts, emails and PDFs.
  ['logo-full.png', () => sharp(source).resize(480, 480).png({ compressionLevel: 9 }).toFile(path.join(out, 'logo-full.png'))],
  ['logo-full.jpg', () => sharp(source).resize(480, 480).jpeg({ quality: 88 }).toFile(path.join(out, 'logo-full.jpg'))],
];
const serverAssets = path.join(root, 'server/assets');
await mkdir(serverAssets, { recursive: true });
jobs.push(['server/assets/logo-full.png (PDF receipts)', () => sharp(source).resize(360, 360).png().toFile(path.join(serverAssets, 'logo-full.png'))]);

for (const [name, job] of jobs) {
  await job();
  console.log('✓', name);
}
