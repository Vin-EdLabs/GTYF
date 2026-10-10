/**
 * Admin UI building blocks. Plain, readable and thumb-friendly: staff will
 * often use the admin on a phone.
 */
import { useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import type { DonationStatus } from '@gtyf/shared';
import type { FieldErrors } from '@gtyf/shared/forms';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`min-w-0 rounded-3xl bg-white p-5 shadow-[0_1px_2px_rgb(11_20_34/0.05),0_8px_24px_-12px_rgb(11_20_34/0.12)] ring-1 ring-ink/[0.05] sm:p-6 ${className}`}>{children}</section>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-[1.875rem] leading-tight font-bold tracking-display sm:text-[2.25rem]">{title}</h1>
        {subtitle && <p className="mt-1 text-slate">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

const STATUS: Record<DonationStatus, { label: string; cls: string; icon: string }> = {
  success: { label: 'Paid', cls: 'bg-[#E7F6EC] text-[#166534]', icon: '✓' },
  pending: { label: 'Pending', cls: 'bg-[#FFF4D6] text-[#7A4F00]', icon: '…' },
  failed: { label: 'Failed', cls: 'bg-[#FDECEA] text-[#9B2C22]', icon: '✕' },
  abandoned: { label: 'Not completed', cls: 'bg-ink/[0.06] text-slate', icon: '–' },
  reversed: { label: 'Refunded', cls: 'bg-[#EEF1FB] text-[#2F4FA8]', icon: '↺' },
};

/** Status is always icon + word, never colour alone. */
export function StatusBadge({ status }: { status: DonationStatus }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.8125rem] font-semibold whitespace-nowrap ${s.cls}`}>
      <span aria-hidden="true">{s.icon}</span>
      {s.label}
    </span>
  );
}
export const statusLabel = (s: DonationStatus) => STATUS[s].label;

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-ink/90',
  secondary: 'bg-white text-ink ring-1 ring-ink/15 hover:ring-ink/40',
  danger: 'bg-white text-margin ring-1 ring-margin/30 hover:bg-margin/5',
  ghost: 'text-slate hover:bg-ink/5 hover:text-ink',
};

export function AdminButton({
  variant = 'primary',
  className = '',
  children,
  type = 'button',
  ...rest
}: { variant?: Variant; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-[0.9375rem] font-semibold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

const inputCls =
  'h-12 w-full rounded-2xl border-[1.5px] border-ink/15 bg-white px-4 text-base outline-none transition-colors focus:border-ink aria-[invalid=true]:border-margin';

function FieldShell({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[0.9375rem] font-semibold">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-sm font-medium text-margin">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-slate">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ label, hint, name, errors, ...rest }: { label: string; hint?: string; name: string; errors?: FieldErrors } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const error = errors?.[name]?.[0];
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input id={id} name={name} aria-invalid={!!error} aria-describedby={hint ? `${id}-hint` : undefined} className={inputCls} {...rest} />
    </FieldShell>
  );
}

/** Password field with a show/hide toggle (easier to type correctly on a phone). */
export function PasswordInput({ label, hint, name, errors, ...rest }: { label: string; hint?: string; name: string; errors?: FieldErrors } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const [show, setShow] = useState(false);
  const error = errors?.[name]?.[0];
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <div className="relative">
        <input id={id} name={name} type={show ? 'text' : 'password'} aria-invalid={!!error} className={`${inputCls} pr-20`} {...rest} />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute top-1/2 right-2 h-9 -translate-y-1/2 rounded-full px-3 text-sm font-semibold text-slate hover:bg-ink/5 hover:text-ink"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
    </FieldShell>
  );
}

export function Select({ label, hint, name, errors, children, ...rest }: { label: string; hint?: string; name: string; errors?: FieldErrors; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  const error = errors?.[name]?.[0];
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <select id={id} name={name} aria-invalid={!!error} className={`${inputCls} appearance-none`} {...rest}>
        {children}
      </select>
    </FieldShell>
  );
}

export function TextArea({ label, hint, name, errors, ...rest }: { label: string; hint?: string; name: string; errors?: FieldErrors } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  const error = errors?.[name]?.[0];
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <textarea id={id} name={name} rows={4} aria-invalid={!!error} className={`${inputCls} h-auto resize-y py-3`} {...rest} />
    </FieldShell>
  );
}

export function Notice({ kind = 'info', children }: { kind?: 'info' | 'error' | 'success'; children: ReactNode }) {
  const cls = kind === 'error' ? 'bg-margin/10 text-margin' : kind === 'success' ? 'bg-[#E7F6EC] text-[#166534]' : 'bg-mist text-ink';
  return (
    <p role={kind === 'error' ? 'alert' : 'status'} className={`rounded-2xl px-4 py-3 text-[0.9375rem] font-medium ${cls}`}>
      {children}
    </p>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="grid place-items-center py-16">
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="size-8 animate-spin rounded-full border-[3px] border-ink/10 border-t-ink" />
    </div>
  );
}

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
