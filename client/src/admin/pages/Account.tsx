import { Link } from 'react-router-dom';
import { useState, type FormEvent } from 'react';
import { ROLE_LABELS } from '@gtyf/shared/admin';
import type { FieldErrors } from '@gtyf/shared/forms';
import { ApiError } from '../../lib/api';
import { adminApi, useAdminAuth } from '../auth';
import { AdminButton, Card, Notice, PageHeader, PasswordInput } from '../ui';
import { InstallCard } from '../pwa';

export default function Account() {
  const { admin, signOut } = useAdminAuth();
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (!admin) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMsg(null);
    try {
      await adminApi('/auth/password', { method: 'POST', json: { currentPassword, newPassword } });
      setCurrent('');
      setNew('');
      setMsg({ kind: 'success', text: 'Password changed. You’re still signed in here; other devices have been signed out.' });
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setErrors(err.fieldErrors);
      setMsg({ kind: 'error', text: err instanceof Error ? err.message : 'Could not change the password.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Your account" />
      <InstallCard dismissible={false} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-slate">Name</dt>
              <dd className="font-semibold">{admin.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate">Sign-in email</dt>
              <dd className="font-semibold break-all">{admin.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate">Role</dt>
              <dd className="font-semibold">
                {ROLE_LABELS[admin.role].label} <span className="font-normal text-slate">· {ROLE_LABELS[admin.role].help}</span>
              </dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-2">
            {admin.role === 'super_admin' && (
              <Link to="/admin/admins" className="inline-flex h-12 items-center rounded-full bg-ink px-5 font-semibold text-white">
                Manage admins
              </Link>
            )}
            <a href="/" className="inline-flex h-12 items-center rounded-full bg-white px-5 font-semibold ring-1 ring-ink/15">
              View website
            </a>
            <AdminButton variant="secondary" onClick={signOut}>
              Sign out
            </AdminButton>
          </div>
        </Card>
        <Card>
          <h2 className="font-display text-lg font-bold">Change your password</h2>
          <form onSubmit={onSubmit} className="mt-4 space-y-4" noValidate>
            <PasswordInput label="Current password" name="currentPassword" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} errors={errors} />
            <PasswordInput label="New password" hint="At least 5 characters." name="newPassword" autoComplete="new-password" value={newPassword} onChange={(e) => setNew(e.target.value)} errors={errors} />
            {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
            <AdminButton type="submit" disabled={busy || !currentPassword || !newPassword}>
              {busy ? 'Saving…' : 'Change password'}
            </AdminButton>
          </form>
        </Card>
      </div>
    </>
  );
}
