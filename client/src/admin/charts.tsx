/**
 * Admin charts. One series each, so one hue (brand blue #3D6FD6, validated
 * for 3:1 contrast on white; the lantern yellow is not). Thin columns with a
 * rounded data-end, square at the baseline; value on hover; a hidden table
 * for screen readers. Text never uses the bar colour.
 */
import { useState } from 'react';
import { formatCedis } from '@gtyf/shared';

const BAR = '#3D6FD6';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (ym: string) => MONTHS[Number(ym.slice(5, 7)) - 1]!;
const monthLong = (ym: string) => `${monthLabel(ym)} ${ym.slice(0, 4)}`;

/** Compact cedis for axis/labels: GH₵ 1.2k */
const compact = (pesewas: number) => {
  const c = pesewas / 100;
  return c >= 1000 ? `GH₵ ${(c / 1000).toFixed(c >= 10000 ? 0 : 1)}k` : `GH₵ ${Math.round(c)}`;
};

export function IncomeByMonth({ data }: { data: { month: string; amount: number; gifts: number }[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.amount), 1);
  const H = 180;
  const last = data.length - 1;
  const shown = active ?? last;

  return (
    <figure>
      <figcaption className="sr-only">Money raised each month over the last 12 months</figcaption>
      {/* Readout: the hovered month, or the latest month by default */}
      <p className="mb-4 min-h-12" aria-live="polite">
        <span className="block text-sm text-slate">{monthLong(data[shown]!.month)}</span>
        <span className="font-display text-2xl font-bold">{formatCedis(data[shown]!.amount)}</span>
        <span className="ml-2 text-sm text-slate">
          {data[shown]!.gifts} gift{data[shown]!.gifts === 1 ? '' : 's'}
        </span>
      </p>
      <div className="relative" style={{ height: H + 24 }} onMouseLeave={() => setActive(null)}>
        {/* Recessive gridline at the max */}
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-ink/10" aria-hidden="true">
          <span className="absolute -top-2.5 left-0 bg-white pr-1 text-[0.6875rem] text-slate">{compact(max)}</span>
        </div>
        <div className="absolute inset-x-0 border-t border-ink/15" style={{ top: H }} aria-hidden="true" />
        <div className="absolute inset-x-0 top-0 grid h-full grid-cols-12" aria-hidden="true">
          {data.map((d, i) => {
            const h = d.amount ? Math.max(4, (d.amount / max) * H) : 0;
            return (
              <button
                key={d.month}
                type="button"
                tabIndex={-1}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                className="group relative flex h-full flex-col items-center"
              >
                <span className="relative w-full flex-none" style={{ height: H }}>
                  <span
                    className="absolute bottom-0 left-1/2 w-[min(60%,24px)] -translate-x-1/2 rounded-t-[4px] transition-opacity"
                    style={{ height: h, background: BAR, opacity: active === null || active === i ? 1 : 0.45 }}
                  />
                </span>
                <span className={`mt-1.5 text-[0.6875rem] ${i === shown ? 'font-semibold text-ink' : 'text-slate'}`}>{monthLabel(d.month)}</span>
              </button>
            );
          })}
        </div>
      </div>
      <table className="sr-only">
        <thead>
          <tr>
            <th>Month</th>
            <th>Raised</th>
            <th>Gifts</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.month}>
              <td>{monthLong(d.month)}</td>
              <td>{formatCedis(d.amount)}</td>
              <td>{d.gifts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Horizontal bars by cause, value at the bar tip. */
export function IncomeByCause({ data }: { data: { cause: string; amount: number; gifts: number }[] }) {
  if (!data.length) return <p className="text-slate">No gifts yet.</p>;
  const max = Math.max(...data.map((d) => d.amount), 1);
  return (
    <ul className="space-y-4">
      {data.map((d) => (
        <li key={d.cause}>
          <div className="flex items-baseline justify-between gap-3 text-[0.9375rem]">
            <span className="min-w-0 truncate font-medium">{d.cause}</span>
            <span className="shrink-0 font-semibold">{formatCedis(d.amount)}</span>
          </div>
          <div className="mt-1.5 h-3 rounded-full bg-ink/[0.06]" aria-hidden="true">
            <div className="h-full rounded-full" style={{ width: `${Math.max(2, (d.amount / max) * 100)}%`, background: BAR }} />
          </div>
          <p className="mt-1 text-xs text-slate">
            {d.gifts} gift{d.gifts === 1 ? '' : 's'}
          </p>
        </li>
      ))}
    </ul>
  );
}
