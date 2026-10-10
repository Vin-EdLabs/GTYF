import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { InboxStatus } from '@gtyf/shared';
import { adminApi, useAdminData } from '../auth';
import { AdminButton, Card, Notice, PageHeader, Spinner, formatDateTime } from '../ui';

type Kind = 'volunteer' | 'partner' | 'contact';
type Tab = Kind | 'subscribers';

interface Summary {
  volunteer: number;
  partner: number;
  contact: number;
  newTotal: number;
  subscribers: number;
}

interface Item {
  id: string;
  status: InboxStatus;
  notes: string | null;
  createdAt: string;
  email: string;
  phone: string | null;
  // volunteer
  fullName?: string;
  location?: string | null;
  interests?: string[];
  availability?: string | null;
  message?: string | null;
  eventTitle?: string | null;
  // partner
  organisation?: string;
  contactName?: string;
  partnershipType?: string | null;
  // contact
  subject?: string | null;
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'volunteer', label: 'Volunteers' },
  { key: 'partner', label: 'Partners' },
  { key: 'contact', label: 'Messages' },
  { key: 'subscribers', label: 'Newsletter' },
];

const STATUS: Record<InboxStatus, { label: string; cls: string }> = {
  new: { label: 'New', cls: 'bg-[#FFF4D6] text-[#7A4F00]' },
  in_progress: { label: 'In progress', cls: 'bg-[#EEF1FB] text-[#2F4FA8]' },
  done: { label: 'Done', cls: 'bg-[#E7F6EC] text-[#166534]' },
  archived: { label: 'Archived', cls: 'bg-ink/[0.06] text-slate' },
};

