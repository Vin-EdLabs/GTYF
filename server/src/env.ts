import { z } from 'zod';

/**
 * Validated environment. The server refuses to start with a missing or
 * malformed secret rather than failing later mid-donation.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  SITE_URL: z.url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  PAYSTACK_SECRET_KEY: z.string().default(''),
  PAYSTACK_PUBLIC_KEY: z.string().default(''),
  PAYSTACK_BASE_URL: z.url().default('https://api.paystack.co'),
  /** Paystack's local (GHS) fee, used for 'cover the fee'. CONFIRM against GTYF's Paystack pricing. */
  PAYSTACK_FEE_PERCENT: z.coerce.number().min(0).max(10).default(1.95),
  /** Largest single gift accepted, in cedis. */
  DONATION_MAX_CEDIS: z.coerce.number().int().positive().default(50_000),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().default('Guide The Youth Foundation <no-reply@example.org>'),
  ADMIN_ALERT_EMAIL: z.string().default(''),
  UPLOAD_DIR: z.string().default('./uploads'),
  /** Without SMTP settings, emails are written here as .html files instead of sent (development). */
  MAIL_OUTBOX_DIR: z.string().default('./.mail-outbox'),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment:\n${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();

if (env.NODE_ENV === 'production') {
  if (!env.PAYSTACK_SECRET_KEY.startsWith('sk_')) throw new Error('PAYSTACK_SECRET_KEY is required in production');
  if (!env.SITE_URL.startsWith('https://')) console.warn('[env] SITE_URL should be the https:// address of the live site');
  // The site can go live before email is set up: receipts are then saved to MAIL_OUTBOX_DIR
  // on the server instead of sent. Set SMTP_* as soon as possible.
  if (!env.SMTP_HOST) console.warn('[env] SMTP_HOST is not set: receipts and alerts are NOT being emailed (saved to MAIL_OUTBOX_DIR).');
  if (env.DATABASE_URL.startsWith('pglite:')) console.warn('[env] Production is using PGlite; use PostgreSQL (postgres://…) for real data.');
}
export const paystackMode = env.PAYSTACK_SECRET_KEY.startsWith('sk_live_') ? 'live' : 'test';
