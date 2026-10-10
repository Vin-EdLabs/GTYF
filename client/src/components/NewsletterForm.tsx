import { useId, useState, type FormEvent } from 'react';
import { api, ApiError } from '../lib/api';
import { useSite } from '../lib/site';

interface Props {
  /** Where the signup came from, for the admin inbox. */
  source: string;
  successMessage: string;
  tone?: 'dark' | 'light';
}

type State = { kind: 'idle' } | { kind: 'sending' } | { kind: 'done' } | { kind: 'error'; message: string };

export function NewsletterForm({ source, successMessage, tone = 'light' }: Props) {
  const { common } = useSite();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });
  const inputId = useId();
  const errorId = useId();
  const dark = tone === 'dark';

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const website = (new FormData(e.currentTarget).get('website') as string) ?? '';
    setState({ kind: 'sending' });
    try {
      await api('/forms/newsletter', { method: 'POST', json: { email, source, website } });
      setState({ kind: 'done' });
    } catch (err) {
      const message =
        err instanceof ApiError ? (err.fieldErrors?.email?.[0] ?? err.message) : 'Could not connect. Please try again.';
      setState({ kind: 'error', message });
    }
  }

  if (state.kind === 'done') {
    return (
      <div role="status" className={`flex w-full max-w-md items-center gap-4 rounded-full p-2 pr-6 ${dark ? 'bg-white/10 ring-1 ring-white/15' : 'bg-white shadow-soft ring-1 ring-ink/10'}`}>
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-lantern text-ink">
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path className="check-draw" d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
        <p className={`min-w-0 font-semibold ${dark ? 'text-white' : 'text-ink'}`}>{successMessage}</p>
      </div>
    );
  }

  const failed = state.kind === 'error';
  return (
    <form onSubmit={onSubmit} noValidate className="w-full max-w-md">
      <div
        className={`group flex items-center gap-1 rounded-full p-1.5 pl-5 transition-all duration-300 focus-within:ring-4 ${
          failed ? 'ring-2 ring-margin focus-within:ring-margin/30' : dark ? 'ring-1 ring-white/20 focus-within:ring-lantern/50' : 'ring-1 ring-ink/15 focus-within:ring-ink/20'
        } ${dark ? 'bg-white/[0.07] focus-within:bg-white/10' : 'bg-white shadow-soft'}`}
      >
        <svg viewBox="0 0 24 24" className={`size-5 shrink-0 transition-colors group-focus-within:text-lantern ${dark ? 'text-white/50' : 'text-slate'}`} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="M3.5 7.5l8.5 6 8.5-6" />
        </svg>
        <label htmlFor={inputId} className="sr-only">
          Email address
        </label>
        <input
          id={inputId}
          type="email"
          name="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder={common.newsletterPlaceholder}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (failed) setState({ kind: 'idle' });
          }}
          aria-invalid={failed}
          aria-describedby={failed ? errorId : undefined}
          className={`h-11 min-w-0 flex-1 bg-transparent px-1 text-base outline-none ${dark ? 'text-white placeholder:text-white/45' : 'text-ink placeholder:text-slate/70'}`}
        />
        {/* Honeypot: hidden from people, irresistible to bots. */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        <button
          type="submit"
          disabled={state.kind === 'sending'}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-lantern px-5 text-[0.9375rem] font-bold text-ink transition-all duration-300 hover:brightness-105 active:scale-95 disabled:opacity-70"
        >
          {state.kind === 'sending' ? common.joiningLabel : common.joinList}
          {state.kind !== 'sending' && (
            <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          )}
        </button>
      </div>
      {failed && (
        <p id={errorId} role="alert" className={`mt-3 pl-5 text-sm font-medium ${dark ? 'text-[#ff8a82]' : 'text-margin'}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
