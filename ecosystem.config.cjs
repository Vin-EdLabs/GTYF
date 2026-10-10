/**
 * PM2 process file for the GTYF API on the production server.
 *
 *   pm2 start ecosystem.config.cjs      first time
 *   pm2 reload gtyf-api                 after a deploy (zero-downtime-ish restart)
 *   pm2 logs gtyf-api                   see what it's doing
 *
 * NODE_ENV is set here, NOT in .env (Vite reads .env and would build React in
 * development mode if NODE_ENV were there).
 */
module.exports = {
  apps: [
    {
      name: 'gtyf-api',
      cwd: __dirname + '/server',
      script: 'dist/index.js',
      node_args: '--env-file=../.env',
      // One process: rate limits and uploads are simple and memory stays small.
      // The API is light; Nginx serves the website and photos directly.
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      // Restart if it ever leaks memory; wait for a clean shutdown (closes the database).
      max_memory_restart: '600M',
      kill_timeout: 8000,
      listen_timeout: 15000,
      // Back off if something is badly wrong instead of restarting in a tight loop.
      exp_backoff_restart_delay: 200,
      time: true,
      out_file: '/var/log/gtyf/api.out.log',
      error_file: '/var/log/gtyf/api.err.log',
      merge_logs: true,
    },
  ],
};
