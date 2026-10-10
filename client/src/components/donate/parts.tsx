/**
 * Small, tactile pieces of the donation card.
 */
import { useId, type ReactNode } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { CURRENCY_SYMBOL } from '@gtyf/shared';
import type { ImpactIcon as IconKey } from '@gtyf/shared';
import { EASE } from '../../lib/motion';
import { ImpactIcon } from '../icons/ImpactIcon';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** Big amount whose digits roll like an odometer when it changes. */
export function AnimatedAmount({ pesewas, className = '' }: { pesewas: number; className?: string }) {
  const reduce = useReducedMotion();
  const cedis = pesewas / 100;
  const text = cedis.toLocaleString('en-GH', { maximumFractionDigits: 2, minimumFractionDigits: Number.isInteger(cedis) ? 0 : 2 });
  const chars = text.split('');
  return (
    <span className={`inline-flex items-baseline font-display font-extrabold tracking-display tabular-nums ${className}`}>
      <span className="sr-only" aria-live="polite">
        {CURRENCY_SYMBOL} {text}
      </span>
      <span aria-hidden="true" className="mr-2 text-[0.42em] font-bold text-slate">
        {CURRENCY_SYMBOL}
      </span>
      <span aria-hidden="true" className="inline-flex">
        {chars.map((c, i) => {
          // Key from the right so units stay units when the number grows.
          const key = chars.length - i;
          if (!/\d/.test(c)) return <span key={`s${key}`}>{c}</span>;
          return (
            <span key={`d${key}`} className="relative inline-block h-[1em] overflow-hidden leading-none">
              <span
                className="flex flex-col"
                style={{
                  transform: `translateY(-${Number(c) * 10}%)`,
                  transition: reduce ? 'none' : 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                {DIGITS.map((d) => (
                  <span key={d} className="h-[1em] leading-none">
                    {d}
                  </span>
                ))}
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}

/** Line illustrations that stack up with a spring as the amount grows. */
export function ImpactStack({ icons, overflow }: { icons: IconKey[]; overflow: number }) {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden="true" className="flex min-h-12 flex-wrap items-end gap-1.5">
      <AnimatePresence initial={false} mode="popLayout">
        {icons.map((icon, i) => (
          <m.span
            key={`${icon}-${i}`}
            layout={!reduce}
            initial={reduce ? false : { opacity: 0, y: 14, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 520, damping: 26, delay: reduce ? 0 : Math.min(i, 8) * 0.025 }}
            className="grid size-11 place-items-center rounded-xl bg-white text-ink shadow-soft"
          >
            <ImpactIcon name={icon} className="size-8" />
          </m.span>
        ))}
      </AnimatePresence>
      {overflow > 0 && <span className="label self-center pl-1 text-slate">+{overflow}</span>}
    </div>
  );
}

/** Segmented control with a sliding highlight (Framer Motion layoutId). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  size?: 'md' | 'lg';
}) {
  const id = useId();
  const reduce = useReducedMotion();
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col rounded-full bg-ink/[0.06] p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
              e.preventDefault();
              const i = options.findIndex((x) => x.value === value);
              const next = options[(i + (e.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length]!;
              onChange(next.value);
            }}
            tabIndex={active ? 0 : -1}
            className={`relative rounded-full px-3 font-semibold transition-colors duration-300 ${size === 'lg' ? 'h-12' : 'h-11'} ${
              active ? 'text-ink' : 'text-ink/55 hover:text-ink'
            }`}
          >
            {active && (
              <m.span
                layoutId={`seg-${id}`}
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 38 }}
                className="absolute inset-0 rounded-full bg-white shadow-soft"
              />
            )}
            <span className="relative inline-flex items-center gap-2">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Accessible on/off switch with a description line. */
export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <label htmlFor={id} className="flex-1 cursor-pointer">
        <span className="block font-semibold">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-slate">{description}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-8 w-[3.25rem] shrink-0 rounded-full transition-colors duration-300 ${checked ? 'bg-ink' : 'bg-ink/15'}`}
      >
        <span
          className={`absolute top-1 left-1 size-6 rounded-full bg-white shadow transition-transform duration-300 ease-guide ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </div>
  );
}

/** Row in the review summary. */
export function SummaryRow({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3.5">
      <dt className="text-[0.9375rem] text-slate">{label}</dt>
      <dd className={`min-w-0 truncate text-right ${strong ? 'font-display text-xl font-bold' : 'font-semibold'}`}>{value}</dd>
    </div>
  );
}

export const fadeStep = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE } },
  exit: { opacity: 0, x: -24, transition: { duration: 0.2, ease: EASE } },
};
