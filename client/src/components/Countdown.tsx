import { useEffect, useState } from 'react';

/** Target moment in Ghana time (GMT, no daylight saving), e.g. "2026-10-14" + "09:00:00". */
const target = (date: string, time: string | null) => new Date(`${date}T${time ?? '08:00:00'}Z`).getTime();

const UNITS = [
  ['days', 86_400_000],
  ['hrs', 3_600_000],
  ['min', 60_000],
  ['sec', 1_000],
] as const;

/**
 * Live countdown to an event. Rendered only in the browser (the prerendered
 * page shows the date instead), and announced politely rather than every second.
 */
export function Countdown({ date, time, tone = 'light' }: { date: string; time: string | null; tone?: 'dark' | 'light' }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (now === null) return null;
  let left = Math.max(0, target(date, time) - now);
  if (left === 0) return <p className="label text-lantern">Happening now</p>;

  const parts = UNITS.map(([label, ms]) => {
    const n = Math.floor(left / ms);
    left -= n * ms;
    return { label, n };
  });
  const dark = tone === 'dark';

  return (
    <div role="timer" aria-label={`Starts in ${parts[0]!.n} days`} className="flex gap-2 sm:gap-3">
      {parts.map(({ label, n }) => (
        <div
          key={label}
          className={`min-w-[4.25rem] rounded-2xl px-3 py-3 text-center ${dark ? 'bg-white/8 text-white' : 'bg-white text-ink shadow-soft'}`}
        >
          <span aria-hidden="true" className="block font-display text-3xl font-bold tabular-nums sm:text-4xl">
            {String(n).padStart(2, '0')}
          </span>
          <span aria-hidden="true" className={`label mt-1 block ${dark ? 'text-white/55' : 'text-slate'}`}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
