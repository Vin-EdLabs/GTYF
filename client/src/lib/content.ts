import { useEffect, useState } from 'react';
import { useLoaderData } from 'react-router-dom';

/**
 * Content loading.
 *
 * Route loaders call `fetchContent`. During the build (SSR) that hits the API
 * directly, so every prerendered page ships with real content in its HTML.
 * In the browser the prerendered data is shown instantly, then `useContent`
 * quietly refetches so admin edits appear without waiting for a rebuild.
 */

// The build talks to the API directly; the browser goes through /api on the same origin.
const SSR_API_ORIGIN =
  (import.meta.env.SSR && typeof process !== 'undefined' && process.env.CONTENT_API_URL) || 'http://localhost:4000';

export async function fetchContent<T>(path: string): Promise<T | null> {
  const base = import.meta.env.SSR ? SSR_API_ORIGIN : '';
  const res = await fetch(`${base}/api${path}`, { headers: { Accept: 'application/json' } });
  if (res.status === 404) return null;
  if (!res.ok) {
    // At build time this fails the build on purpose: better no deploy than empty pages.
    throw new Error(`Content request failed: ${res.status} ${path}`);
  }
  return (await res.json()) as T;
}

/** True when this page load was served from prerendered HTML (so loader data may be stale). */
let prerendered: boolean | undefined;
const wasPrerendered = () => {
  if (typeof document === 'undefined') return false;
  prerendered ??= document.querySelector('[data-server-rendered="true"]') !== null;
  return prerendered;
};

export interface ContentState<T> {
  data: T | null;
  /** True while fetching content that wasn't prerendered (e.g. a brand-new event). */
  loading: boolean;
}

/**
 * Data for the current route: the loader's (prerendered) data first, then
 * refreshed from the API in the browser.
 */
/** Admins open drafts with ?preview=1; the API only honours it for a signed-in admin. */
const isPreviewVisit = () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview') === '1';

export function useContent<T>(requestedPath: string): ContentState<T> {
  const preview = isPreviewVisit();
  const path = preview ? `${requestedPath}?preview=1` : requestedPath;
  const initial = useLoaderData() as T | null | undefined;
  const [state, setState] = useState<{ path: string; data: T | null; loading: boolean }>({
    path,
    data: initial ?? null,
    loading: initial == null,
  });

  // Client-side navigation to a new path: adopt the new loader data immediately.
  if (state.path !== path) {
    setState({ path, data: initial ?? null, loading: initial == null });
  }

  useEffect(() => {
    if (initial != null && !wasPrerendered() && !preview) return; // loader just ran live: already fresh
    let cancelled = false;
    fetchContent<T>(path)
      .then((data) => !cancelled && setState({ path, data, loading: false }))
      .catch(() => !cancelled && setState((s) => ({ ...s, loading: false })));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  return { data: state.data, loading: state.loading };
}
