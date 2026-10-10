import { useState } from 'react';
import type { AdminMedia } from '@gtyf/shared/admin-content';
import { adminApi, useAdminData } from '../auth';
import { MediaEditor, Sheet, Thumb, Uploader, useOptions } from '../content/kit';
import { AdminButton, Card, Notice, PageHeader, Spinner } from '../ui';

/** One place for every photo on the site: upload, describe, confirm consent, reuse anywhere. */
export default function Photos() {
  const options = useOptions();
  const [q, setQ] = useState('');
  const [programmeId, setProgrammeId] = useState('');
  const [attention, setAttention] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<AdminMedia | null>(null);
  const query = new URLSearchParams({ q, programmeId, ...(attention ? { attention: '1' } : {}) });
  const { data, setData, loading, reload } = useAdminData<AdminMedia[]>(`/content/media?${query}`);
  const needAttention = data?.filter((m) => m.hiddenReason).length ?? 0;
  const demoCount = data?.filter((m) => m.isDemo).length ?? 0;
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoMsg, setDemoMsg] = useState<string | null>(null);

  const addDemo = async () => {
    setDemoBusy(true);
    try {
      const r = await adminApi<{ loaded: number; placed: number }>('/content/media/demo', { method: 'POST' });
      setDemoMsg(`Demo photos added: ${r.placed} empty photo spots on the website are now filled.`);
      reload();
    } finally {
      setDemoBusy(false);
    }
  };
  const removeDemo = async () => {
    if (!window.confirm(`Remove all ${demoCount} demo photos? Spots that used them will be empty until you add your own photos.`)) return;
    setDemoBusy(true);
    try {
      const r = await adminApi<{ removed: number }>('/content/media/demo', { method: 'DELETE' });
      setDemoMsg(`${r.removed} demo photos removed.`);
      reload();
    } finally {
      setDemoBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Photos" subtitle="Every photo on the website. Upload once, use anywhere." actions={<AdminButton onClick={() => setUploading(true)}>+ Upload photos</AdminButton>} />

      {/* Demo photos: placeholders until GTYF's own, consented photos are uploaded */}
      <div className="mb-4 flex flex-col gap-3 rounded-3xl bg-[#FFF6E0] p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[0.9375rem]">
          {demoCount ? (
            <>
              <strong>{demoCount} demo photos</strong> are filling empty spots. They’re free stock photos, not GTYF’s children. Replace them with your own before sharing the site widely.
            </>
          ) : (
            <>No demo photos. Empty photo spots can be filled with placeholder photos until you have your own.</>
          )}
        </p>
        {demoCount ? (
          <AdminButton variant="danger" disabled={demoBusy} onClick={removeDemo}>
            Remove all demo photos
          </AdminButton>
        ) : (
          <AdminButton variant="secondary" disabled={demoBusy} onClick={addDemo}>
            {demoBusy ? 'Adding…' : 'Add demo photos'}
          </AdminButton>
        )}
      </div>
      {demoMsg && (
        <div className="mb-4">
          <Notice kind="success">{demoMsg}</Notice>
        </div>
      )}

      <Card>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by description or file name" aria-label="Search photos" className="h-12 flex-1 rounded-2xl bg-mist px-4 text-base outline-none focus:ring-2 focus:ring-ink" />
          <select value={programmeId} onChange={(e) => setProgrammeId(e.target.value)} aria-label="Filter by programme" className="h-12 rounded-2xl bg-mist px-4 font-medium outline-none focus:ring-2 focus:ring-ink">
            <option value="">All programmes</option>
            {options.programmes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => setAttention((a) => !a)} aria-pressed={attention} className={`h-12 rounded-2xl px-4 font-semibold ${attention ? 'bg-[#FFF4D6] text-[#7A4F00]' : 'bg-mist'}`}>
            Needs attention{!attention && needAttention ? ` (${needAttention})` : ''}
          </button>
        </div>
      </Card>

      <div className="mt-4">
        {loading && !data ? (
          <Spinner />
        ) : data && data.length === 0 ? (
          <Card>
            <p className="py-8 text-center text-slate">{q || programmeId || attention ? 'No photos match.' : 'No photos yet. Tap “Upload photos” to add your first ones.'}</p>
          </Card>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {data?.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => setEditing(m)} className="block w-full overflow-hidden rounded-3xl bg-white text-left ring-ink focus-visible:ring-3">
                  <Thumb m={m} className="aspect-[4/3]" />
                  <span className="block p-3">
                    <span className={`line-clamp-2 text-sm ${m.altText ? 'font-medium' : 'text-slate italic'}`}>{m.altText || 'No description yet'}</span>
                    {m.hiddenReason && <span className="mt-1 block text-xs font-semibold text-[#7A4F00]">{m.hiddenReason}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Sheet open={uploading} onClose={() => setUploading(false)} title="Upload photos">
        <Uploader
          onUploaded={() => {
            reload();
          }}
        />
      </Sheet>
      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Photo details" wide>
        {editing && (
          <MediaEditor
            m={editing}
            onSaved={(m) => {
              setData((list) => list?.map((x) => (x.id === m.id ? m : x)) ?? null);
              setEditing(m);
            }}
            onDeleted={() => {
              setData((list) => list?.filter((x) => x.id !== editing.id) ?? null);
              setEditing(null);
            }}
          />
        )}
      </Sheet>
    </>
  );
}
