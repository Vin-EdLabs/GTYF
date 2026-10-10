/**
 * Minimal Paystack API client (server-side only; the secret key never leaves here).
 * https://paystack.com/docs/api/
 */
import crypto from 'node:crypto';
import { env } from '../env';

export class PaystackError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
  }
}

interface PaystackEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
}

async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  if (!env.PAYSTACK_SECRET_KEY) throw new PaystackError('Paystack is not configured', 500);
  const res = await fetch(`${env.PAYSTACK_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => null)) as PaystackEnvelope<T> | null;
  if (!res.ok || !json?.status) {
    const message = json?.message ?? `Paystack ${method} ${path} failed with ${res.status}`;
    // Every Paystack error is logged (without secrets) for debugging.
    console.error('[paystack]', method, path, res.status, message);
    throw new PaystackError(message, res.status, json);
  }
  return json.data;
}

export interface InitializeParams {
  email: string;
  /** In pesewas. Ignored by Paystack when `plan` is set (the plan's amount is used). */
  amount: number;
  reference: string;
  currency: 'GHS';
  channels: string[];
  callback_url: string;
  plan?: string;
  metadata: Record<string, unknown>;
}

export const initializeTransaction = (p: InitializeParams) =>
  call<{ authorization_url: string; access_code: string; reference: string }>('POST', '/transaction/initialize', p);

export interface PaystackTransaction {
  id: number;
  status: 'success' | 'failed' | 'abandoned' | 'ongoing' | 'pending' | 'processing' | 'queued' | 'reversed';
  reference: string;
  amount: number;
  currency: string;
  channel: string | null;
  paid_at: string | null;
  gateway_response: string | null;
  customer: { email: string; customer_code: string };
  plan?: string | { plan_code?: string } | null;
  metadata?: Record<string, unknown> | string | null;
}

export const verifyTransaction = (reference: string) =>
  call<PaystackTransaction>('GET', `/transaction/verify/${encodeURIComponent(reference)}`);

export const createPlan = (p: { name: string; amount: number; interval: 'monthly'; currency: 'GHS'; description?: string }) =>
  call<{ plan_code: string; name: string; amount: number }>('POST', '/plan', p);

/** A one-time link to Paystack's page where the donor can update their card or cancel. */
export const subscriptionManageLink = (code: string) =>
  call<{ link: string }>('GET', `/subscription/${encodeURIComponent(code)}/manage/link`);

/** x-paystack-signature is HMAC-SHA512 of the raw request body with the secret key. */
export function isValidSignature(rawBody: Buffer, signature: string | undefined) {
  if (!signature || !env.PAYSTACK_SECRET_KEY) return false;
  const expected = crypto.createHmac('sha512', env.PAYSTACK_SECRET_KEY).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
