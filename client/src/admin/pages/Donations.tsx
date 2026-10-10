import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { formatCedis } from '@gtyf/shared';
import type { AdminDonationList, AdminDonationRow } from '@gtyf/shared/admin';
import { useDonationConfig } from '../../lib/site';
import { useAdminData } from '../auth';
import { AdminButton, Card, Notice, PageHeader, Spinner, StatusBadge, formatDateTime } from '../ui';

const FILTER_KEYS = ['q', 'status', 'frequency', 'cause', 'from', 'to'] as const;

export default function Donations() {
  const [params, setParams] = useSearchParams();
  const causes = useDonationConfig().causes;
  const [q, setQ] = useState(params.get('q') ?? '');
  const page = Number(params.get('page')) || 1;

  // Search as you type, gently debounced.
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get('q') ?? '') !== q) update({ q, page: '' });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const query = new URLSearchParams();
  for (const k of FILTER_KEYS) if (params.get(k)) query.set(k, params.get(k)!);
  const listPath = `/donations?${query}&page=${page}&pageSize=25`;
  const { data, error, loading } = useAdminData<AdminDonationList>(listPath);

  function update(next: Record<string, string>) {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    setParams(p, { replace: true });
  }

  const pages = data ? Math.max(1, Math.ceil(data.totalRows / data.pageSize)) : 1;
  const filtered = FILTER_KEYS.some((k) => params.get(k));

  return (
    <>
      <PageHeader
        title="Donations"
        subtitle="Every transaction and receipt. Tap one to see or change it."
        actions={
          <a href={`/api/admin/donations/export.csv?${query}`} className="inline-flex h-12 items-center rounded-full bg-white px-5 text-[0.9375rem] font-semibold ring-1 ring-ink/15 hover:ring-ink/40">
            Export CSV
          </a>
        }
      />

      <Card>
        <label className="flex h-12 items-center gap-2 rounded-2xl bg-mist px-4 focus-within:ring-2 focus-within:ring-ink">
          <svg viewBox="0 0 20 20" className="size-5 text-slate" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
            <circle cx="9" cy="9" r="6" />
            <path d="M14 14l4 4" strokeLinecap="round" />
          </svg>
          <span className="sr-only">Search</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email or receipt no."
            className="h-full min-w-0 flex-1 bg-transparent text-base outline-none"
          />
        </label>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <FilterSelect label="Status" value={params.get('status') ?? ''} onChange={(v) => update({ status: v, page: '' })}>
            <option value="">All statuses</option>
            <option value="success">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="abandoned">Not completed</option>
            <option value="reversed">Refunded</option>
          </FilterSelect>
          <FilterSelect label="Frequency" value={params.get('frequency') ?? ''} onChange={(v) => update({ frequency: v, page: '' })}>
            <option value="">One-time & monthly</option>
            <option value="one_time">One-time</option>
            <option value="monthly">Monthly</option>
          </FilterSelect>
          <FilterSelect label="Cause" value={params.get('cause') ?? ''} onChange={(v) => update({ cause: v, page: '' })}>
            <option value="">All causes</option>
            <option value="general">Where it’s needed most</option>
            {causes.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.shortTitle}
              </option>
            ))}
          </FilterSelect>
          <div className="col-span-2 grid grid-cols-2 gap-2 sm:col-span-1">
            <DateInput label="From" value={params.get('from') ?? ''} onChange={(v) => update({ from: v, page: '' })} />
            <DateInput label="To" value={params.get('to') ?? ''} onChange={(v) => update({ to: v, page: '' })} />
          </div>
        </div>

        {data && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#FFF6E0] px-4 py-3">
            <p className="text-[0.9375rem]">
              <strong className="font-display text-lg">{formatCedis(data.raisedInFilter)}</strong> raised{filtered ? ' in these results' : ' in total'}
              <span className="text-slate"> · {data.totalRows} transaction{data.totalRows === 1 ? '' : 's'}</span>
            </p>
            {filtered && (
              <button
                type="button"
                onClick={() => {
                  setQ('');
                  setParams(new URLSearchParams(), { replace: true });
                }}
                className="text-sm font-semibold text-slate hover:text-ink"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </Card>

      <Card className="mt-4">
        {error && <Notice kind="error">{error}</Notice>}
        {loading && !data ? <Spinner /> : data && data.rows.length === 0 ? <p className="py-10 text-center text-slate">No donations match.</p> : data && <DonationList rows={data.rows} />}

        {data && pages > 1 && (
          <div className="mt-4 flex items-center justify-between gap-2">
            <AdminButton variant="secondary" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
              ← Newer
            </AdminButton>
            <span className="text-sm text-slate">
              Page {page} of {pages}
            </span>
            <AdminButton variant="secondary" disabled={page >= pages} onClick={() => update({ page: String(page + 1) })}>
              Older →
            </AdminButton>
          </div>
        )}
      </Card>
    </>
  );
}

/** Rows as tappable cards on phones, a tidy table-like grid on wider screens. */
export function DonationList({ rows }: { rows: AdminDonationRow[] }) {
  return (
    <ul className="divide-y divide-ink/[0.07]">
      {rows.map((r) => (
        <li key={r.id}>
          <Link to={`/admin/donations/${r.id}`} className="-mx-2 grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 rounded-2xl px-2 py-3.5 hover:bg-mist sm:grid-cols-[1.4fr_1fr_auto_auto]">
            <span className="min-w-0">
              <span className="block truncate font-semibold">{r.donorName}</span>
              <span className="block truncate text-sm text-slate">
                {r.reference} · {formatDateTime(r.paidAt ?? r.createdAt)}
              </span>
            </span>
            <span className="text-right font-display text-lg font-bold sm:order-3">
              {formatCedis(r.amount)}
              {r.frequency === 'monthly' && <span className="text-sm font-semibold text-slate">/mo</span>}
            </span>
            <span className="truncate text-sm text-slate sm:order-2">{r.causeName}</span>
            <span className="justify-self-end sm:order-4">
              <StatusBadge status={r.status} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-12 w-full appearance-none rounded-2xl bg-mist px-4 text-[0.9375rem] font-medium outline-none focus:ring-2 focus:ring-ink">
        {children}
      </select>
    </label>
  );
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="relative block">
      <span className="absolute top-1.5 left-3 text-[0.6875rem] font-semibold text-slate">{label}</span>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="h-12 w-full rounded-2xl bg-mist px-3 pt-3.5 text-sm outline-none focus:ring-2 focus:ring-ink" />
    </label>
  );
}
