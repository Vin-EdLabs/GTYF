import { fromServerRoot } from '../lib/paths';
import { closeDb, db, driver } from './client';

// Migrations live in server/drizzle, wherever this script runs from (src/ or dist/).
const migrationsFolder = fromServerRoot('drizzle');

if (driver === 'pglite') {
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  await migrate(db as never, { migrationsFolder });
} else {
  const { migrate } = await import('drizzle-orm/node-postgres/migrator');
  await migrate(db, { migrationsFolder });
}
console.log('Migrations applied.');
await closeDb();
