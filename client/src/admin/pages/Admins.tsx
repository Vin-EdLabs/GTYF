import { useState, type FormEvent } from 'react';
import type { AdminRole } from '@gtyf/shared';
import { ROLE_LABELS, type ActivityEntry, type AdminUser } from '@gtyf/shared/admin';
import type { FieldErrors } from '@gtyf/shared/forms';
import { ApiError } from '../../lib/api';
import { adminApi, useAdminAuth, useAdminData } from '../auth';
import { AdminButton, Card, Input, Notice, PageHeader, PasswordInput, Select, Spinner, formatDateTime } from '../ui';

const ROLES = Object.keys(ROLE_LABELS) as AdminRole[];

/** A readable strong password suggestion: Gtyf-abcd-EFGH-1234 */
function suggestPassword() {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const pick = (n: number) => Array.from(crypto.getRandomValues(new Uint32Array(n)), (x) => letters[x % letters.length]).join('');
  return `Gtyf-${pick(4)}-${pick(4)}-${1000 + (crypto.getRandomValues(new Uint32Array(1))[0]! % 9000)}`;
}

export default function Admins() {
  const { admin: me } = useAdminAuth();
  const { data, setData, error, loading } = useAdminData<AdminUser[]>('/admins');
  const activity = useAdminData<ActivityEntry[]>('/activity');
  const [adding, setAdding] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  if (loading && !data) return <Spinner />;
  if (error || !data) return <Notice kind="error">{error ?? 'Could not load admins.'}</Notice>;

  const replace = (u: AdminUser) => setData(data.map((x) => (x.id === u.id ? u : x)));

  return (
    <>
      <PageHeader
        title="Admins"
        subtitle="People who can sign in to this admin."
        actions={!adding && <AdminButton onClick={() => setAdding(true)}>+ Add admin</AdminButton>}
      />
      {flash && (
        <div className="mb-4">
          <Notice kind="success">{flash}</Notice>
        </div>
      )}
      {adding && (
        <AddAdmin
          onCancel={() => setAdding(false)}
          onCreated={(u) => {
            setData([...data, u]);
            setAdding(false);
            setFlash(`${u.name} can now sign in with ${u.email}. Share their password with them privately.`);
            activity.reload();
          }}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {data.map((u) => (
          <AdminCard key={u.id} u={u} isMe={u.id === me?.id} onChange={(next, msg) => { replace(next); setFlash(msg); activity.reload(); }} />
        ))}
      </div>

      <Card className="mt-6">
        <h2 className="font-display text-lg font-bold">Activity</h2>
        <p className="text-sm text-slate">Who changed what, and when.</p>
        {activity.data?.length ? (
          <ul className="mt-3 divide-y divide-ink/[0.07]">
            {activity.data.slice(0, 30).map((a) => (
              <li key={a.id} className="py-2.5 text-[0.9375rem]">
                <span className="font-semibold">{a.adminName ?? 'System'}</span> <span className="text-slate">·</span> {a.summary}
                <span className="block text-sm text-slate">{formatDateTime(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-4 text-slate">Nothing yet.</p>
        )}
      </Card>
    </>
  );
}

function AddAdmin({ onCancel, onCreated }: { onCancel: () => void; onCreated: (u: AdminUser) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(suggestPassword);
  const [role, setRole] = useState<AdminRole>('finance');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setError(null);
    try {
      onCreated(await adminApi<AdminUser>('/admins', { method: 'POST', json: { name, email, password, role } }));
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setErrors(err.fieldErrors);
      setError(err instanceof Error ? err.message : 'Could not add the admin.');
      setBusy(false);
    }
  }

  return (
    <Card className="mb-6 ring-2 ring-ink/10">
      <h2 className="font-display text-xl font-bold">Add an admin</h2>
      <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2" noValidate>
        <Input label="Full name" name="name" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} errors={errors} />
        <Input label="Email (their sign-in)" name="email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} errors={errors} />
        <div>
          <PasswordInput label="Password" hint="At least 5 characters. Share it with them privately." name="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} errors={errors} />
          <button type="button" onClick={() => setPassword(suggestPassword())} className="mt-1 text-sm font-semibold text-slate hover:text-ink">
            Suggest another
          </button>
        </div>
        <Select label="Role" hint={ROLE_LABELS[role].help} name="role" value={role} onChange={(e) => setRole(e.target.value as AdminRole)} errors={errors}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r].label}
            </option>
          ))}
        </Select>
        {error && (
          <div className="sm:col-span-2">
            <Notice kind="error">{error}</Notice>
          </div>
        )}
        <div className="flex gap-2 sm:col-span-2">
          <AdminButton type="submit" disabled={busy}>
            {busy ? 'Adding…' : 'Add admin'}
          </AdminButton>
          <AdminButton variant="ghost" onClick={onCancel}>
            Cancel
          </AdminButton>
        </div>
      </form>
    </Card>
  );
}

function AdminCard({ u, isMe, onChange }: { u: AdminUser; isMe: boolean; onChange: (u: AdminUser, msg: string) => void }) {
  const [resetting, setResetting] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const patch = async (json: Partial<Pick<AdminUser, 'role' | 'isActive'>>, msg: string) => {
    setError(null);
    try {
      onChange(await adminApi<AdminUser>(`/admins/${u.id}`, { method: 'PATCH', json }), msg);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update.');
    }
  };

  return (
    <Card className={u.isActive ? '' : 'opacity-70'}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-bold">
            {u.name} {isMe && <span className="text-sm font-semibold text-slate">(you)</span>}
          </p>
          <p className="truncate text-slate">{u.email}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.8125rem] font-semibold ${u.isActive ? 'bg-[#E7F6EC] text-[#166534]' : 'bg-ink/[0.06] text-slate'}`}>
          {u.isActive ? '● Active' : '○ Deactivated'}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate">Last sign-in: {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'never'}</p>

      <div className="mt-4">
        <Select label="Role" hint={ROLE_LABELS[u.role].help} name={`role-${u.id}`} value={u.role} onChange={(e) => patch({ role: e.target.value as AdminRole }, `${u.name} is now ${ROLE_LABELS[e.target.value as AdminRole].label}.`)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r].label}
            </option>
          ))}
        </Select>
      </div>

      {resetting ? (
        <form
          className="mt-4 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            try {
              await adminApi(`/admins/${u.id}/password`, { method: 'POST', json: { password: newPassword } });
              setResetting(false);
              setNewPassword('');
              onChange(u, `Password reset for ${u.name}. Share it with them privately.`);
            } catch (err) {
              setError(err instanceof ApiError ? (err.fieldErrors?.password?.[0] ?? err.message) : 'Could not reset.');
            }
          }}
        >
          <PasswordInput label="New password" name={`pw-${u.id}`} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <AdminButton type="submit" disabled={newPassword.length < 5}>
              Save password
            </AdminButton>
            <AdminButton variant="ghost" onClick={() => setNewPassword(suggestPassword())}>
              Suggest one
            </AdminButton>
            <AdminButton variant="ghost" onClick={() => setResetting(false)}>
              Cancel
            </AdminButton>
          </div>
        </form>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <AdminButton variant="secondary" onClick={() => setResetting(true)}>
            Reset password
          </AdminButton>
          {!isMe &&
            (u.isActive ? (
              <AdminButton variant="danger" onClick={() => patch({ isActive: false }, `${u.name} can no longer sign in.`)}>
                Deactivate
              </AdminButton>
            ) : (
              <AdminButton variant="secondary" onClick={() => patch({ isActive: true }, `${u.name} can sign in again.`)}>
                Reactivate
              </AdminButton>
            ))}
        </div>
      )}
      {error && (
        <div className="mt-3">
          <Notice kind="error">{error}</Notice>
        </div>
      )}
    </Card>
  );
}
