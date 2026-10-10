/**
 * Building blocks for the content editors: photo upload/pick/edit, list
 * editors, a sticky save bar and a small "save this form" hook.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { AdminMedia } from '@gtyf/shared/admin-content';
import type { FieldErrors } from '@gtyf/shared/forms';
import { ApiError } from '../../lib/api';
import { adminApi, useAdminData } from '../auth';
import { AdminButton, Input, Notice, Select, TextArea } from '../ui';

export { Toggle } from '../../components/donate/parts';

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

export interface Options {
  programmes: { id: string; title: string; slug: string }[];
  events: { id: string; title: string; dateStart: string }[];
}
export const useOptions = () => useAdminData<Options>('/content/options').data ?? { programmes: [], events: [] };

const mediaCache = new Map<string, AdminMedia>();
export const rememberMedia = (m: AdminMedia) => mediaCache.set(m.id, m);

/** Look up a photo by id (cached), for showing thumbnails of chosen images. */
export function useMedia(id: string | null | undefined) {
  const [m, setM] = useState<AdminMedia | null>(id ? (mediaCache.get(id) ?? null) : null);
  useEffect(() => {
    if (!id) return setM(null);
    if (mediaCache.has(id)) return setM(mediaCache.get(id)!);
    adminApi<AdminMedia[]>('/content/media/lookup', { method: 'POST', json: { ids: [id] } })
      .then(([found]) => {
        if (found) rememberMedia(found);
        setM(found ?? null);
      })
      .catch(() => setM(null));
  }, [id]);
  return m;
}

/**
 * Save a form: tracks busy/errors/success and maps server field errors.
 * `save` returns the saved record.
 */
export function useSave<T>() {
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const run = useCallback(async (fn: () => Promise<T>, success = 'Saved. It’s live on the website.'): Promise<T | null> => {
    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      const out = await fn();
      setMessage({ kind: 'success', text: success });
      return out;
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors) setErrors(e.fieldErrors);
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : 'Could not save.' });
      return null;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, errors, message, setMessage, run };
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/** Sticky save bar: above the bottom tabs on phones, at the foot of the form on desktop. */
export function SaveBar({ busy, dirty = true, label = 'Save changes', message, extra }: { busy: boolean; dirty?: boolean; label?: string; message?: { kind: 'success' | 'error'; text: string } | null; extra?: ReactNode }) {
  return (
    <div className="sticky bottom-[4.75rem] z-10 -mx-4 mt-6 border-t border-ink/[0.07] bg-mist/95 px-4 py-3 backdrop-blur-lg sm:-mx-6 sm:px-6 lg:bottom-0 lg:mx-0 lg:rounded-3xl lg:border-0 lg:bg-white lg:px-5 lg:shadow-soft">
      {message && (
        <div className="mb-3">
          <Notice kind={message.kind}>{message.text}</Notice>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <AdminButton type="submit" disabled={busy || !dirty} className="flex-1 sm:flex-none">
          {busy ? 'Saving…' : label}
        </AdminButton>
        {extra}
      </div>
    </div>
  );
}

export function FormSection({ title, help, children }: { title: string; help?: ReactNode; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-3xl bg-white p-5 ring-1 ring-ink/[0.05] sm:p-6">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      {help && <p className="mt-1 text-sm text-slate">{help}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

/** Draft / Published switch shown at the top of editors. */
export function PublishSwitch({ value, onChange }: { value: 'draft' | 'published'; onChange: (v: 'draft' | 'published') => void }) {
  return (
    <div className="grid grid-cols-2 rounded-full bg-ink/[0.06] p-1" role="radiogroup" aria-label="Visibility">
      {(['draft', 'published'] as const).map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`h-11 rounded-full px-4 font-semibold transition-colors ${value === v ? (v === 'published' ? 'bg-[#1F9D55] text-white' : 'bg-white text-ink shadow-soft') : 'text-slate'}`}
        >
          {v === 'draft' ? 'Draft (hidden)' : 'Published (live)'}
        </button>
      ))}
    </div>
  );
}

/** Edit a list of short texts (highlights, schools…): add, edit, reorder, remove. */
export function ListEditor({ label, help, items, onChange, placeholder, addLabel = '+ Add another' }: { label: string; help?: string; items: string[]; onChange: (v: string[]) => void; placeholder?: string; addLabel?: string }) {
  const move = (i: number, d: -1 | 1) => {
    const next = [...items];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };
  return (
    <div>
      <p className="text-[0.9375rem] font-semibold">{label}</p>
      {help && <p className="text-sm text-slate">{help}</p>}
      <ul className="mt-2 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <textarea
              value={item}
              rows={Math.min(4, Math.max(1, Math.ceil(item.length / 48)))}
              placeholder={placeholder}
              onChange={(e) => onChange(items.map((x, k) => (k === i ? e.target.value : x)))}
              aria-label={`${label} ${i + 1}`}
              className="min-h-12 flex-1 resize-y rounded-2xl border-[1.5px] border-ink/15 bg-white px-4 py-3 text-base outline-none focus:border-ink"
            />
            <div className="flex flex-col">
              <IconBtn label="Move up" onClick={() => move(i, -1)} disabled={i === 0} d="M6 14l6-6 6 6" />
              <IconBtn label="Move down" onClick={() => move(i, 1)} disabled={i === items.length - 1} d="M6 10l6 6 6-6" />
            </div>
            <IconBtn label="Remove" onClick={() => onChange(items.filter((_, k) => k !== i))} d="M6 6l12 12M18 6L6 18" />
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => onChange([...items, ''])} className="mt-2 h-11 rounded-full px-3 font-semibold text-slate hover:bg-ink/5 hover:text-ink">
        {addLabel}
      </button>
    </div>
  );
}

