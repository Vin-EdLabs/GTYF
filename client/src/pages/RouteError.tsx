import { useEffect } from 'react';
import { useRouteError } from 'react-router-dom';

/**
 * Last-resort error screen. Deliberately self-contained (no site context,
 * no motion) so it still renders when something higher up has failed.
 */
export function RouteError() {
  const error = useRouteError();
  useEffect(() => console.error(error), [error]);
  return (
    <main className="grid min-h-svh place-items-center bg-mist px-5">
      <div className="w-full max-w-lg rounded-card bg-white p-8 shadow-soft">
        <p className="label text-slate">Something went wrong</p>
        <h1 className="mt-3 text-[1.75rem] leading-8 font-bold">Sorry, this page didn’t load.</h1>
        <p className="mt-4 text-slate">Please try again. If you were in the middle of giving, no payment was taken unless you received a receipt.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={() => window.location.reload()} className="h-12 rounded-full bg-lantern px-6 font-semibold text-ink">
            Try again
          </button>
          <a href="/" className="inline-flex h-12 items-center rounded-full border-[1.5px] border-ink/20 px-6 font-semibold">
            Home page
          </a>
        </div>
      </div>
    </main>
  );
}
