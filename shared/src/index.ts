/**
 * Code shared by the client and the server: enums, money helpers and the
 * shape of editable site content. Anything both sides must agree on lives here.
 */

export const CURRENCY = 'GHS' as const;
export const CURRENCY_SYMBOL = 'GH₵';

export const ADMIN_ROLES = ['super_admin', 'editor', 'finance'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const PUBLISH_STATUSES = ['draft', 'published'] as const;
export type PublishStatus = (typeof PUBLISH_STATUSES)[number];

export const DONATION_FREQUENCIES = ['monthly', 'one_time'] as const;
export type DonationFrequency = (typeof DONATION_FREQUENCIES)[number];

export const DONATION_STATUSES = ['pending', 'success', 'failed', 'abandoned', 'reversed'] as const;
export type DonationStatus = (typeof DONATION_STATUSES)[number];

export const INBOX_STATUSES = ['new', 'in_progress', 'done', 'archived'] as const;
export type InboxStatus = (typeof INBOX_STATUSES)[number];

/** Line-illustration keys the donation card knows how to draw. */
export const IMPACT_ICONS = ['book', 'pen', 'uniform', 'shoe', 'mentor'] as const;
export type ImpactIcon = (typeof IMPACT_ICONS)[number];

/** All money is stored and sent as integer pesewas (1 GH₵ = 100 pesewas). */
export const toPesewas = (cedis: number) => Math.round(cedis * 100);
export const toCedis = (pesewas: number) => pesewas / 100;

export function formatCedis(pesewas: number, opts: { decimals?: boolean } = {}) {
  const cedis = toCedis(pesewas);
  const decimals = opts.decimals ?? !Number.isInteger(cedis);
  return `${CURRENCY_SYMBOL} ${cedis.toLocaleString('en-GH', {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  })}`;
}

/**
 * Placeholder convention: any editable string that starts with "TODO:" is
 * content GTYF still has to supply. The public site hides these in production
 * and highlights them in development so nothing ships half-filled by accident.
 */
export const TODO_PREFIX = 'TODO:';
export const isTodo = (value: unknown): boolean =>
  typeof value === 'string' && value.trimStart().startsWith(TODO_PREFIX);

export type { SiteSettings } from './content/siteSettings';

// ---------------------------------------------------------------------------
// Dates. Ghana is on GMT all year (no daylight saving), so UTC is local time.
// ---------------------------------------------------------------------------

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const parts = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return { y: y!, m: m! - 1, d: d! };
};

/** "14 August 2023" */
export function formatDate(iso: string) {
  const { y, m, d } = parts(iso);
  return `${d} ${MONTHS[m]} ${y}`;
}

/** "19–20 October 2025", "30 September – 2 October 2025", or a single date. */
export function formatDateRange(start: string, end?: string | null) {
  if (!end || end === start) return formatDate(start);
  const a = parts(start);
  const b = parts(end);
  if (a.y !== b.y) return `${formatDate(start)} – ${formatDate(end)}`;
  if (a.m !== b.m) return `${a.d} ${MONTHS[a.m]} – ${b.d} ${MONTHS[b.m]} ${b.y}`;
  return `${a.d}–${b.d} ${MONTHS[a.m]} ${a.y}`;
}

export const yearOf = (iso: string) => parts(iso).y;

/** Today's date in Ghana as YYYY-MM-DD. */
export const todayInGhana = () => new Date().toISOString().slice(0, 10);

/**
 * Fill {placeholders} in editable text, e.g. fillTemplate('Thank you, {name}!', { name: 'Ama' }).
 * Unknown placeholders are removed rather than shown as "{oops}".
 */
export const fillTemplate = (text: string, vars: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''));

/** Split a text block into paragraphs on blank lines. */
export const paragraphs = (text: string | null | undefined) =>
  (text ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
