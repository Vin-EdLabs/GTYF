import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AdminUser } from '@gtyf/shared/admin';
import { ApiError } from '../lib/api';

/** Admin API calls: same-origin, cookie session, friendly errors. */
export async function adminApi<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(`/api/admin${path}`, {
      ...rest,
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...rest.headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new ApiError(0, 'Could not connect. Check your internet and try again.');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('gtyf:signed-out'));
    throw new ApiError(res.status, body.error ?? 'Something went wrong. Please try again.', body.details);
  }
  return body as T;
}

interface AuthState {
  admin: AdminUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { admin } = await adminApi<{ admin: AdminUser }>('/auth/me');
      setAdmin(admin);
    } catch {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onSignedOut = () => setAdmin(null);
    window.addEventListener('gtyf:signed-out', onSignedOut);
    return () => window.removeEventListener('gtyf:signed-out', onSignedOut);
  }, [refresh]);

  const signIn = async (email: string, password: string) => {
    const { admin } = await adminApi<{ admin: AdminUser }>('/auth/login', { method: 'POST', json: { email, password } });
    setAdmin(admin);
  };
  const signOut = async () => {
    await adminApi('/auth/logout', { method: 'POST' }).catch(() => undefined);
    setAdmin(null);
  };

  return <AuthContext.Provider value={{ admin, loading, signIn, signOut, refresh }}>{children}</AuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAdminAuth outside AdminAuthProvider');
  return ctx;
}

/** Small data hook for admin screens: load, reload, and error state. */
export function useAdminData<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setLoading(true);
    adminApi<T>(path)
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError(null);
        }
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [path, tick]);

  return { data, setData, error, loading, reload: () => setTick((t) => t + 1) };
}
