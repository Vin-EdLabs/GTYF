import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { useAdminAuth } from '../auth';
import { AdminButton, Input, Notice, PasswordInput } from '../ui';

export default function Login() {
  const { signIn } = useAdminAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      const next = params.get('next');
      navigate(next && next.startsWith('/admin') && next !== '/admin/login' ? next : '/admin', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in. Please try again.');
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-svh place-items-center bg-mist px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <img src="/brand/logo-full.png" alt="Guide The Youth Foundation" width={120} height={120} className="mx-auto size-28 rounded-3xl bg-white p-1 shadow-soft" />
          <h1 className="mt-6 font-display text-3xl font-bold tracking-display">Admin sign in</h1>
          <p className="mt-2 text-slate">For Guide The Youth Foundation staff.</p>
        </div>
        <form onSubmit={onSubmit} className="mt-8 space-y-5 rounded-3xl bg-white p-6 shadow-soft" noValidate>
          <Input label="Email" name="email" type="email" inputMode="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <PasswordInput label="Password" name="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <Notice kind="error">{error}</Notice>}
          <AdminButton type="submit" className="w-full" disabled={busy || !email || !password}>
            {busy ? 'Signing in…' : 'Sign in'}
          </AdminButton>
        </form>
        <p className="mt-6 text-center text-sm text-slate">
          Forgot your password? Ask a super admin to reset it.
        </p>
      </div>
    </main>
  );
}
