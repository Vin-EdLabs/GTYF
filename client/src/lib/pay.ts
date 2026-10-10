import type { DonationInitInput, DonationInitResponse } from '@gtyf/shared/donations';
import { api } from './api';

export type PayOutcome =
  | { kind: 'success'; reference: string; receiptToken: string }
  | { kind: 'cancelled' }
  | { kind: 'error'; message: string };

const LAST_KEY = 'gtyf:last-donation';

/** Remember the in-flight donation so the thank-you page can find it after a redirect. */
export function rememberDonation(reference: string, receiptToken: string) {
  try {
    sessionStorage.setItem(LAST_KEY, JSON.stringify({ reference, receiptToken }));
  } catch {
    /* private mode: the URL carries the same data */
  }
}

export function lastDonation(): { reference: string; receiptToken: string } | null {
  try {
    return JSON.parse(sessionStorage.getItem(LAST_KEY) ?? 'null');
  } catch {
    return null;
  }
}

/**
 * Create the donation on our server (which talks to Paystack with the secret
 * key), then open Paystack's popup with the returned access code. The donor
 * never leaves the page. Paystack's script is loaded only now, not on page load.
 */
export async function startPayment(input: DonationInitInput): Promise<PayOutcome> {
  const init = await api<DonationInitResponse>('/donations/initialize', { method: 'POST', json: input });
  rememberDonation(init.reference, init.receiptToken);

  const { default: PaystackPop } = await import('@paystack/inline-js');
  return new Promise<PayOutcome>((resolve) => {
    const popup = new PaystackPop();
    popup.resumeTransaction(init.accessCode, {
      onSuccess: () => resolve({ kind: 'success', reference: init.reference, receiptToken: init.receiptToken }),
      onCancel: () => resolve({ kind: 'cancelled' }),
      onError: (e: { message?: string }) =>
        resolve({ kind: 'error', message: e?.message ?? 'The payment window could not open. Please try again.' }),
    });
  });
}
