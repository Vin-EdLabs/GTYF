import { env } from './env';
import { createApp } from './app';
import { closeDb } from './db/client';

let shuttingDown = false;
/** Finish in-flight requests, close the database cleanly, then exit. */
function shutdown(reason: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[server] shutting down (${reason})`);
  server.close(() => {
    void closeDb().then(() => process.exit(0));
  });
  // Don't hang forever on a stuck connection.
  setTimeout(() => void closeDb().finally(() => process.exit(0)), 5000).unref();
}

const app = createApp(env, { onDevShutdown: () => shutdown('dev shutdown request') });
const server = app.listen(env.PORT, () => {
  console.log(`GTYF API listening on http://localhost:${env.PORT}`);
});

// PM2 sends SIGINT on reload; Ctrl+C sends SIGINT; Windows Ctrl+Break sends SIGBREAK.
for (const signal of ['SIGINT', 'SIGTERM', 'SIGBREAK'] as const) {
  process.on(signal, () => shutdown(signal));
}
