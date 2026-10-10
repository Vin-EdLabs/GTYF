import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { formatDate } from '@gtyf/shared';
import { adminApi, useAdminData } from '../auth';
import { FormSection, ImageField, MediaPicker, PublishSwitch, SaveBar, useOptions, useSave } from '../content/kit';
import { Card, Input, PageHeader, Select, Spinner, TextArea } from '../ui';
import { RowThumb, StatusPill } from './Events';

interface NewsRow {
  id: string;
  slug: string;
  title: string;
  status: 'draft' | 'published';
  publishedAt: string | null;
  updatedAt: string;
  coverImageId: string | null;
}

export function NewsList() {
  const { data, loading } = useAdminData<NewsRow[]>('/content/news');
  return (
    <>
      <PageHeader title="News" subtitle="Stories appear on the News page and the home page." actions={<Link to="/admin/content/news/new" className="inline-flex h-12 items-center rounded-full bg-ink px-5 font-semibold text-white">+ Write a story</Link>} />
      {loading && !data ? (
        <Spinner />
      ) : (
        <Card>
          {data?.length ? (
            <ul className="divide-y divide-ink/[0.07]">
              {data.map((n) => (
                <li key={n.id}>
                  <Link to={`/admin/content/news/${n.id}`} className="-mx-2 flex items-center gap-3 rounded-2xl px-2 py-3 hover:bg-mist">
                    <RowThumb id={n.coverImageId} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{n.title}</span>
                      <span className="block text-sm text-slate">{n.publishedAt ? `Published ${formatDate(n.publishedAt)}` : `Edited ${formatDate(n.updatedAt)}`}</span>
                    </span>
                    <StatusPill status={n.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-slate">No stories yet. Write your first one after your next outreach.</p>
          )}
        </Card>
      )}
    </>
  );
}

interface NewsForm {
  title: string;
  slug: string;
  excerpt: string;
  bodyJson: unknown;
  bodyHtml: string;
  coverImageId: string | null;
  programmeId: string | null;
  eventId: string | null;
  status: 'draft' | 'published';
  seoTitle: string;
  seoDescription: string;
}
const EMPTY: NewsForm = { title: '', slug: '', excerpt: '', bodyJson: null, bodyHtml: '', coverImageId: null, programmeId: null, eventId: null, status: 'draft', seoTitle: '', seoDescription: '' };

export function NewsEdit() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const options = useOptions();
  const { data } = useAdminData<NewsForm & { id: string }>(isNew ? null : `/content/news/${id}`);
  const [f, setF] = useState<NewsForm>(EMPTY);
  const { busy, errors, message, run } = useSave<NewsForm & { id: string }>();
  const set = <K extends keyof NewsForm>(k: K, v: NewsForm[K]) => setF((x) => ({ ...x, [k]: v }));

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false, autolink: true } }), Image],
    content: '',
    immediatelyRender: false,
    editorProps: { attributes: { class: 'prose-gtyf min-h-64 max-w-none px-4 py-3 outline-none', 'aria-label': 'Story text' } },
    onUpdate: ({ editor }) => setF((x) => ({ ...x, bodyHtml: editor.getHTML(), bodyJson: editor.getJSON() })),
  });

  useEffect(() => {
    if (!data) return;
    setF({ ...EMPTY, ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? EMPTY[k as keyof NewsForm] ?? v])) } as NewsForm);
    if (editor && !editor.isDestroyed) editor.commands.setContent(data.bodyJson && typeof data.bodyJson === 'object' ? (data.bodyJson as object) : data.bodyHtml || '');
  }, [data, editor]);

  if (!isNew && !data) return <Spinner />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const saved = await run(
      () => adminApi<NewsForm & { id: string }>(isNew ? '/content/news' : `/content/news/${id}`, { method: isNew ? 'POST' : 'PATCH', json: { ...f, slug: f.slug || undefined } }),
      f.status === 'published' ? 'Published. It’s live on the website.' : 'Saved as a draft (not visible to the public).',
    );
    if (saved) {
      set('slug', saved.slug);
      if (isNew) navigate(`/admin/content/news/${saved.id}`, { replace: true });
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Link to="/admin/content/news" className="mb-3 inline-flex min-h-11 items-center font-semibold text-slate hover:text-ink">
        ← News
      </Link>
      <PageHeader title={isNew ? 'New story' : f.title || 'Story'} />
      <div className="space-y-4">
        <PublishSwitch value={f.status} onChange={(v) => set('status', v)} />
        <FormSection title="Story">
          <Input label="Headline" name="title" value={f.title} onChange={(e) => set('title', e.target.value)} errors={errors} placeholder="e.g. 1,000 exercise books reach Wamfie" />
          <TextArea label="Short introduction" hint="One or two sentences shown on news cards." name="excerpt" value={f.excerpt} onChange={(e) => set('excerpt', e.target.value)} errors={errors} rows={2} />
          <ImageField label="Cover photo" value={f.coverImageId} onChange={(v) => set('coverImageId', v)} />
          <div>
            <p className="mb-1.5 text-[0.9375rem] font-semibold">Full story</p>
            <div className="overflow-hidden rounded-2xl border-[1.5px] border-ink/15 bg-white focus-within:border-ink">
              <Toolbar editor={editor} />
              <EditorContent editor={editor} />
            </div>
          </div>
        </FormSection>
        <FormSection title="Connect it (optional)">
          <div className="grid gap-3 sm:grid-cols-2">
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
                  {ev.title}
                </option>
              ))}
            </Select>
          </div>
        </FormSection>
        <FormSection title="Link previews (optional)" help="What appears when this story is shared on WhatsApp or Facebook.">
          <Input label="Web address" hint="Made automatically from the headline." name="slug" value={f.slug} onChange={(e) => set('slug', e.target.value)} errors={errors} />
          <Input label="Share title" name="seoTitle" value={f.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} errors={errors} />
          <TextArea label="Share description" name="seoDescription" value={f.seoDescription} onChange={(e) => set('seoDescription', e.target.value)} errors={errors} rows={2} />
        </FormSection>
      </div>
      <SaveBar
        busy={busy}
        message={message}
        label={f.status === 'published' ? 'Save & publish' : 'Save draft'}
        extra={
          !isNew &&
          f.slug && (
            <>
              <a href={`/news/${f.slug}${f.status === 'draft' ? '?preview=1' : ''}`} target="_blank" rel="noopener" className="inline-flex h-12 items-center rounded-full bg-white px-5 font-semibold ring-1 ring-ink/15">
                {f.status === 'draft' ? 'Preview' : 'View'}
              </a>
              <button
                type="button"
                className="h-12 rounded-full px-4 font-semibold text-margin hover:bg-margin/5"
                onClick={async () => {
                  if (!window.confirm('Delete this story? This can’t be undone.')) return;
                  await adminApi(`/content/news/${id}`, { method: 'DELETE' });
                  navigate('/admin/content/news');
                }}
              >
                Delete
              </button>
            </>
          )
        }
      />
    </form>
  );
}

