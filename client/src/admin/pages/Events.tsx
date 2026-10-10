import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { formatDateRange, todayInGhana } from '@gtyf/shared';
import type { EventInput } from '@gtyf/shared/admin-content';
import { adminApi, useAdminData } from '../auth';
import { FormSection, ImageField, ListEditor, PublishSwitch, SaveBar, Thumb, Toggle, useMedia, useOptions, useSave } from '../content/kit';
import { AdminButton, Card, Input, PageHeader, Select, Spinner, TextArea } from '../ui';

interface EventRow {
  id: string;
  slug: string;
  title: string;
  dateStart: string;
  dateEnd: string | null;
  venue: string;
  status: 'draft' | 'published';
  heroImageId: string | null;
  programmeTitle: string | null;
}

export function EventsList() {
  const { data, loading } = useAdminData<EventRow[]>('/content/events');
  const today = todayInGhana();
  const upcoming = data?.filter((e) => (e.dateEnd ?? e.dateStart) >= today) ?? [];
  const past = data?.filter((e) => (e.dateEnd ?? e.dateStart) < today) ?? [];

  return (
    <>
      <PageHeader title="Events" subtitle="Upcoming outreach appears on the home page with a countdown." actions={<Link to="/admin/content/events/new" className="inline-flex h-12 items-center rounded-full bg-ink px-5 font-semibold text-white">+ Add event</Link>} />
      {loading && !data ? (
        <Spinner />
      ) : (
        <div className="space-y-6">
          <EventGroup title="Upcoming" rows={upcoming} empty="Nothing planned yet. Add your next outreach so supporters can follow along." />
          <EventGroup title="Past" rows={past} empty="No past events." />
        </div>
      )}
    </>
  );
}

