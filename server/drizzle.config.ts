import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? 'postgres://gtyf:gtyf@localhost:5432/gtyf' },
  casing: 'snake_case',
  strict: true,
});
