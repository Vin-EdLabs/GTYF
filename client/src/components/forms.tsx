/**
 * Form building blocks: accessible fields with inline errors, and a submit
 * hook that validates with the same zod schema the server uses.
 */
import { useId, useRef, useState, type FormEvent, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { z } from 'zod';
import type { FieldErrors } from '@gtyf/shared/forms';
import { api, ApiError } from '../lib/api';
import { Button } from './ui/Button';

type Status = 'idle' | 'sending' | 'done' | 'error';

/**
 * Validates FormData against `schema`, posts JSON to `endpoint`, and exposes
 * field errors. The honeypot field `website` is sent untouched for the server to check.
 */
export function useFormSubmit<S extends z.ZodType>(schema: S, endpoint: string, toInput: (fd: FormData) => unknown) {
  const [status, setStatus] = useState<Status>('idle');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const focusFirstError = (errs: FieldErrors) => {
    const first = Object.keys(errs).find((k) => errs[k]?.length);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input = toInput(fd);
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      const errs = z.flattenError(parsed.error).fieldErrors as FieldErrors;
      setErrors(errs);
      setStatus('error');
      setMessage('Please check the highlighted fields.');
      focusFirstError(errs);
      return;
    }
    setErrors({});
    setStatus('sending');
    try {
      await api(endpoint, { method: 'POST', json: { ...(input as object), website: fd.get('website') ?? '' } });
      setStatus('done');
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      setErrors(apiErr?.fieldErrors ?? {});
      setMessage(apiErr?.message ?? 'Something went wrong. Please try again.');
      setStatus('error');
      if (apiErr?.fieldErrors) focusFirstError(apiErr.fieldErrors);
    }
  }

  return { status, errors, message, onSubmit, formRef };
}

/** Reads optional text fields as undefined when blank. */
export const text = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === 'string' && v.trim() ? v : undefined;
};

const inputClass =
  'w-full rounded-2xl border-[1.5px] border-ink/15 bg-white px-4 py-3.5 text-base text-ink outline-none transition-colors duration-300 ' +
  'placeholder:text-slate/60 focus:border-ink aria-[invalid=true]:border-margin';

interface FieldProps {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  errors?: FieldErrors;
}

function FieldShell({ id, label, hint, required, error, children }: { id: string; label: string; hint?: string; required?: boolean; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block font-semibold">
        {label}
        {!required && <span className="ml-1.5 font-normal text-slate">(optional)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-2 text-sm text-slate">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-2 text-sm font-medium text-margin">
          {error}
        </p>
      )}
    </div>
  );
}

const describedBy = (id: string, hint?: string, error?: string) =>
  [error ? `${id}-error` : null, hint && !error ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;

export function TextField({ name, label, hint, required, errors, ...rest }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const error = errors?.[name]?.[0];
  return (
    <FieldShell id={id} label={label} hint={hint} required={required} error={error}>
      <input
        id={id}
        name={name}
        required={required}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, hint, error)}
        className={inputClass}
        {...rest}
      />
    </FieldShell>
  );
}

export function TextArea({ name, label, hint, required, errors, ...rest }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  const error = errors?.[name]?.[0];
  return (
    <FieldShell id={id} label={label} hint={hint} required={required} error={error}>
      <textarea
        id={id}
        name={name}
        required={required}
        rows={5}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, hint, error)}
        className={`${inputClass} resize-y`}
        {...rest}
      />
    </FieldShell>
  );
}

export function SelectField({ name, label, hint, required, errors, options }: FieldProps & { options: readonly string[] }) {
  const id = useId();
  const error = errors?.[name]?.[0];
  return (
    <FieldShell id={id} label={label} hint={hint} required={required} error={error}>
      <select
        id={id}
        name={name}
        required={required}
        defaultValue=""
        aria-invalid={!!error}
        aria-describedby={describedBy(id, hint, error)}
        className={`${inputClass} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><path d=%22M4 6l4 4 4-4%22 fill=%22none%22 stroke=%22%230B1422%22 stroke-width=%221.75%22/></svg>')] bg-[length:1rem] bg-[right_1rem_center] bg-no-repeat pr-10`}
      >
        <option value="" disabled>
          Choose one
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function CheckboxGroup({ name, label, options, errors }: { name: string; label: string; options: readonly string[]; errors?: FieldErrors }) {
  const error = errors?.[name]?.[0];
  return (
    <fieldset>
      <legend className="mb-3 font-semibold">
        {label} <span className="font-normal text-slate">(optional)</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o} className="cursor-pointer">
            <input type="checkbox" name={name} value={o} className="peer sr-only" />
            <span className="inline-block rounded-full border-[1.5px] border-ink/15 px-4 py-2 text-[0.9375rem] font-medium transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lantern hover:border-ink">
              {o}
            </span>
          </label>
        ))}
      </div>
      {error && <p className="mt-2 text-sm font-medium text-margin">{error}</p>}
    </fieldset>
  );
}

/** Hidden field bots fill in and people never see. */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}

export function FormFooter({ status, message, submitLabel }: { status: Status; message: string; submitLabel: string }) {
  return (
    <div className="flex flex-col items-start gap-4 pt-2">
      <Button type="submit" size="lg" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : submitLabel}
      </Button>
      <p role="alert" className="min-h-6 text-sm font-medium text-margin">
        {status === 'error' ? message : ''}
      </p>
    </div>
  );
}

/** Replaces a form once it's sent. */
export function FormSuccess({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="flex items-start gap-4 rounded-card bg-white p-7 shadow-soft ring-1 ring-ink/[0.06]">
      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-lantern text-lg font-bold text-ink">✓</span>
      <p className="pt-1 font-display text-[1.375rem] leading-snug font-semibold tracking-display">{children}</p>
    </div>
  );
}