export function IconBtn({ label, onClick, d, disabled }: { label: string; onClick: () => void; d: string; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className="grid size-10 shrink-0 place-items-center rounded-full text-slate hover:bg-ink/5 hover:text-ink disabled:opacity-30">
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={d} />
      </svg>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Sheet (bottom sheet on phones, centred dialog on desktop)
// ---------------------------------------------------------------------------

export function Sheet({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  if (typeof document === 'undefined') return null;
  return createPortal(
    <dialog
      ref={ref}
      onClose={(e) => e.target === e.currentTarget && onClose()}
      aria-label={title}
      className={`m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-[28px] bg-mist p-0 text-ink backdrop:bg-ink/60 sm:m-auto sm:rounded-[28px] ${wide ? 'sm:max-w-4xl' : 'sm:max-w-xl'}`}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-center justify-between border-b border-ink/[0.07] bg-white px-5 py-3">
            <h2 className="font-display text-lg font-bold">{title}</h2>
            <IconBtn label="Close" onClick={onClose} d="M6 6l12 12M18 6L6 18" />
          </div>
          <div className="overflow-y-auto p-4 pb-safe sm:p-6">{children}</div>
        </div>
      )}
    </dialog>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// Photos: upload, pick, edit
// ---------------------------------------------------------------------------

interface UploadJob {
  name: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
  media?: AdminMedia;
}

function uploadOne(file: File, fields: Record<string, string>, onProgress: (p: number) => void): Promise<AdminMedia> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    fd.append('file', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/content/media');
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 90));
    xhr.onload = () => {
      const body = (() => {
        try {
          return JSON.parse(xhr.responseText);
        } catch {
          return {};
        }
      })();
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as AdminMedia);
      else reject(new Error(body.error ?? 'Upload failed.'));
    };
    xhr.onerror = () => reject(new Error('Connection lost. Try again.'));
    xhr.send(fd);
  });
}

/**
 * Pick photos from the phone/computer (or drag them in), answer the children
 * question once for the batch, and watch each upload's progress.
 */
