import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { GalleryContent } from '@gtyf/shared/api';
import { EmptyState } from '../components/cards';
import { GalleryGrid } from '../components/Lightbox';
import { Seo } from '../components/Seo';
import { PageIntro } from '../components/ui/SectionHeading';
import { useContent } from '../lib/content';
import { useSite } from '../lib/site';

/** Photo gallery with programme and year filters (kept in the URL so a filtered view can be shared). */
export default function Gallery() {
  const { pages } = useSite();
  const p = pages.gallery;
  const { data } = useContent<GalleryContent>('/content/gallery');
  const [params, setParams] = useSearchParams();
  const programme = params.get('programme');
  const year = params.get('year');

  const items = useMemo(
    () =>
      (data?.items ?? []).filter(
        (i) => (!programme || i.programme?.slug === programme) && (!year || String(i.year) === year),
      ),
    [data, programme, year],
  );

  const setFilter = (key: 'programme' | 'year', value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true, preventScrollReset: true });
  };

  const hasPhotos = (data?.items.length ?? 0) > 0;

  return (
    <>
      <Seo title={p.eyebrow} description={p.intro} />
      <PageIntro eyebrow={p.eyebrow} heading={p.heading} underlineWord={p.underlineWord} intro={p.intro} />
      <section className="container-page pb-16 md:pb-32">
        {!hasPhotos ? (
          <EmptyState>{p.empty}</EmptyState>
        ) : (
          <>
            <div className="mb-10 flex flex-col gap-4">
              <FilterRow
                label="Programme"
                value={programme}
                options={data!.programmes.map((x) => ({ value: x.slug, label: x.shortTitle }))}
                onChange={(v) => setFilter('programme', v)}
              />
              {data!.years.length > 1 && (
                <FilterRow
                  label="Year"
                  value={year}
                  options={data!.years.map((y) => ({ value: String(y), label: String(y) }))}
                  onChange={(v) => setFilter('year', v)}
                />
              )}
            </div>
            {items.length ? (
              <GalleryGrid images={items} columns="md:columns-3 lg:columns-4" />
            ) : (
              <EmptyState>No photos match these filters yet.</EmptyState>
            )}
          </>
        )}
      </section>
    </>
  );
}

function FilterRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: { value: string; label: string }[];
  onChange: (v: string | null) => void;
}) {
  const chip = (active: boolean) =>
    `rounded-full px-4 py-2 text-[0.9375rem] font-semibold transition-colors ${
      active ? 'bg-ink text-white' : 'bg-mist text-ink/70 hover:text-ink'
    }`;
  return (
    <div role="group" aria-label={`Filter by ${label.toLowerCase()}`} className="flex flex-wrap items-center gap-2">
      <span className="label mr-2 text-slate">{label}</span>
      <button type="button" aria-pressed={!value} onClick={() => onChange(null)} className={chip(!value)}>
        All
      </button>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)} className={chip(value === o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
