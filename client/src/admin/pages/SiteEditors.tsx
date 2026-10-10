/**
 * Editors for the rest of the site: home slides, home sections, programmes,
 * team, impact numbers & prices, core values.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { formatCedis, IMPACT_ICONS } from '@gtyf/shared';
import type { AdminMedia } from '@gtyf/shared/admin-content';
import { adminApi, useAdminData } from '../auth';
import { FormSection, IconBtn, ImageField, PublishSwitch, SaveBar, Sheet, Toggle, rememberMedia, useMedia, useOptions, useSave } from '../content/kit';
import { AdminButton, Card, Input, Notice, PageHeader, Select, Spinner, TextArea } from '../ui';
import { RowThumb, StatusPill } from './Events';

const Back = ({ to = '/admin/content', label = 'Website' }: { to?: string; label?: string }) => (
  <Link to={to} className="mb-3 inline-flex min-h-11 items-center font-semibold text-slate hover:text-ink">
    ← {label}
  </Link>
);

function moveItem<T>(list: T[], i: number, d: -1 | 1) {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}

// ---------------------------------------------------------------------------
// Home page slides
// ---------------------------------------------------------------------------

interface Slide {
  id: string;
  eyebrow: string;
  headline: string;
  underlineWord: string;
  subtext: string;
  imageId: string | null;
  programmeId: string | null;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  isActive: boolean;
}
const NEW_SLIDE: Omit<Slide, 'id'> = { eyebrow: '', headline: '', underlineWord: '', subtext: '', imageId: null, programmeId: null, primaryLabel: 'Donate', primaryHref: '/donate', secondaryLabel: 'Learn more', secondaryHref: '/about', isActive: true };

export function SlidesEditor() {
  const { data, setData, loading } = useAdminData<Slide[]>('/content/hero-slides');
  const [editing, setEditing] = useState<Slide | (Omit<Slide, 'id'> & { id?: undefined }) | null>(null);
  if (loading && !data) return <Spinner />;
  const slides = data ?? [];

  const reorder = async (next: Slide[]) => {
    setData(next);
    await adminApi('/content/hero-slides/reorder', { method: 'POST', json: { ids: next.map((s) => s.id) } });
  };

  return (
    <>
      <Back />
      <PageHeader title="Home page slides" subtitle="The big photos at the top of the home page. They change every 7 seconds." actions={<AdminButton onClick={() => setEditing({ ...NEW_SLIDE })}>+ Add slide</AdminButton>} />
      <Card>
        <ul className="divide-y divide-ink/[0.07]">
          {slides.map((s, i) => (
            <li key={s.id} className="flex items-center gap-3 py-3">
              <button type="button" onClick={() => setEditing(s)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <RowThumb id={s.imageId} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{s.headline}</span>
                  <span className="block truncate text-sm text-slate">{s.isActive ? s.eyebrow : 'Hidden'}</span>
                </span>
              </button>
              <IconBtn label="Move up" onClick={() => reorder(moveItem(slides, i, -1))} disabled={i === 0} d="M6 14l6-6 6 6" />
              <IconBtn label="Move down" onClick={() => reorder(moveItem(slides, i, 1))} disabled={i === slides.length - 1} d="M6 10l6 6 6-6" />
            </li>
          ))}
        </ul>
      </Card>
      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit slide' : 'New slide'} wide>
        {editing && (
          <SlideForm
            slide={editing}
            onSaved={(s) => {
              setData(editing.id ? slides.map((x) => (x.id === s.id ? s : x)) : [...slides, s]);
              setEditing(null);
            }}
            onDeleted={() => {
              setData(slides.filter((x) => x.id !== editing.id));
              setEditing(null);
            }}
          />
        )}
      </Sheet>
    </>
  );
}

function SlideForm({ slide, onSaved, onDeleted }: { slide: Omit<Slide, 'id'> & { id?: string }; onSaved: (s: Slide) => void; onDeleted: () => void }) {
  const options = useOptions();
  const [f, setF] = useState(slide);
  const { busy, errors, message, run } = useSave<Slide>();
  const set = <K extends keyof Slide>(k: K, v: Slide[K]) => setF((x) => ({ ...x, [k]: v }));
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const { id, ...json } = f;
        const saved = await run(() => adminApi<Slide>(id ? `/content/hero-slides/${id}` : '/content/hero-slides', { method: id ? 'PATCH' : 'POST', json }));
        if (saved) onSaved(saved);
      }}
    >
      <ImageField label="Photo" help="Use a wide, bright photo. Tap the focus point in Photos so faces stay in view on phones." value={f.imageId} onChange={(v) => set('imageId', v)} />
      <Input label="Small label above the headline" name="eyebrow" value={f.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} errors={errors} />
      <Input label="Headline" hint="Short and bold, e.g. “Every child deserves a guide.”" name="headline" value={f.headline} onChange={(e) => set('headline', e.target.value)} errors={errors} />
      <Input label="Word to underline (optional)" hint="One word from the headline that gets the hand-drawn underline." name="underlineWord" value={f.underlineWord} onChange={(e) => set('underlineWord', e.target.value)} errors={errors} />
      <TextArea label="Supporting line" name="subtext" value={f.subtext} onChange={(e) => set('subtext', e.target.value)} errors={errors} rows={2} />
      <Select label="Programme (sets the placeholder icon)" name="programmeId" value={f.programmeId ?? ''} onChange={(e) => set('programmeId', e.target.value || null)}>
        <option value="">None</option>
        {options.programmes.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </Select>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Main button text" name="primaryLabel" value={f.primaryLabel} onChange={(e) => set('primaryLabel', e.target.value)} errors={errors} />
        <Input label="Main button goes to" hint="e.g. /donate" name="primaryHref" value={f.primaryHref} onChange={(e) => set('primaryHref', e.target.value)} errors={errors} />
        <Input label="Second button text" name="secondaryLabel" value={f.secondaryLabel} onChange={(e) => set('secondaryLabel', e.target.value)} errors={errors} />
        <Input label="Second button goes to" hint="e.g. /about" name="secondaryHref" value={f.secondaryHref} onChange={(e) => set('secondaryHref', e.target.value)} errors={errors} />
      </div>
      <Toggle checked={f.isActive} onChange={(v) => set('isActive', v)} label="Show this slide" />
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      <div className="flex gap-2">
        <AdminButton type="submit" disabled={busy} className="flex-1">
          {busy ? 'Saving…' : 'Save slide'}
        </AdminButton>
        {f.id && (
          <AdminButton
            variant="danger"
            onClick={async () => {
              if (!window.confirm('Delete this slide?')) return;
              await adminApi(`/content/hero-slides/${f.id}`, { method: 'DELETE' });
              onDeleted();
            }}
          >
            Delete
          </AdminButton>
        )}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Home page sections
// ---------------------------------------------------------------------------

interface Section {
  key: string;
  eyebrow: string;
  heading: string;
  underlineWord: string;
  body: string;
  items: { title: string; body: string }[];
  isVisible: boolean;
}

const SECTION_NAMES: Record<string, string> = {
  hero: 'Slides at the top',
  impact: 'Impact numbers',
  programmes: 'Programmes',
  selection: 'How we choose who we help',
  upcoming: 'Next outreach',
  journey: 'Our journey (past events)',
  values: 'Values ticker',
  news: 'Latest news',
};

export function HomeSectionsEditor() {
  const { data, setData, loading } = useAdminData<Section[]>('/content/home-sections');
  const [editing, setEditing] = useState<Section | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  if (loading && !data) return <Spinner />;
  const list = data ?? [];

  const reorder = async (next: Section[]) => {
    setData(next);
    await adminApi('/content/home-sections/reorder', { method: 'POST', json: { ids: next.map((s) => s.key) } });
  };
  const toggle = async (s: Section) => {
    const saved = await adminApi<Section>(`/content/home-sections/${s.key}`, { method: 'PATCH', json: { ...s, isVisible: !s.isVisible } });
    setData(list.map((x) => (x.key === s.key ? saved : x)));
    setSavedMsg(`${SECTION_NAMES[s.key]} ${saved.isVisible ? 'shown' : 'hidden'}.`);
  };

  return (
    <>
      <Back />
      <PageHeader title="Home page sections" subtitle="Reorder, show or hide sections, and change their headings." />
      {savedMsg && (
        <div className="mb-3">
          <Notice kind="success">{savedMsg}</Notice>
        </div>
      )}
      <Card>
        <ul className="divide-y divide-ink/[0.07]">
          {list.map((s, i) => (
            <li key={s.key} className="flex items-center gap-2 py-3">
              <button type="button" onClick={() => setEditing(s)} className="min-w-0 flex-1 text-left">
                <span className={`block font-semibold ${s.isVisible ? '' : 'text-slate line-through'}`}>{SECTION_NAMES[s.key] ?? s.key}</span>
                <span className="block truncate text-sm text-slate">{s.heading || s.eyebrow || 'Tap to edit'}</span>
              </button>
              <button type="button" onClick={() => toggle(s)} className={`h-9 rounded-full px-3 text-sm font-semibold ${s.isVisible ? 'bg-[#E7F6EC] text-[#166534]' : 'bg-ink/[0.06] text-slate'}`}>
                {s.isVisible ? 'Shown' : 'Hidden'}
              </button>
              <IconBtn label="Move up" onClick={() => reorder(moveItem(list, i, -1))} disabled={i === 0} d="M6 14l6-6 6 6" />
              <IconBtn label="Move down" onClick={() => reorder(moveItem(list, i, 1))} disabled={i === list.length - 1} d="M6 10l6 6 6-6" />
            </li>
          ))}
        </ul>
      </Card>
      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing ? (SECTION_NAMES[editing.key] ?? editing.key) : ''}>
        {editing && (
          <SectionForm
            s={editing}
            onSaved={(saved) => {
              setData(list.map((x) => (x.key === saved.key ? saved : x)));
              setEditing(null);
              setSavedMsg('Section saved.');
            }}
          />
        )}
      </Sheet>
    </>
  );
}

function SectionForm({ s, onSaved }: { s: Section; onSaved: (s: Section) => void }) {
  const [f, setF] = useState(s);
  const { busy, errors, message, run } = useSave<Section>();
  const set = <K extends keyof Section>(k: K, v: Section[K]) => setF((x) => ({ ...x, [k]: v }));
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const { key, ...json } = f;
        const saved = await run(() => adminApi<Section>(`/content/home-sections/${key}`, { method: 'PATCH', json }));
        if (saved) onSaved(saved);
      }}
    >
      {s.key === 'hero' ? (
        <p className="text-slate">
          The slides are edited in <Link to="/admin/content/slides" className="font-semibold text-ink underline">Home page slides</Link>.
        </p>
      ) : (
        <>
          <Input label="Small label" name="eyebrow" value={f.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} errors={errors} />
          <Input label="Heading" name="heading" value={f.heading} onChange={(e) => set('heading', e.target.value)} errors={errors} />
          <Input label="Word to underline (optional)" name="underlineWord" value={f.underlineWord} onChange={(e) => set('underlineWord', e.target.value)} errors={errors} />
          <TextArea label="Text (optional)" name="body" value={f.body} onChange={(e) => set('body', e.target.value)} errors={errors} rows={3} />
          {s.key === 'selection' &&
            f.items.map((it, i) => (
              <div key={i} className="rounded-2xl bg-white p-4">
                <p className="mb-2 text-sm font-bold text-slate">Step {i + 1}</p>
                <div className="space-y-3">
                  <Input label="Title" name={`t${i}`} value={it.title} onChange={(e) => set('items', f.items.map((x, k) => (k === i ? { ...x, title: e.target.value } : x)))} />
                  <TextArea label="Text" name={`b${i}`} value={it.body} rows={2} onChange={(e) => set('items', f.items.map((x, k) => (k === i ? { ...x, body: e.target.value } : x)))} />
                </div>
              </div>
            ))}
        </>
      )}
      <Toggle checked={f.isVisible} onChange={(v) => set('isVisible', v)} label="Show this section" />
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      <AdminButton type="submit" disabled={busy} className="w-full">
        {busy ? 'Saving…' : 'Save section'}
      </AdminButton>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Programmes
// ---------------------------------------------------------------------------

interface Programme {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  summary: string;
  body: string;
  heroImageId: string | null;
  status: 'draft' | 'published';
  seoTitle: string | null;
  seoDescription: string | null;
  sections: { heading: string; body: string; imageId: string | null }[];
}

export function ProgrammesList() {
  const { data, loading } = useAdminData<Programme[]>('/content/programmes');
  if (loading && !data) return <Spinner />;
  return (
    <>
      <Back />
      <PageHeader title="Programmes" subtitle="Each programme has its own page with story, photos and “how it works”." />
      <Card>
        <ul className="divide-y divide-ink/[0.07]">
          {data?.map((p) => (
            <li key={p.id}>
              <Link to={`/admin/content/programmes/${p.id}`} className="-mx-2 flex items-center gap-3 rounded-2xl px-2 py-3 hover:bg-mist">
                <RowThumb id={p.heroImageId} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{p.title}</span>
                  <span className="block truncate text-sm text-slate">{p.summary}</span>
                </span>
                <StatusPill status={p.status} />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

export function ProgrammeEdit() {
  const { id } = useParams();
  const { data } = useAdminData<Programme>(`/content/programmes/${id}`);
  const [f, setF] = useState<Programme | null>(null);
  const { busy, errors, message, run } = useSave<Programme>();
  useEffect(() => {
    if (data) setF({ ...data, sections: data.sections.map(({ heading, body, imageId }) => ({ heading, body, imageId })) });
  }, [data]);
  if (!f) return <Spinner />;
  const set = <K extends keyof Programme>(k: K, v: Programme[K]) => setF((x) => (x ? { ...x, [k]: v } : x));
  const setSection = (i: number, patch: Partial<Programme['sections'][number]>) => set('sections', f.sections.map((s, k) => (k === i ? { ...s, ...patch } : s)));

  return (
    <form
      noValidate
      onSubmit={async (e: FormEvent) => {
        e.preventDefault();
        const { id: _id, slug: _slug, ...json } = f;
        await run(() => adminApi<Programme>(`/content/programmes/${id}`, { method: 'PATCH', json }));
      }}
    >
      <Back to="/admin/content/programmes" label="Programmes" />
      <PageHeader title={f.shortTitle} />
      <div className="space-y-4">
        <PublishSwitch value={f.status} onChange={(v) => set('status', v)} />
        <FormSection title="Main content">
          <Input label="Full name" name="title" value={f.title} onChange={(e) => set('title', e.target.value)} errors={errors} />
          <Input label="Short name" hint="Used on buttons and in the donation card." name="shortTitle" value={f.shortTitle} onChange={(e) => set('shortTitle', e.target.value)} errors={errors} />
          <TextArea label="Summary" hint="One or two sentences for cards and link previews." name="summary" value={f.summary} onChange={(e) => set('summary', e.target.value)} errors={errors} rows={2} />
          <TextArea label="Story" hint="Separate paragraphs with an empty line. The first paragraph is shown larger." name="body" value={f.body} onChange={(e) => set('body', e.target.value)} errors={errors} rows={9} />
          <ImageField label="Cover photo" value={f.heroImageId} onChange={(v) => set('heroImageId', v)} defaults={{ programmeId: f.id }} />
        </FormSection>
        <FormSection title="How it works" help="Rows of text and a photo, e.g. how students are selected.">
          {f.sections.map((s, i) => (
            <div key={i} className="space-y-3 rounded-2xl bg-mist p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate">Part {i + 1}</p>
                <div className="flex">
                  <IconBtn label="Move up" onClick={() => set('sections', moveItem(f.sections, i, -1))} disabled={i === 0} d="M6 14l6-6 6 6" />
                  <IconBtn label="Move down" onClick={() => set('sections', moveItem(f.sections, i, 1))} disabled={i === f.sections.length - 1} d="M6 10l6 6 6-6" />
                  <IconBtn label="Remove" onClick={() => set('sections', f.sections.filter((_, k) => k !== i))} d="M6 6l12 12M18 6L6 18" />
                </div>
              </div>
              <Input label="Heading" name={`sh${i}`} value={s.heading} onChange={(e) => setSection(i, { heading: e.target.value })} />
              <TextArea label="Text" name={`sb${i}`} value={s.body} rows={5} onChange={(e) => setSection(i, { body: e.target.value })} />
              <ImageField label="Photo" value={s.imageId} onChange={(v) => setSection(i, { imageId: v })} defaults={{ programmeId: f.id }} />
            </div>
          ))}
          <AdminButton variant="secondary" onClick={() => set('sections', [...f.sections, { heading: '', body: '', imageId: null }])}>
            + Add a part
          </AdminButton>
        </FormSection>
        <FormSection title="Link previews (optional)">
          <Input label="Share title" name="seoTitle" value={f.seoTitle ?? ''} onChange={(e) => set('seoTitle', e.target.value)} errors={errors} />
          <TextArea label="Share description" name="seoDescription" value={f.seoDescription ?? ''} onChange={(e) => set('seoDescription', e.target.value)} errors={errors} rows={2} />
        </FormSection>
      </div>
      <SaveBar busy={busy} message={message} extra={<a href={`/programmes/${f.slug}`} target="_blank" rel="noopener" className="inline-flex h-12 items-center rounded-full bg-white px-5 font-semibold ring-1 ring-ink/15">View</a>} />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

interface Member {
  id: string;
  name: string;
  role: string;
  bio: string;
  photoId: string | null;
  isLeader: boolean;
  email: string;
  linkedin: string;
  instagram: string;
  tiktok: string;
  isVisible: boolean;
}

/** Leaders first, then everyone else, each group in the order set here (matches the website). */
const ranked = (list: Member[]) => [...list.filter((m) => m.isLeader), ...list.filter((m) => !m.isLeader)];