/** Everything people send through the website's forms, in one place. */
export default function Inbox() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.key === params.get('tab'))?.key ?? 'volunteer') as Tab;
  const [filter, setFilter] = useState<'open' | 'new' | 'all'>('open');
  const summary = useAdminData<Summary>('/inbox/summary');

  return (
    <>
      <PageHeader title="Inbox" subtitle="Everything people send through the website: volunteers, partners and messages. You also get an email for each one." />
      <div className="scrollbar-none -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Inbox">
        {TABS.map((t) => {
          const n = t.key === 'subscribers' ? summary.data?.subscribers : summary.data?.[t.key];
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => setParams({ tab: t.key }, { replace: true })}
              className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 font-semibold ${active ? 'bg-ink text-white' : 'bg-white ring-1 ring-ink/10'}`}
            >
              {t.label}
              {!!n && (
                <span className={`min-w-6 rounded-full px-1.5 text-center text-xs leading-6 ${t.key === 'subscribers' ? (active ? 'bg-white/20' : 'bg-mist') : 'bg-lantern text-ink'}`}>
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'subscribers' ? (
        <Subscribers />
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="grid grid-cols-3 rounded-full bg-ink/[0.06] p-1 text-sm">
              {(['open', 'new', 'all'] as const).map((f) => (
                <button key={f} type="button" onClick={() => setFilter(f)} className={`h-9 rounded-full px-3 font-semibold ${filter === f ? 'bg-white shadow-soft' : 'text-slate'}`}>
                  {f === 'open' ? 'Current' : f === 'new' ? 'New only' : 'All'}
                </button>
              ))}
            </div>
            <a href={`/api/admin/inbox/${tab}/export.csv`} className="text-sm font-semibold text-slate hover:text-ink">
              Export CSV
            </a>
          </div>
          <ItemList kind={tab} filter={filter} onChanged={summary.reload} />
        </>
      )}
    </>
  );
}

function ItemList({ kind, filter, onChanged }: { kind: Kind; filter: 'open' | 'new' | 'all'; onChanged: () => void }) {
  const { data, setData, loading, error } = useAdminData<Item[]>(`/inbox/${kind}?status=${filter}`);
  if (loading && !data) return <Spinner />;
  if (error) return <Notice kind="error">{error}</Notice>;
  if (!data?.length) {
    return (
      <Card>
        <p className="py-8 text-center text-slate">
          {kind === 'volunteer' ? 'No volunteer sign-ups yet.' : kind === 'partner' ? 'No partnership enquiries yet.' : 'No messages yet.'} New ones appear here as soon as someone sends the form.
        </p>
      </Card>
    );
  }
  return (
    <ul className="space-y-3">
      {data.map((item) => (
        <li key={item.id}>
          <ItemCard
            kind={kind}
            item={item}
            onSaved={(next) => {
              setData(data.map((x) => (x.id === next.id ? { ...x, ...next } : x)));
              onChanged();
            }}
          />
        </li>
      ))}
    </ul>
  );
}

function ItemCard({ kind, item, onSaved }: { kind: Kind; item: Item; onSaved: (i: Item) => void }) {
  const [open, setOpen] = useState(item.status === 'new');
  const [notes, setNotes] = useState(item.notes ?? '');
  const [busy, setBusy] = useState(false);
  const name = item.fullName ?? item.contactName ?? '';
  const headline = kind === 'partner' ? item.organisation : name;
  const phoneDigits = item.phone?.replace(/[^\d]/g, '') ?? '';
  // WhatsApp needs an international number: turn a local 0XX… into 233XX…
  const waNumber = phoneDigits.startsWith('0') ? `233${phoneDigits.slice(1)}` : phoneDigits;
  const subject = kind === 'volunteer' ? 'Volunteering with Guide The Youth Foundation' : kind === 'partner' ? 'Partnering with Guide The Youth Foundation' : `Re: ${item.subject || 'your message'}`;

  const save = async (patch: { status?: InboxStatus; notes?: string }) => {
    setBusy(true);
    try {
      onSaved(await adminApi<Item>(`/inbox/${kind}/${item.id}`, { method: 'PATCH', json: patch }));
    } finally {
      setBusy(false);
    }
  };

  const details: [string, string | null | undefined][] =
    kind === 'volunteer'
      ? [
          ['Lives in', item.location],
          ['Would like to help with', item.interests?.join(', ')],
          ['Available', item.availability],
          ['For event', item.eventTitle],
          ['Message', item.message],
        ]
      : kind === 'partner'
        ? [
            ['Contact', item.contactName],
            ['Type', item.partnershipType],
            ['Message', item.message],
          ]
        : [
            ['Subject', item.subject],
            ['Message', item.message],
          ];

  return (
    <article className={`rounded-3xl bg-white ring-1 ${item.status === 'new' ? 'ring-lantern/60' : 'ring-ink/[0.05]'}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-start gap-3 p-5 text-left">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-mist font-display font-bold">{(headline || '?').slice(0, 1).toUpperCase()}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{headline}</span>
          <span className="block truncate text-sm text-slate">
            {formatDateTime(item.createdAt)}
            {kind === 'contact' && item.subject ? ` · ${item.subject}` : ''}
            {kind === 'volunteer' && item.interests?.length ? ` · ${item.interests.join(', ')}` : ''}
          </span>
        </span>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.8125rem] font-semibold ${STATUS[item.status].cls}`}>{STATUS[item.status].label}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-ink/[0.06] px-5 pt-4 pb-5">
          <dl className="space-y-2">
            {details
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="text-sm text-slate">{k}</dt>
                  <dd className="whitespace-pre-line">{v}</dd>
                </div>
              ))}
            <div>
              <dt className="text-sm text-slate">Contact</dt>
              <dd className="break-all">
                {item.email}
                {item.phone ? ` · ${item.phone}` : ''}
              </dd>
            </div>
          </dl>

          {/* One-tap replies */}
          <div className="grid grid-cols-3 gap-2">
            <a href={`mailto:${item.email}?subject=${encodeURIComponent(subject)}`} className="inline-flex h-12 items-center justify-center rounded-2xl bg-mist font-semibold hover:bg-ink/10">
              Email
            </a>
            {waNumber ? (
              <a href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Hello ${name.split(' ')[0]}, this is Guide The Youth Foundation. `)}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#E7F6EC] font-semibold text-[#166534]">
                WhatsApp
              </a>
            ) : (
              <span className="inline-flex h-12 items-center justify-center rounded-2xl bg-mist/50 text-sm text-slate">No phone</span>
            )}
            {item.phone ? (
              <a href={`tel:${phoneDigits}`} className="inline-flex h-12 items-center justify-center rounded-2xl bg-mist font-semibold hover:bg-ink/10">
                Call
              </a>
            ) : (
              <span className="inline-flex h-12 items-center justify-center rounded-2xl bg-mist/50 text-sm text-slate">No phone</span>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">Status</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(STATUS) as InboxStatus[]).map((st) => (
                <button key={st} type="button" disabled={busy} onClick={() => save({ status: st })} aria-pressed={item.status === st} className={`h-11 rounded-2xl text-sm font-semibold ${item.status === st ? 'bg-ink text-white' : 'bg-mist hover:bg-ink/10'}`}>
                  {STATUS[st].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor={`notes-${item.id}`} className="mb-1.5 block text-sm font-semibold">
              Team notes
            </label>
            <textarea id={`notes-${item.id}`} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="e.g. Called on Monday, joining the November outreach" className="w-full resize-y rounded-2xl border-[1.5px] border-ink/15 px-4 py-3 text-base outline-none focus:border-ink" />
            {notes !== (item.notes ?? '') && (
              <AdminButton variant="secondary" className="mt-2" disabled={busy} onClick={() => save({ notes })}>
                Save note
              </AdminButton>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function Subscribers() {
  const { data, loading } = useAdminData<{ id: string; email: string; name: string | null; source: string | null; createdAt: string }[]>('/inbox/subscribers');
  if (loading && !data) return <Spinner />;
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-slate">{data?.length ?? 0} people want updates from GTYF.</p>
        <a href="/api/admin/inbox/subscribers/export.csv" className="text-sm font-semibold text-slate hover:text-ink">
          Export CSV
        </a>
      </div>
      {data?.length ? (
        <ul className="divide-y divide-ink/[0.07]">
          {data.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-3">
              <span className="min-w-0 truncate">{s.email}</span>
              <span className="shrink-0 text-sm text-slate">{formatDateTime(s.createdAt).split(',')[0]}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center text-slate">No sign-ups yet.</p>
      )}
    </Card>
  );
}
