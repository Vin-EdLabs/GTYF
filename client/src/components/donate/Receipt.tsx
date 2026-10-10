import { forwardRef } from 'react';
import { fillTemplate, formatCedis, formatDate } from '@gtyf/shared';
import type { DonationReceipt } from '@gtyf/shared/donations';
import { useSite } from '../../lib/site';

const channelLabel = (c: string | null) =>
  c === 'mobile_money' ? 'Mobile Money' : c === 'card' ? 'Card' : c === 'bank' || c === 'bank_transfer' ? 'Bank' : 'Paystack';

/**
 * The donor's receipt: a clean page with faint exercise-book lines, the logo,
 * their name, the amount, the details and a thank-you note, finished with a
 * "PAID" stamp and a perforated tear-off edge.
 */
export const Receipt = forwardRef<HTMLElement, { r: DonationReceipt; orgName: string }>(function Receipt({ r, orgName }, ref) {
  // Wording is editable in Admin → Website → Donation & thank-you text.
  const { thanks } = useSite();
  const monthly = r.frequency === 'monthly';
  const impactText = (r.impactSummary ?? '').replace(/^.*?=\s*/, '');
  const rows: [string, string][] = [
    ['Receipt no.', r.reference],
    ['Date', r.paidAt ? formatDate(r.paidAt) : ''],
    ['Cause', r.causeName],
    ['Paid by', channelLabel(r.channel)],
    ...(r.fee ? ([['Fees covered', formatCedis(r.fee, { decimals: true })]] as [string, string][]) : []),
  ];

  return (
    <article
      ref={ref}
      tabIndex={-1}
      aria-label="Your donation receipt"
      className="receipt-paper relative mx-auto w-full max-w-md overflow-hidden rounded-t-[24px] bg-white text-ink shadow-[0_30px_70px_-30px_rgb(11_20_34/0.45)] outline-none"
    >
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-ink/[0.07] bg-white px-6 py-5">
        <img src="/brand/logo-mark.png" alt="" width={48} height={48} className="size-12 rounded-full ring-1 ring-ink/10" />
        <div className="min-w-0">
          <p className="truncate font-display text-base leading-tight font-bold">{orgName}</p>
          <p className="text-sm text-slate">{thanks.receiptTitle}</p>
        </div>
      </header>

      <div className="relative px-6 pt-6 pb-10">
        {/* "Paid" stamp */}
        <div
          aria-hidden="true"
          className="absolute top-5 right-5 grid size-[6rem] rotate-[-14deg] place-items-center rounded-full border-[3px] border-[#1F9D55]/70 text-center font-display leading-none font-extrabold text-[#1F9D55]/80"
        >
          <span>
            <span className="block text-lg tracking-wider">PAID</span>
            <span className="mt-1 block text-[0.5rem] font-bold tracking-[0.12em]">WITH THANKS</span>
          </span>
        </div>

        <p className="text-sm font-medium text-slate">{thanks.receivedFrom}</p>
        <p className="mt-1 max-w-[70%] font-display text-[1.625rem] leading-tight font-bold break-words">{r.donorName}</p>

        <div className="mt-6">
          <p className="text-sm font-medium text-slate">{monthly ? 'Monthly gift' : 'Gift'}</p>
          <p className="font-display text-[2.75rem] leading-none font-extrabold tracking-display">
            {formatCedis(r.amount, { decimals: true })}
            {monthly && <span className="text-lg font-bold text-slate"> /month</span>}
          </p>
          {r.fee > 0 && <p className="mt-1 text-sm text-slate">Total paid {formatCedis(r.total, { decimals: true })}</p>}
        </div>

        <dl className="mt-6 divide-y divide-dashed divide-ink/15 border-y border-dashed border-ink/15">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-[0.9375rem] text-slate">{k}</dt>
              <dd className="min-w-0 text-right text-[0.9375rem] font-semibold break-words">{v}</dd>
            </div>
          ))}
        </dl>

        {impactText && (
          <div className="mt-6 rounded-2xl bg-[#FFF6E0] p-4">
            <p className="text-[0.8125rem] font-bold tracking-wide text-[#7A4F00] uppercase">Your gift provides</p>
            <p className="mt-1 font-display text-xl leading-snug font-bold">
              {impactText}
              {monthly ? ' every month' : ''}
            </p>
          </div>
        )}

        {r.dedication && (
          <p className="mt-4 text-[0.9375rem] text-slate">
            Given {r.dedication.type === 'honour' ? 'in honour of' : 'in memory of'} <strong className="text-ink">{r.dedication.name}</strong>
          </p>
        )}

        <div className="mt-7">
          <p className="text-[1.0625rem] leading-relaxed">
            {fillTemplate(thanks.message, { name: r.firstName, org: orgName })}
          </p>
          <p className="mt-4 font-display text-lg font-bold">{fillTemplate(thanks.signOff, { name: r.firstName, org: orgName })}</p>
        </div>
      </div>

      {/* Perforated tear-off edge */}
      <div aria-hidden="true" className="receipt-perforation h-4 w-full" />
    </article>
  );
});