export function TeamEditor() {
  const { data, setData, loading } = useAdminData<Member[]>('/content/team');
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<Partial<Member> | null>(() => (params.get('add') ? { name: '', role: '', bio: '', photoId: null, isLeader: false, email: '', linkedin: '', instagram: '', tiktok: '', isVisible: true } : null));
  useEffect(() => {
    if (params.get('add')) setParams({}, { replace: true });
  }, [params, setParams]);
  if (loading && !data) return <Spinner />;
  const list = ranked(data ?? []);

  /** Swap two neighbours of the same kind (leader with leader, member with member). */
  const move = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (!list[j] || list[j]!.isLeader !== list[i]!.isLeader) return;
    const next = moveItem(list, i, dir);
    setData(next);
    await adminApi('/content/team/reorder', { method: 'POST', json: { ids: next.map((x) => x.id) } });
  };

  return (
    <>
      <Back />
      <PageHeader
        title="Team"
        subtitle="Shown on the About page and the Team page. Leaders come first, then everyone in the order below."
        actions={<AdminButton onClick={() => setEditing({ name: '', role: '', bio: '', photoId: null, isLeader: false, email: '', linkedin: '', instagram: '', tiktok: '', isVisible: true })}>+ Add person</AdminButton>}
      />
      <Card>
        {list.length === 0 ? (
          <p className="py-6 text-center text-slate">No one yet. Add your founder and team so donors can see the people behind GTYF.</p>
        ) : (
          <ul className="divide-y divide-ink/[0.07]">
            {list.map((m, i) => (
              <li key={m.id} className="flex items-center gap-1 py-3">
                <span aria-hidden="true" className="label w-7 shrink-0 text-slate tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <button type="button" onClick={() => setEditing(m)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <RowThumb id={m.photoId} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-semibold">{m.name}</span>
                      {m.isLeader && <span className="shrink-0 rounded-full bg-lantern px-2 py-0.5 text-[0.6875rem] font-bold text-ink">Leader</span>}
                    </span>
                    <span className="block truncate text-sm text-slate">{m.isVisible ? m.role : 'Hidden from the website'}</span>
                  </span>
                </button>
                <IconBtn label={`Move ${m.name} up`} disabled={i === 0 || list[i - 1]!.isLeader !== m.isLeader} d="M6 14l6-6 6 6" onClick={() => move(i, -1)} />
                <IconBtn label={`Move ${m.name} down`} disabled={i === list.length - 1 || list[i + 1]!.isLeader !== m.isLeader} d="M6 10l6 6 6-6" onClick={() => move(i, 1)} />
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit person' : 'Add person'}>
        {editing && (
          <MemberForm
            m={editing}
            onDone={(saved, deleted) => {
              setData(deleted ? list.filter((x) => x.id !== editing.id) : editing.id ? list.map((x) => (x.id === saved!.id ? saved! : x)) : [...list, saved!]);
              setEditing(null);
            }}
          />
        )}
      </Sheet>
    </>
  );
}

function MemberForm({ m, onDone }: { m: Partial<Member>; onDone: (m: Member | null, deleted?: boolean) => void }) {
  const [f, setF] = useState(m);
  const { busy, errors, message, run } = useSave<Member>();
  const photo = useMedia(f.photoId ?? null);
  const set = <K extends keyof Member>(k: K, v: Member[K]) => setF((x) => ({ ...x, [k]: v }));
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const { id, ...json } = f;
        const saved = await run(async () => {
          // A portrait of a team member is useless to the website until it has a description, so fill it in for them.
          if (photo && (!photo.altText.trim() || photo.altText === 'Guide The Youth Foundation photo')) {
            const fixed = await adminApi<AdminMedia>(`/content/media/${photo.id}`, {
              method: 'PATCH',
              json: { altText: `Portrait of ${f.name?.trim() || 'a team member'}`, ...(photo.showsChildren && !photo.consentConfirmed ? { showsChildren: false } : {}) },
            });
            rememberMedia(fixed);
          }
          return adminApi<Member>(id ? `/content/team/${id}` : '/content/team', { method: id ? 'PATCH' : 'POST', json });
        });
        if (saved) onDone(saved);
      }}
    >
      <ImageField label="Photo" value={f.photoId ?? null} onChange={(v) => set('photoId', v)} />
      <Input label="Name" name="name" value={f.name ?? ''} onChange={(e) => set('name', e.target.value)} errors={errors} />
      <Input label="Role" hint="e.g. Founder, Programmes Lead" name="role" value={f.role ?? ''} onChange={(e) => set('role', e.target.value)} errors={errors} />
      <TextArea label="Short bio (optional)" name="bio" value={f.bio ?? ''} onChange={(e) => set('bio', e.target.value)} errors={errors} rows={4} />
      <div className="space-y-3 rounded-2xl bg-white p-4">
        <p className="text-[0.9375rem] font-semibold">Contact &amp; social links <span className="font-normal text-slate">(all optional)</span></p>
        <p className="text-sm text-slate">Paste the link to their profile. An icon appears on the website only for the ones you fill in.</p>
        <Input label="Email" name="email" type="email" inputMode="email" value={f.email ?? ''} onChange={(e) => set('email', e.target.value)} errors={errors} />
        <Input label="LinkedIn" hint="e.g. linkedin.com/in/ama-mensah" name="linkedin" value={f.linkedin ?? ''} onChange={(e) => set('linkedin', e.target.value)} errors={errors} />
        <Input label="Instagram" hint="e.g. instagram.com/gtyf" name="instagram" value={f.instagram ?? ''} onChange={(e) => set('instagram', e.target.value)} errors={errors} />
        <Input label="TikTok" hint="e.g. tiktok.com/@gtyf" name="tiktok" value={f.tiktok ?? ''} onChange={(e) => set('tiktok', e.target.value)} errors={errors} />
      </div>
      <Toggle checked={f.isLeader ?? false} onChange={(v) => set('isLeader', v)} label="This person is a leader" description="Leaders are shown first, with a “Leader” tag and a gold outline." />
      <Toggle checked={f.isVisible ?? true} onChange={(v) => set('isVisible', v)} label="Show on the website" />
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      <div className="flex gap-2">
        <AdminButton type="submit" disabled={busy} className="flex-1">
          {busy ? 'Saving…' : 'Save'}
        </AdminButton>
        {f.id && (
          <AdminButton
            variant="danger"
            onClick={async () => {
              if (!window.confirm(`Remove ${f.name}?`)) return;
              await adminApi(`/content/team/${f.id}`, { method: 'DELETE' });
              onDone(null, true);
            }}
          >
            Remove
          </AdminButton>
        )}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Impact numbers & gift prices
// ---------------------------------------------------------------------------

interface Stat {
  key: string;
  value: number;
  prefix: string;
  suffix: string;
  label: string;
  isYear: boolean;
  isVisible: boolean;
}
interface Item {
  id: string;
  label: string;
  singular: string;
  plural: string;
  unitPrice: number;
  icon: (typeof IMPACT_ICONS)[number];
  programmeId: string | null;
  isActive: boolean;
  needsConfirmation: boolean;
}

export function ImpactEditor() {
  const stats = useAdminData<Stat[]>('/content/impact-stats');
  const items = useAdminData<Item[]>('/content/impact-items');
  const sections = useAdminData<Section[]>('/content/home-sections');
  const [s, setS] = useState<Stat[] | null>(null);
  const [band, setBand] = useState<Section | null>(null);
  const save = useSave<Stat[]>();
  useEffect(() => {
    if (stats.data) setS(stats.data);
  }, [stats.data]);
  useEffect(() => {
    const found = sections.data?.find((x) => x.key === 'impact');
    if (found) setBand(found);
  }, [sections.data]);
  if (!s || !band || !items.data) return <Spinner />;
  const setStat = (i: number, patch: Partial<Stat>) => setS(s.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const setBandField = <K extends keyof Section>(k: K, v: Section[K]) => setBand({ ...band, [k]: v });

  return (
    <>
      <Back />
      <PageHeader title="Impact numbers & gift prices" subtitle="The numbers strip sits right under the pictures at the top of the home page." />
      <form
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          const { key, ...json } = band;
          const saved = await save.run(async () => {
            await adminApi<Section>(`/content/home-sections/${key}`, { method: 'PATCH', json });
            return adminApi<Stat[]>('/content/impact-stats', { method: 'PUT', json: { stats: s } });
          });
          if (saved) setS(saved);
        }}
      >
        <FormSection title="Heading above the numbers" help="Leave the heading empty to show just the numbers.">
          <Input label="Small label" name="eyebrow" value={band.eyebrow} onChange={(e) => setBandField('eyebrow', e.target.value)} />
          <Input label="Heading" name="heading" value={band.heading} onChange={(e) => setBandField('heading', e.target.value)} />
          <Input label="Word to underline (optional)" name="underlineWord" value={band.underlineWord} onChange={(e) => setBandField('underlineWord', e.target.value)} />
          <Toggle checked={band.isVisible} onChange={(v) => setBandField('isVisible', v)} label="Show the numbers strip on the home page" />
        </FormSection>

        <div className="mt-6">
          <FormSection title="The numbers" help="Add, remove and reorder. Update them after each outreach, e.g. total exercise books given. Tick “This is a year” for something like 2023 so it shows without a comma.">
            {s.length === 0 && <p className="text-slate">No numbers yet. Add your first one below.</p>}
            {s.map((st, i) => (
              <div key={st.key} className="space-y-3 rounded-2xl bg-mist p-3">
                <div className="flex items-center gap-1">
                  <span className="label mr-auto text-slate">Number {i + 1}</span>
                  <IconBtn label="Move up" d="M6 14l6-6 6 6" disabled={i === 0} onClick={() => setS(moveItem(s, i, -1))} />
                  <IconBtn label="Move down" d="M6 10l6 6 6-6" disabled={i === s.length - 1} onClick={() => setS(moveItem(s, i, 1))} />
                  <IconBtn label="Remove this number" d="M6 6l12 12M18 6L6 18" onClick={() => setS(s.filter((_, k) => k !== i))} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Input label="Before" hint="e.g. GH₵" name={`p${i}`} value={st.prefix} onChange={(e) => setStat(i, { prefix: e.target.value })} />
                  <Input label="Number" name={`v${i}`} type="number" inputMode="numeric" value={st.value} onChange={(e) => setStat(i, { value: Number(e.target.value) || 0 })} />
                  <Input label="After" hint="e.g. +" name={`s${i}`} value={st.suffix} onChange={(e) => setStat(i, { suffix: e.target.value })} />
                </div>
                <Input label="What it counts" name={`l${i}`} value={st.label} onChange={(e) => setStat(i, { label: e.target.value })} />
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" checked={st.isVisible} onChange={(e) => setStat(i, { isVisible: e.target.checked })} className="size-5 accent-[#0B1422]" />
                    Show
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" checked={st.isYear} onChange={(e) => setStat(i, { isYear: e.target.checked })} className="size-5 accent-[#0B1422]" />
                    This is a year
                  </label>
                </div>
              </div>
            ))}
            {s.length < 16 && (
              <AdminButton type="button" variant="secondary" onClick={() => setS([...s, { key: `stat-${Date.now().toString(36)}`, value: 0, prefix: '', suffix: '+', label: '', isYear: false, isVisible: true }])}>
                + Add a number
              </AdminButton>
            )}
          </FormSection>
        </div>
        <SaveBar busy={save.busy} message={save.message} label="Save numbers" />
      </form>

      <div className="mt-8">
        <FormSection title="What each gift buys" help="Used in the donation card: “GH₵ 200 = 1 full school uniform + 1 pair of shoes”. Prices marked “to confirm” are placeholders.">
          {items.data.map((it) => (
            <ItemRow key={it.id} item={it} onSaved={(saved) => items.setData(items.data!.map((x) => (x.id === saved.id ? saved : x)))} />
          ))}
        </FormSection>
      </div>
    </>
  );
}

function ItemRow({ item, onSaved }: { item: Item; onSaved: (i: Item) => void }) {
  const options = useOptions();
  const [f, setF] = useState(item);
  const [cedis, setCedis] = useState(String(item.unitPrice / 100));
  const { busy, errors, message, run } = useSave<Item>();
  const set = <K extends keyof Item>(k: K, v: Item[K]) => setF((x) => ({ ...x, [k]: v }));
  return (
    <form
      noValidate
      className="space-y-3 rounded-2xl bg-mist p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const { id, ...rest } = f;
        const saved = await run(() => adminApi<Item>(`/content/impact-items/${id}`, { method: 'PATCH', json: { ...rest, unitPrice: Math.round(Number(cedis) * 100) } }), 'Price saved.');
        if (saved) onSaved(saved);
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">{f.label}</p>
        {f.needsConfirmation && <span className="rounded-full bg-[#FFF4D6] px-2 py-0.5 text-xs font-bold text-[#7A4F00]">To confirm</span>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Price (GH₵)" name="unitPrice" type="number" inputMode="decimal" value={cedis} onChange={(e) => setCedis(e.target.value)} errors={errors} />
        <Select label="Programme" name="programmeId" value={f.programmeId ?? ''} onChange={(e) => set('programmeId', e.target.value || null)}>
          <option value="">Where it’s needed most</option>
          {options.programmes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </Select>
        <Input label="One (singular)" hint="e.g. pair of shoes" name="singular" value={f.singular} onChange={(e) => set('singular', e.target.value)} errors={errors} />
        <Input label="Many (plural)" hint="e.g. pairs of shoes" name="plural" value={f.plural} onChange={(e) => set('plural', e.target.value)} errors={errors} />
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={!f.needsConfirmation} onChange={(e) => set('needsConfirmation', !e.target.checked)} className="size-5 accent-[#0B1422]" />
        This price is confirmed
      </label>
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      <AdminButton type="submit" variant="secondary" disabled={busy}>
        {busy ? 'Saving…' : `Save ${formatCedis(Math.round(Number(cedis) * 100) || 0)}`}
      </AdminButton>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Core values
// ---------------------------------------------------------------------------

interface Value {
  name: string;
  description: string;
  descriptionIsDraft: boolean;
}

export function ValuesEditor() {
  const { data } = useAdminData<Value[]>('/content/core-values');
  const [v, setV] = useState<Value[] | null>(null);
  const { busy, message, run } = useSave<Value[]>();
  useEffect(() => {
    if (data) setV(data.map(({ name, description, descriptionIsDraft }) => ({ name, description, descriptionIsDraft })));
  }, [data]);
  if (!v) return <Spinner />;
  const setAt = (i: number, patch: Partial<Value>) => setV(v.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        await run(() => adminApi<Value[]>('/content/core-values', { method: 'PUT', json: { values: v.map((x) => ({ ...x, descriptionIsDraft: false })) } }));
      }}
    >
      <Back />
      <PageHeader title="Core values" subtitle="Shown in the ticker on the home page and on the About page." />
      <div className="space-y-3">
        {v.map((val, i) => (
          <div key={i} className="space-y-3 rounded-3xl bg-white p-5 ring-1 ring-ink/[0.05]">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input label={`Value ${i + 1}`} name={`n${i}`} value={val.name} onChange={(e) => setAt(i, { name: e.target.value })} />
              </div>
              <IconBtn label="Move up" onClick={() => setV(moveItem(v, i, -1))} disabled={i === 0} d="M6 14l6-6 6 6" />
              <IconBtn label="Remove" onClick={() => setV(v.filter((_, k) => k !== i))} d="M6 6l12 12M18 6L6 18" />
            </div>
            <TextArea label="One-line explanation" name={`d${i}`} value={val.description} rows={2} onChange={(e) => setAt(i, { description: e.target.value })} />
          </div>
        ))}
        <AdminButton variant="secondary" onClick={() => setV([...v, { name: '', description: '', descriptionIsDraft: false }])}>
          + Add a value
        </AdminButton>
      </div>
      <SaveBar busy={busy} message={message} label="Save values" />
    </form>
  );
}

