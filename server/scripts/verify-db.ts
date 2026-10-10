/**
 * npm run db:verify -w server
 *
 * Applies every migration and the full seed to a throwaway in-memory Postgres
 * (PGlite), runs the seed twice to prove it's idempotent, then prints what
 * landed. No database server needed, so it's safe to run in CI.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { sql } from 'drizzle-orm';
import * as schema from '../src/db/schema';
import { seedContent } from '../src/db/seedContent';

const here = path.dirname(fileURLToPath(import.meta.url));
const client = new PGlite();
const db = drizzle(client, { schema, casing: 'snake_case' });

await migrate(db, { migrationsFolder: path.resolve(here, '../drizzle') });
await seedContent(db, { log: () => {} });
await seedContent(db, { log: () => {} }); // second run must not duplicate anything
await seedContent(db, { overwrite: true, log: () => {} }); // reset path must not duplicate either

const counts = await db.execute<{ table: string; n: number }>(sql`
  select 'programmes' as table, count(*)::int as n from programmes union all
  select 'programme_sections', count(*)::int from programme_sections union all
  select 'events', count(*)::int from events union all
  select 'event_highlights', count(*)::int from event_highlights union all
  select 'hero_slides', count(*)::int from hero_slides union all
  select 'core_values', count(*)::int from core_values union all
  select 'impact_stats', count(*)::int from impact_stats union all
  select 'impact_items', count(*)::int from impact_items union all
  select 'home_sections', count(*)::int from home_sections union all
  select 'site_settings', count(*)::int from site_settings`);
console.table(counts.rows);

const events = await db.query.events.findMany({
  with: { programme: { columns: { slug: true } }, highlights: true },
  orderBy: (e, { asc }) => asc(e.dateStart),
});
for (const e of events) {
  console.log(`${e.dateStart}  ${e.title.padEnd(44)} → ${e.programme?.slug}  (${e.highlights.length} items)`);
}

const expected: Record<string, number> = {
  programmes: 4, programme_sections: 3, events: 6, event_highlights: 14, hero_slides: 5,
  core_values: 8, impact_stats: 7, impact_items: 5, home_sections: 9, site_settings: 9,
};
const wrong = counts.rows.filter((r) => expected[r.table] !== r.n);
if (wrong.length) {
  console.error('Unexpected counts:', wrong);
  process.exit(1);
}
console.log('\nDatabase verified: migrations apply cleanly and the seed is idempotent.');
await client.close();
