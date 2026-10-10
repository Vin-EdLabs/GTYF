/**
 * Donation rules shared by the donation card (live preview) and the server
 * (which recomputes everything and never trusts client totals).
 * All amounts are integer pesewas.
 */
import { formatCedis, type ImpactIcon } from './index';
import type { ImpactItem } from './api';

export const DONATION_LIMITS = {
  /** GH₵ 5 minimum, per the brief. */
  min: 500,
  /** Default ceiling; the server can lower/raise it with DONATION_MAX_CEDIS. */
  max: 5_000_000,
  sliderMin: 1_000,
  sliderMax: 500_000,
} as const;

export const PRESET_AMOUNTS = [5_000, 10_000, 20_000, 50_000] as const;

/** Slider runs on a log scale so GH₵ 10–200 gets as much travel as 200–5,000. */
const SLIDER_STEPS = 1000;
export const SLIDER_RESOLUTION = SLIDER_STEPS;

export function sliderToAmount(position: number) {
  const { sliderMin, sliderMax } = DONATION_LIMITS;
  const t = Math.min(1, Math.max(0, position / SLIDER_STEPS));
  const raw = sliderMin * Math.pow(sliderMax / sliderMin, t);
  // Round to friendly steps: GH₵ 1 under 100, 5 under 500, 10 under 1,000, 50 above.
  const cedis = raw / 100;
  const step = cedis < 100 ? 1 : cedis < 500 ? 5 : cedis < 1000 ? 10 : 50;
  return Math.round(cedis / step) * step * 100;
}

export function amountToSlider(amount: number) {
  const { sliderMin, sliderMax } = DONATION_LIMITS;
  const clamped = Math.min(sliderMax, Math.max(sliderMin, amount));
  return Math.round((Math.log(clamped / sliderMin) / Math.log(sliderMax / sliderMin)) * SLIDER_STEPS);
}

/**
 * Fee the donor adds so that, after Paystack's percentage fee, the full gift
 * reaches GTYF: total = amount / (1 − rate), rounded up to the pesewa.
 */
export function coverFee(amount: number, ratePercent: number) {
  if (ratePercent <= 0) return 0;
  const total = Math.ceil(amount / (1 - ratePercent / 100));
  return total - amount;
}

// ---------------------------------------------------------------------------
// Impact translation: "GH₵ 200 = 1 full school uniform + 1 pair of shoes"
// ---------------------------------------------------------------------------

export interface ImpactLine {
  item: ImpactItem;
  count: number;
}

export interface ImpactTranslation {
  lines: ImpactLine[];
  /** "1 full school uniform + 1 pair of shoes" (empty when nothing fits yet). */
  text: string;
  /** The amount doesn't buy one whole item yet; `towards` is the item it contributes to. */
  towards: ImpactItem | null;
  /** One icon per item bought, capped, for the stacking illustration. */
  icons: ImpactIcon[];
}

/** Items that apply to a cause: that programme's items, or all of them for "where it's needed most". */
export const itemsForCause = (items: ImpactItem[], cause: string | null) =>
  (cause ? items.filter((i) => i.programmeSlug === cause) : items).slice().sort((a, b) => b.unitPrice - a.unitPrice);

/**
 * Buy whole "sets" of the cause's items first (so a uniform comes with shoes),
 * then fill what's left greedily, biggest item first.
 */
export function translateImpact(amount: number, allItems: ImpactItem[], cause: string | null, maxIcons = 12): ImpactTranslation {
  const items = itemsForCause(allItems, cause);
  if (!items.length || amount <= 0) return { lines: [], text: '', towards: null, icons: [] };

  const counts = new Map<string, number>(items.map((i) => [i.key, 0]));
  const setPrice = items.reduce((s, i) => s + i.unitPrice, 0);
  let left = amount;
  const sets = Math.floor(left / setPrice);
  if (sets > 0 && items.length > 1) {
    for (const i of items) counts.set(i.key, sets);
    left -= sets * setPrice;
  }
  for (const i of items) {
    const n = Math.floor(left / i.unitPrice);
    if (n > 0) {
      counts.set(i.key, counts.get(i.key)! + n);
      left -= n * i.unitPrice;
    }
  }

  const lines = items.map((item) => ({ item, count: counts.get(item.key)! })).filter((l) => l.count > 0);
  if (!lines.length) {
    const cheapest = items[items.length - 1]!;
    return { lines: [], text: '', towards: cheapest, icons: [] };
  }
  const text = lines.map((l) => `${l.count} ${l.count === 1 ? l.item.singular : l.item.plural}`).join(' + ');
  const icons = lines.flatMap((l) => Array<ImpactIcon>(l.count).fill(l.item.icon)).slice(0, maxIcons);
  return { lines, text, towards: null, icons };
}

/** Full sentence for receipts and emails. */
export function impactSentence(amount: number, t: ImpactTranslation, causeName: string, monthly: boolean) {
  const every = monthly ? ' every month' : '';
  if (t.text) return `${formatCedis(amount)}${every} = ${t.text}`;
  if (t.towards) return `${formatCedis(amount)}${every} goes towards a ${t.towards.singular}`;
  return `${formatCedis(amount)}${every} supports ${causeName}`;
}

export type { DonationInitInput } from './donationSchema';

export interface DonationInitResponse {
  reference: string;
  accessCode: string;
  /** Secret that lets the thank-you page (and only it) read this donation. */
  receiptToken: string;
  amount: number;
  fee: number;
  total: number;
}

export interface DonationConfig {
  publicKey: string;
  currency: 'GHS';
  feePercent: number;
  min: number;
  max: number;
  impactItems: ImpactItem[];
  causes: { slug: string; shortTitle: string; title: string; heroImage: import('./api').PublicImage | null }[];
}

export type ReceiptStatus = 'pending' | 'success' | 'failed' | 'abandoned' | 'reversed';

export interface DonationReceipt {
  status: ReceiptStatus;
  reference: string;
  firstName: string;
  /** Full name as entered; the receipt is private to the donor (secret link). */
  donorName: string;
  amount: number;
  fee: number;
  total: number;
  frequency: 'monthly' | 'one_time';
  causeSlug: string | null;
  causeName: string;
  impactSummary: string | null;
  paidAt: string | null;
  channel: string | null;
  dedication: { type: 'honour' | 'memory'; name: string } | null;
}
