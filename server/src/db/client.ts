import path from 'node:path';
import { serverRoot } from '../lib/paths';
import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

/**
 * Database connection.
 *
 * Production and normal development use PostgreSQL (`postgres://...`).
 * For quick local work without Postgres or Docker, `DATABASE_URL=pglite:./.pglite`
 * runs an embedded Postgres (PGlite, a dev dependency) stored in that folder.
 * The query API is identical, so the app code doesn't know the difference.
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');

export type Db = NodePgDatabase<typeof schema>;
export const driver: 'pg' | 'pglite' = connectionString.startsWith('pglite:') ? 'pglite' : 'pg';

let db: Db;
let closeDb: () => Promise<void>;

/**
 * A relative PGlite folder is resolved from the server package folder, NOT the
 * current working directory. Otherwise starting the server from another folder
 * silently opens a different, empty database and it looks like data vanished.
 */
function pgliteDataDir(spec: string) {
  return path.isAbsolute(spec) ? spec : path.resolve(serverRoot(), spec || '.pglite');
}

if (driver === 'pglite') {
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const dataDir = pgliteDataDir(connectionString.slice('pglite:'.length));
  // Every change is written to disk as it happens (PGlite's default, relaxedDurability: false).
  const client = new PGlite(dataDir);
  console.log(`[db] PGlite database: ${dataDir}`);
  db = drizzle(client, { schema, casing: 'snake_case' }) as unknown as Db;
  closeDb = () => client.close();
} else {
  const pool = new pg.Pool({ connectionString, max: 10 });
  db = drizzlePg(pool, { schema, casing: 'snake_case' });
  closeDb = () => pool.end();
}

export { db, closeDb };
