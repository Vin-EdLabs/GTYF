/**
 * npm run db:seed              load GTYF content (keeps existing edits)
 * npm run db:seed -- --overwrite  reset content to the defaults (fresh installs only)
 * npm run db:seed -- --no-demo-photos  don't add the placeholder photos
 *
 * The first super admin is created from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
 * (and optional SEED_ADMIN_NAME) if those are set. Remove them from .env afterwards.
 */
import bcrypt from 'bcryptjs';
import { closeDb, db } from './client';
import { seedContent, seedSuperAdmin } from './seedContent';

const overwrite = process.argv.includes('--overwrite');

try {
  await seedContent(db, { overwrite });

  // Placeholder photos for every empty photo spot (replace them in Admin → Photos).
  if (!process.argv.includes('--no-demo-photos')) {
    const { seedDemoPhotos } = await import('./seedDemoPhotos');
    await seedDemoPhotos(db);
    const { seedDemoTeam } = await import('./seedDemoTeam');
    await seedDemoTeam(db);
  }

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (email && password) {
    if (password.length < 5) throw new Error('SEED_ADMIN_PASSWORD must be at least 5 characters');
    const created = await seedSuperAdmin(
      db,
      email,
      process.env.SEED_ADMIN_NAME ?? 'GTYF Admin',
      await bcrypt.hash(password, 12),
    );
    console.log(created ? `admins: created super admin ${email}` : `admins: ${email} already exists`);
  } else {
    console.log('admins: skipped (set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create the first super admin)');
  }
  console.log('Seed complete.');
} finally {
  await closeDb();
}
