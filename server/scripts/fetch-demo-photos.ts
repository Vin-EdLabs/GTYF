/**
 * npm run demo-photos:fetch -w server
 *
 * Downloads the demo photos listed in src/db/demoPhotos.ts from Unsplash
 * (free licence) into server/seed/demo-photos/. Run once; the files are then
 * part of the project, so seeding (including in production) never needs Unsplash.
 */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { demoPhotos } from '../src/db/demoPhotos';

const dir = path.resolve(import.meta.dirname, '../seed/demo-photos');
await mkdir(dir, { recursive: true });

for (const p of demoPhotos) {
  const file = path.join(dir, `${p.key}.jpg`);
  if (existsSync(file)) {
    console.log('·', p.key, '(already downloaded)');
    continue;
  }
  const res = await fetch(`https://images.unsplash.com/photo-${p.unsplashId}?w=2048&q=82&fm=jpg`);
  if (!res.ok) throw new Error(`Download failed for ${p.key}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(file, buf);
  console.log('✓', p.key, `${Math.round(buf.length / 1024)} KB`);
}
