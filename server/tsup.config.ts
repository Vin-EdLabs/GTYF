import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/db/migrate.ts', 'src/db/seed.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // The shared workspace ships TypeScript source, so bundle it in.
  noExternal: ['@gtyf/shared'],
  // Local-development database only; never loaded in production (which uses PostgreSQL).
  external: ['@electric-sql/pglite'],
});
