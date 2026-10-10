/**
 * Four DEMO team profiles (made-up people, stock portraits) so the Team section
 * looks complete until GTYF adds its real team in Admin → Team.
 * Only runs when the team list is EMPTY. Photos are tagged `demo` like the other
 * placeholders, so "Remove all demo photos" clears them too.
 */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { arrayContains } from 'drizzle-orm';
import type { Db } from './client';
import * as s from './schema';
import { DEMO_TAG } from './demoPhotos';
import { fromServerRoot } from '../lib/paths';
import { processUpload, refreshOgImage } from '../lib/media';

const LINKS = { linkedin: 'https://www.linkedin.com/', instagram: 'https://www.instagram.com/', tiktok: 'https://www.tiktok.com/' };
const DEMO_NOTE = 'Demo profile: replace with the real person in Admin → Team.';

const PEOPLE = [
  { file: 'p12', name: 'Kwame Mensah', role: 'Founder & Director', leader: true, social: ['email', 'linkedin', 'instagram', 'tiktok'], bio: `Leads GTYF's vision of keeping every child in Wamfie in school. ${DEMO_NOTE}`, alt: 'Portrait of a smiling man in a shirt' },
  { file: 'p47', name: 'Abena Owusu', role: 'Programmes Lead', leader: true, social: ['email', 'linkedin', 'instagram'], bio: `Plans each outreach, from school visits to the Life After School mentoring. ${DEMO_NOTE}`, alt: 'Portrait of a smiling woman' },
  { file: 'p33', name: 'Yaw Boateng', role: 'Volunteer Coordinator', leader: false, social: ['email', 'instagram', 'tiktok'], bio: `Brings volunteers together and keeps outreach days running smoothly. ${DEMO_NOTE}`, alt: 'Portrait of a young man smiling' },
  { file: 'p5', name: 'Akosua Adjei', role: 'Mentor & Teacher Liaison', leader: false, social: ['linkedin', 'instagram'], bio: `Works with JHS teachers and mentors students about life after school. ${DEMO_NOTE}`, alt: 'Portrait of a young woman smiling' },
];

export async function seedDemoTeam(db: Db, log: (m: string) => void = console.log) {
  if ((await db.select({ id: s.teamMembers.id }).from(s.teamMembers).limit(1)).length) return 0;
  const dir = fromServerRoot('seed', 'demo-team');
  let added = 0;
  for (const [i, p] of PEOPLE.entries()) {
    const file = path.join(dir, `${p.file}.jpg`);
    let photoId: string | null = null;
    if (existsSync(file)) {
      const tag = `${DEMO_TAG}:team-${p.file}`;
      let [media] = await db.select().from(s.media).where(arrayContains(s.media.tags, [tag]));
      if (!media) {
        const processed = await processUpload(await readFile(file));
        [media] = await db
          .insert(s.media)
          .values({ ...processed, originalFilename: `demo-team-${p.file}.jpg`, mimeType: 'image/jpeg', altText: p.alt, focalX: 0.5, focalY: 0.35, showsChildren: false, consentConfirmed: true, consentConfirmedAt: new Date(), tags: [DEMO_TAG, tag] })
          .returning();
        await refreshOgImage(media!.storageKey, media!.variants, 0.5, 0.35);
      }
      photoId = media!.id;
    }
    await db.insert(s.teamMembers).values({ name: p.name, role: p.role, bio: p.bio, photoId, isLeader: p.leader, email: p.social.includes('email') ? 'hello@example.com' : '', linkedin: p.social.includes('linkedin') ? LINKS.linkedin : '', instagram: p.social.includes('instagram') ? LINKS.instagram : '', tiktok: p.social.includes('tiktok') ? LINKS.tiktok : '', isVisible: true, sortOrder: i });
    added++;
  }
  log(`demo team: added ${added} placeholder profiles`);
  return added;
}