/** Formatting buttons, big enough for thumbs. */
function Toolbar({ editor }: { editor: Editor | null }) {
  const [picking, setPicking] = useState(false);
  if (!editor) return <div className="h-12 border-b border-ink/10 bg-mist" />;
  const btn = (label: string, active: boolean, run: () => void, content: React.ReactNode) => (
    <button type="button" aria-label={label} title={label} aria-pressed={active} onClick={run} className={`grid h-10 min-w-10 place-items-center rounded-xl px-2 font-semibold ${active ? 'bg-ink text-white' : 'hover:bg-ink/5'}`}>
      {content}
    </button>
  );
  return (
    <div className="sticky top-16 z-[1] flex flex-wrap gap-1 border-b border-ink/10 bg-mist p-1.5 lg:top-0">
      {btn('Heading', editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H')}
      {btn('Bold', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <b>B</b>)}
      {btn('Italic', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <i>I</i>)}
      {btn('Bullet list', editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), '•')}
      {btn('Numbered list', editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), '1.')}
      {btn('Quote', editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run(), '“')}
      {btn('Link', editor.isActive('link'), () => {
        const prev = editor.getAttributes('link').href as string | undefined;
        const url = window.prompt('Link address (https://…)', prev ?? 'https://');
        if (url === null) return;
        if (!url || url === 'https://') editor.chain().focus().unsetLink().run();
        else editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
      }, <span className="text-sm">Link</span>)}
      {btn('Insert photo', false, () => setPicking(true), <span className="text-sm">+ Photo</span>)}
      <MediaPicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(m) => {
          editor.chain().focus().setImage({ src: m.src, alt: m.altText }).run();
          setPicking(false);
        }}
      />
    </div>
  );
}
