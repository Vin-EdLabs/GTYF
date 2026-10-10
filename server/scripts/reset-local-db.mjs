// npm run db:reset:local -w server -- --yes-delete-everything
//
// DELETES the local PGlite database (all donations, messages, photos you added)
// and recreates it from the starter content. Refuses to run without the flag.
import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

if (!process.argv.includes('--yes-delete-everything')) {
  console.error('\n  This DELETES every donation, message and edit in the local database.');
  console.error('  If you really mean it, run:\n\n    npm run db:reset:local -w server -- --yes-delete-everything\n');
  process.exit(1);
}
rmSync('.pglite', { recursive: true, force: true });
execSync('npm run db:migrate', { stdio: 'inherit' });
execSync('npm run db:seed', { stdio: 'inherit' });