/** Temporary on-screen previews of chosen files (cleaned up when they change). */
function useFilePreviews(files: File[]) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const made = files.map((f) => (f.type.startsWith('image/') && !/heic|heif/.test(f.type) ? URL.createObjectURL(f) : ''));
    setUrls(made);
    return () => made.forEach((u) => u && URL.revokeObjectURL(u));
  }, [files]);
  return urls;
}

export function Uploader({ onUploaded, defaults = {}, multiple = true }: { onUploaded: (m: AdminMedia[]) => void; defaults?: { programmeId?: string; eventId?: string }; multiple?: boolean }) {
  const [files, setFiles] = useState<File[]>([]);
  const [alt, setAlt] = useState('');
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const previews = useFilePreviews(files);
  const busy = jobs.some((j) => j.status === 'uploading');

  const start = async () => {
    const list = files;
    setJobs(list.map((f) => ({ name: f.name, progress: 0, status: 'uploading' })));
    const done: AdminMedia[] = [];
    // One at a time: kinder to phone data connections and to the server.
    for (const [i, f] of list.entries()) {
      try {
        const m = await uploadOne(
          f,
          {
            showsChildren: 'true',
            consentConfirmed: 'true',
            altText: alt,
            ...(defaults.programmeId ? { programmeId: defaults.programmeId } : {}),
            ...(defaults.eventId ? { eventId: defaults.eventId } : {}),
          },
          (p) => setJobs((js) => js.map((j, k) => (k === i ? { ...j, progress: p } : j))),
        );
        rememberMedia(m);
        done.push(m);
        setJobs((js) => js.map((j, k) => (k === i ? { ...j, progress: 100, status: 'done', media: m } : j)));
      } catch (e) {
        setJobs((js) => js.map((j, k) => (k === i ? { ...j, status: 'error', error: e instanceof Error ? e.message : 'Failed' } : j)));
      }
    }
    setFiles([]);
    if (done.length) onUploaded(done);
  };

  const accept = (list: FileList | null) => {
    if (!list) return;
    const picked = [...list].filter((f) => f.type.startsWith('image/'));
    setFiles(multiple ? picked : picked.slice(0, 1));
    setJobs([]);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          accept(e.dataTransfer.files);
        }}
        className={`grid place-items-center rounded-3xl border-2 border-dashed px-4 py-8 text-center transition-colors ${drag ? 'border-ink bg-white' : 'border-ink/20 bg-white/60'}`}
      >
        <svg viewBox="0 0 24 24" className="size-10 text-slate" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 16l4-4 3 3 5-5 4 4M4 20h16M12 3v9m0-9l-3 3m3-3l3 3" />
        </svg>
        <p className="mt-2 font-semibold">{files.length ? `${files.length} photo${files.length === 1 ? '' : 's'} ready` : 'Add photos'}</p>
        <p className="text-sm text-slate">Take a photo or choose from your gallery. JPEG, PNG or HEIC, up to 20 MB each.</p>
        <AdminButton variant="secondary" className="mt-4" onClick={() => input.current?.click()}>
          Choose photos
        </AdminButton>
        <input ref={input} type="file" accept="image/*" multiple={multiple} className="hidden" onChange={(e) => accept(e.target.files)} />
      </div>

      {files.length > 0 && (
        <div className="space-y-4 rounded-3xl bg-white p-5">
          <ul className={`grid gap-2 ${files.length === 1 ? 'grid-cols-1' : 'grid-cols-3 sm:grid-cols-4'}`}>
            {files.map((file, i) => (
              <li key={`${file.name}-${i}`} className="relative overflow-hidden rounded-2xl bg-mist">
                {previews[i] ? (
                  <img src={previews[i]} alt={file.name} className={files.length === 1 ? 'max-h-80 w-full object-contain' : 'aspect-square w-full object-cover'} />
                ) : (
                  <span className="grid aspect-square place-items-center p-2 text-center text-xs text-slate">{file.name}</span>
                )}
                {!busy && (
                  <button type="button" onClick={() => setFiles((fs) => fs.filter((_, k) => k !== i))} aria-label={`Remove ${file.name}`} className="absolute top-1.5 right-1.5 grid size-8 place-items-center rounded-full bg-ink/75 text-white">
                    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                )}
              </li>
            ))}
          </ul>
          <Input label="Description (optional)" hint="What’s in the photo, e.g. “Pupils at Anglican JHS with new exercise books”. Helps people using screen readers. Photos show on the website even without one." name="alt" value={alt} onChange={(e) => setAlt(e.target.value)} />
          <p className="text-sm text-slate">By uploading, you confirm we have permission to show {files.length === 1 ? 'this photo' : 'these photos'} on the website.</p>
          <AdminButton onClick={start} disabled={busy} className="w-full">
            {busy ? 'Uploading…' : `Upload ${files.length} photo${files.length === 1 ? '' : 's'}`}
          </AdminButton>
        </div>
      )}

      {jobs.length > 0 && (
        <ul className="space-y-2">
          {jobs.map((j, i) => (
            <li key={i} className="rounded-2xl bg-white p-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-3">
                  {j.media && <img src={j.media.thumb} alt="" className="size-10 shrink-0 rounded-lg object-cover" />}
                  <span className="min-w-0 truncate font-medium">{j.name}</span>
                </span>
                <span className={j.status === 'error' ? 'font-semibold text-margin' : 'text-slate'}>
                  {j.status === 'done' ? 'Done ✓' : j.status === 'error' ? j.error : j.progress >= 90 ? 'Processing…' : `${j.progress}%`}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10">
                <div className={`h-full rounded-full transition-all ${j.status === 'error' ? 'bg-margin' : 'bg-[#1F9D55]'}`} style={{ width: `${j.status === 'error' ? 100 : j.progress}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Thumbnail of a photo, cropped around its focal point, with a "hidden" marker if not yet public. */
export function Thumb({ m, className = '' }: { m: AdminMedia; className?: string }) {
  return (
    <span className={`relative block overflow-hidden bg-mist ${className}`}>
      <img src={m.thumb} alt="" loading="lazy" className="size-full object-cover" style={{ objectPosition: `${m.focalX * 100}% ${m.focalY * 100}%` }} />
      {m.hiddenReason && <span className="absolute bottom-1.5 left-1.5 rounded-full bg-[#FFF4D6] px-2 py-0.5 text-[0.6875rem] font-bold text-[#7A4F00]">Hidden</span>}
      {m.isDemo && <span className="absolute top-1.5 left-1.5 rounded-full bg-ink/80 px-2 py-0.5 text-[0.6875rem] font-bold text-white">Demo</span>}
    </span>
  );
}

/** Choose a photo from the library (or upload a new one). */
export function MediaPicker({ open, onClose, onPick, defaults }: { open: boolean; onClose: () => void; onPick: (m: AdminMedia) => void; defaults?: { programmeId?: string; eventId?: string } }) {
  const [tab, setTab] = useState<'library' | 'upload'>('library');
  const [q, setQ] = useState('');
  const { data, reload } = useAdminData<AdminMedia[]>(open ? `/content/media?q=${encodeURIComponent(q)}` : null);
  return (
    <Sheet open={open} onClose={onClose} title="Choose a photo" wide>
      <div className="mb-4 grid grid-cols-2 rounded-full bg-ink/[0.06] p-1">
        {(['library', 'upload'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`h-11 rounded-full font-semibold ${tab === t ? 'bg-white shadow-soft' : 'text-slate'}`}>
            {t === 'library' ? 'Photo library' : 'Upload new'}
          </button>
        ))}
      </div>
      {tab === 'upload' ? (
        <Uploader
          multiple={false}
          defaults={defaults}
          onUploaded={([m]) => {
            reload();
            if (m) onPick(m);
          }}
        />
      ) : (
        <>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search photos" aria-label="Search photos" className="mb-3 h-12 w-full rounded-2xl bg-white px-4 text-base outline-none focus:ring-2 focus:ring-ink" />
          {data && data.length === 0 && <p className="py-10 text-center text-slate">No photos yet. Use “Upload new”.</p>}
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {data?.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => {
                    rememberMedia(m);
                    onPick(m);
                  }}
                  className="block w-full overflow-hidden rounded-2xl ring-ink focus-visible:ring-3"
                >
                  <Thumb m={m} className="aspect-square" />
                  <span className="sr-only">{m.altText || m.originalFilename}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Sheet>
  );
}

/** A form field holding one photo: preview, choose/replace, remove. */
export function ImageField({ label, help, value, onChange, defaults }: { label: string; help?: string; value: string | null; onChange: (id: string | null) => void; defaults?: { programmeId?: string; eventId?: string } }) {
  const [open, setOpen] = useState(false);
  const m = useMedia(value);
  return (
    <div>
      <p className="text-[0.9375rem] font-semibold">{label}</p>
      {help && <p className="text-sm text-slate">{help}</p>}
      <div className="mt-2 flex items-center gap-3">
        {m ? <Thumb m={m} className="aspect-[4/3] w-32 shrink-0 rounded-2xl" /> : <span className="grid aspect-[4/3] w-32 shrink-0 place-items-center rounded-2xl bg-mist text-sm text-slate">No photo</span>}
        <div className="flex flex-col gap-2">
          <AdminButton variant="secondary" onClick={() => setOpen(true)}>
            {m ? 'Change photo' : 'Choose photo'}
          </AdminButton>
          {m && (
            <button type="button" onClick={() => onChange(null)} className="text-left text-sm font-semibold text-slate hover:text-margin">
              Remove
            </button>
          )}
        </div>
      </div>
      {m?.hiddenReason && <p className="mt-2 text-sm font-medium text-[#7A4F00]">Not shown on the site yet: {m.hiddenReason.toLowerCase()} (edit it in Photos).</p>}
      <MediaPicker
        open={open}
        onClose={() => setOpen(false)}
        defaults={defaults}
        onPick={(picked) => {
          onChange(picked.id);
          setOpen(false);
        }}
      />
    </div>
  );
}

/** Edit one photo's details. Tap the photo to set the focal point. */
export function MediaEditor({ m, onSaved, onDeleted }: { m: AdminMedia; onSaved: (m: AdminMedia) => void; onDeleted: () => void }) {
  const options = useOptions();
  const [f, setF] = useState(m);
  const { busy, errors, message, run } = useSave<AdminMedia>();
  useEffect(() => setF(m), [m]);
  const set = <K extends keyof AdminMedia>(k: K, v: AdminMedia[K]) => setF((x) => ({ ...x, [k]: v }));

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const saved = await run(
          () =>
            adminApi<AdminMedia>(`/content/media/${m.id}`, {
              method: 'PATCH',
              json: {
                altText: f.altText,
                caption: f.caption,
                focalX: f.focalX,
                focalY: f.focalY,
                showsChildren: f.showsChildren,
                consentConfirmed: f.consentConfirmed,
                programmeId: f.programmeId,
                eventId: f.eventId,
                year: f.year,
                hideFromGallery: f.hideFromGallery,
              },
            }),
          'Photo saved.',
        );
        if (saved) {
          rememberMedia(saved);
          onSaved(saved);
        }
      }}
      className="space-y-4"
    >
      <div>
        <p className="mb-2 text-sm text-slate">Tap the most important part of the photo (e.g. a face). It stays in view on every screen size.</p>
        <button
          type="button"
          className="relative block w-full cursor-crosshair overflow-hidden rounded-2xl"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            set('focalX', Math.round(((e.clientX - r.left) / r.width) * 100) / 100);
            set('focalY', Math.round(((e.clientY - r.top) / r.height) * 100) / 100);
          }}
        >
          <img src={f.src} alt={f.altText} className="block w-full" />
          <span aria-hidden="true" className="absolute size-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_0_0_2px_rgb(11_20_34/0.6)]" style={{ left: `${f.focalX * 100}%`, top: `${f.focalY * 100}%` }} />
        </button>
        {/* Live previews of how the crop behaves */}
        <div className="mt-3 grid grid-cols-[1fr_2fr] gap-2" aria-hidden="true">
          <img src={f.thumb} alt="" className="aspect-[3/4] w-full rounded-xl object-cover" style={{ objectPosition: `${f.focalX * 100}% ${f.focalY * 100}%` }} />
          <img src={f.thumb} alt="" className="aspect-[16/9] w-full self-start rounded-xl object-cover" style={{ objectPosition: `${f.focalX * 100}% ${f.focalY * 100}%` }} />
        </div>
        <p className="mt-1 text-xs text-slate">Phone view · Wide view</p>
      </div>

      <TextArea label="Description" hint="Describes the photo for people who can’t see it, and for Google. Required before it can be shown." name="altText" value={f.altText} onChange={(e) => set('altText', e.target.value)} errors={errors} rows={2} />
      <Input label="Caption (optional)" hint="Shown under the photo in the gallery viewer." name="caption" value={f.caption ?? ''} onChange={(e) => set('caption', e.target.value)} errors={errors} />

      <div className="rounded-2xl bg-white p-4">
        <label className="flex items-center justify-between gap-3 font-semibold">
          Shows children
          <input type="checkbox" checked={f.showsChildren} onChange={(e) => set('showsChildren', e.target.checked)} className="size-5 accent-[#0B1422]" />
        </label>
        {f.showsChildren && (
          <label className="mt-3 flex items-start gap-3 rounded-xl bg-[#FFF6E0] p-3 text-[0.9375rem]">
            <input type="checkbox" checked={f.consentConfirmed} onChange={(e) => set('consentConfirmed', e.target.checked)} className="mt-1 size-5 accent-[#0B1422]" />
            <span>
              <strong>Consent confirmed</strong> by parents, guardians or the school. Never add a child’s full name or school next to their photo.
            </span>
          </label>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Select label="Programme" name="programmeId" value={f.programmeId ?? ''} onChange={(e) => set('programmeId', e.target.value || null)}>
          <option value="">None</option>
          {options.programmes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </Select>
        <Select label="Event" name="eventId" value={f.eventId ?? ''} onChange={(e) => set('eventId', e.target.value || null)}>
          <option value="">None</option>
          {options.events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title} ({ev.dateStart.slice(0, 4)})
            </option>
          ))}
        </Select>
        <Input label="Year" name="year" type="number" inputMode="numeric" value={f.year ?? ''} onChange={(e) => set('year', e.target.value ? Number(e.target.value) : null)} />
      </div>
      <label className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 font-semibold">
        Hide from the Gallery page
        <input type="checkbox" checked={f.hideFromGallery} onChange={(e) => set('hideFromGallery', e.target.checked)} className="size-5 accent-[#0B1422]" />
      </label>

      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      <div className="flex flex-wrap gap-2">
        <AdminButton type="submit" disabled={busy} className="flex-1">
          {busy ? 'Saving…' : 'Save photo'}
        </AdminButton>
        <AdminButton
          variant="danger"
          onClick={async () => {
            if (!window.confirm('Delete this photo everywhere on the site? This can’t be undone.')) return;
            await adminApi(`/content/media/${m.id}`, { method: 'DELETE' });
            onDeleted();
          }}
        >
          Delete
        </AdminButton>
      </div>
    </form>
  );
}