function EventGroup({ title, rows, empty }: { title: string; rows: EventRow[]; empty: string }) {
  return (
    <Card>
      <h2 className="font-display text-lg font-bold">
        {title} <span className="text-slate">({rows.length})</span>
      </h2>
      {rows.length === 0 ? (
        <p className="py-4 text-slate">{empty}</p>
      ) : (
        <ul className="mt-2 divide-y divide-ink/[0.07]">
          {rows.map((e) => (
            <li key={e.id}>
              <Link to={`/admin/content/events/${e.id}`} className="-mx-2 flex items-center gap-3 rounded-2xl px-2 py-3 hover:bg-mist">
                <RowThumb id={e.heroImageId} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{e.title}</span>
                  <span className="block truncate text-sm text-slate">
                    {formatDateRange(e.dateStart, e.dateEnd)} · {e.venue}
                  </span>
                </span>
                <StatusPill status={e.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function RowThumb({ id }: { id: string | null }) {
  const m = useMedia(id);
  return m ? <Thumb m={m} className="size-14 shrink-0 rounded-xl" /> : <span className="size-14 shrink-0 rounded-xl bg-mist" aria-hidden="true" />;
}

export function StatusPill({ status }: { status: 'draft' | 'published' }) {
  return status === 'published' ? (
    <span className="shrink-0 rounded-full bg-[#E7F6EC] px-2.5 py-1 text-[0.8125rem] font-semibold text-[#166534]">● Live</span>
  ) : (
    <span className="shrink-0 rounded-full bg-ink/[0.06] px-2.5 py-1 text-[0.8125rem] font-semibold text-slate">○ Draft</span>
  );
}

type EventForm = Required<Omit<EventInput, 'slug' | 'participants'>> & { slug: string; participants: string };
const EMPTY: EventForm = {
  title: '',
  slug: '',
  programmeId: null,
  dateStart: '',
  dateEnd: null,
  startTime: '',
  venue: '',
  participants: '',
  summary: '',
  story: '',
  closingNote: '',
  highlights: [],
  schoolsVisited: [],
  heroImageId: null,
  volunteersWanted: false,
  status: 'draft',
  seoTitle: '',
  seoDescription: '',
};

export function EventEdit() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const options = useOptions();
  const { data } = useAdminData<Omit<EventForm, 'participants'> & { id: string; participants: number | null }>(isNew ? null : `/content/events/${id}`);
  const [f, setF] = useState<EventForm>(EMPTY);
  const { busy, errors, message, run } = useSave<{ id: string; slug: string }>();
  const [slug, setSlug] = useState('');

  useEffect(() => {
    if (!data) return;
    setF({ ...EMPTY, ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? (k in EMPTY ? EMPTY[k as keyof EventForm] : v)])), participants: data.participants?.toString() ?? '' } as EventForm);
    setSlug(data.slug);
  }, [data]);

  if (!isNew && !data) return <Spinner />;
  const set = <K extends keyof EventForm>(k: K, v: EventForm[K]) => setF((x) => ({ ...x, [k]: v }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const json = {
      ...f,
      slug: f.slug || undefined,
      participants: f.participants ? Number(f.participants) : null,
      dateEnd: f.dateEnd || null,
      highlights: f.highlights.map((h) => h.trim()).filter(Boolean),
      schoolsVisited: f.schoolsVisited.map((h) => h.trim()).filter(Boolean),
    };
    const saved = await run(
      () => adminApi<{ id: string; slug: string }>(isNew ? '/content/events' : `/content/events/${id}`, { method: isNew ? 'POST' : 'PATCH', json }),
      f.status === 'published' ? 'Saved. It’s live on the website.' : 'Saved as a draft (not visible to the public).',
    );
    if (saved) {
      setSlug(saved.slug);
      set('slug', saved.slug);
      if (isNew) navigate(`/admin/content/events/${saved.id}`, { replace: true });
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Link to="/admin/content/events" className="mb-3 inline-flex min-h-11 items-center font-semibold text-slate hover:text-ink">
        ← Events
      </Link>
      <PageHeader title={isNew ? 'New event' : f.title || 'Event'} />
      <div className="space-y-4">
        <PublishSwitch value={f.status} onChange={(v) => set('status', v)} />
        <FormSection title="The basics">
          <Input label="Title" name="title" value={f.title} onChange={(e) => set('title', e.target.value)} errors={errors} placeholder="e.g. Back to School Outreach, Sunuroase" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Input label="Date" name="dateStart" type="date" value={f.dateStart} onChange={(e) => set('dateStart', e.target.value)} errors={errors} />
            <Input label="End date (optional)" name="dateEnd" type="date" value={f.dateEnd ?? ''} onChange={(e) => set('dateEnd', e.target.value || null)} errors={errors} />
            <Input label="Start time (optional)" hint="Used for the countdown." name="startTime" type="time" value={f.startTime ?? ''} onChange={(e) => set('startTime', e.target.value)} errors={errors} />
          </div>
          <Input label="Venue" name="venue" value={f.venue} onChange={(e) => set('venue', e.target.value)} errors={errors} placeholder="e.g. Assemblies of God Church, Wamfie" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Programme" name="programmeId" value={f.programmeId ?? ''} onChange={(e) => set('programmeId', e.target.value || null)}>
              <option value="">None</option>
              {options.programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
            <Input label="Participants (optional)" name="participants" type="number" inputMode="numeric" value={f.participants} onChange={(e) => set('participants', e.target.value)} errors={errors} />
          </div>
          <Toggle checked={f.volunteersWanted} onChange={(v) => set('volunteersWanted', v)} label="Looking for volunteers" description="Shows a “Volunteer for this event” button." />
        </FormSection>

        <FormSection title="Main photo">
          <ImageField label="Cover photo" help="Shown large at the top of the event page and on cards." value={f.heroImageId} onChange={(v) => set('heroImageId', v)} defaults={{ programmeId: f.programmeId ?? undefined, eventId: isNew ? undefined : id }} />
        </FormSection>

        <FormSection title="The story" help="Write it like you’d tell a friend. Leave out children’s full names.">
          <TextArea label="Short summary (optional)" hint="One or two sentences for event cards." name="summary" value={f.summary ?? ''} onChange={(e) => set('summary', e.target.value)} errors={errors} rows={2} />
          <TextArea label="Story" hint="Separate paragraphs with an empty line." name="story" value={f.story ?? ''} onChange={(e) => set('story', e.target.value)} errors={errors} rows={7} />
          <ListEditor label="Highlights" help="Short bullet points, e.g. “Donated 30 school uniforms”." items={f.highlights} onChange={(v) => set('highlights', v)} placeholder="A highlight" />
          <ListEditor label="Schools visited (optional)" items={f.schoolsVisited} onChange={(v) => set('schoolsVisited', v)} placeholder="School name" addLabel="+ Add a school" />
          <TextArea label="Closing note (optional)" hint="Shown as a highlighted quote at the end." name="closingNote" value={f.closingNote ?? ''} onChange={(e) => set('closingNote', e.target.value)} errors={errors} rows={3} />
        </FormSection>

        {!isNew && (
          <FormSection title="Event photos" help="Photos tagged to this event appear in its gallery. Tag them in Photos, or upload here.">
            <Link to="/admin/photos" className="font-semibold text-ink underline decoration-lantern decoration-2 underline-offset-4">
              Open the photo library →
            </Link>
          </FormSection>
        )}

        <FormSection title="Link previews (optional)" help="What appears when this page is shared on WhatsApp or Facebook.">
          <Input label="Web address" hint={slug ? `guidetheyouth…/events/${slug}` : 'Made automatically from the title.'} name="slug" value={f.slug} onChange={(e) => set('slug', e.target.value)} errors={errors} />
          <Input label="Share title" name="seoTitle" value={f.seoTitle ?? ''} onChange={(e) => set('seoTitle', e.target.value)} errors={errors} />
          <TextArea label="Share description" name="seoDescription" value={f.seoDescription ?? ''} onChange={(e) => set('seoDescription', e.target.value)} errors={errors} rows={2} />
        </FormSection>
      </div>

      <SaveBar
        busy={busy}
        message={message}
        label={f.status === 'published' ? 'Save & publish' : 'Save draft'}
        extra={
          !isNew && (
            <>
              <a href={`/events/${slug}${f.status === 'draft' ? '?preview=1' : ''}`} target="_blank" rel="noopener" className="inline-flex h-12 items-center rounded-full bg-white px-5 font-semibold ring-1 ring-ink/15">
                {f.status === 'draft' ? 'Preview' : 'View'}
              </a>
              <AdminButton
                variant="danger"
                onClick={async () => {
                  if (!window.confirm('Delete this event? This can’t be undone.')) return;
                  await adminApi(`/content/events/${id}`, { method: 'DELETE' });
                  navigate('/admin/content/events');
                }}
              >
                Delete
              </AdminButton>
            </>
          )
        }
      />
    </form>
  );
}
