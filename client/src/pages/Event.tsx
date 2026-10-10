import { Link, useParams } from 'react-router-dom';
import { formatDateRange, paragraphs } from '@gtyf/shared';
import type { EventDetail } from '@gtyf/shared/api';
import { DonateBand, FactStrip, Paragraphs, PhotoHero } from '../components/blocks';
import { Countdown } from '../components/Countdown';
import { programmeIcon } from '../components/icons/ImpactIcon';
import { GalleryGrid } from '../components/Lightbox';
import { Seo } from '../components/Seo';
import { ButtonLink } from '../components/ui/Button';
import { Reveal } from '../components/ui/Reveal';
import { ArrowIcon, SectionHeading } from '../components/ui/SectionHeading';
import { useContent } from '../lib/content';
import { useSite } from '../lib/site';
import NotFound from './NotFound';
import { PageLoading } from './PageLoading';

export default function Event() {
  const { slug } = useParams();
  const { data: e, loading } = useContent<EventDetail>(`/content/events/${slug}`);
  const { pages, common } = useSite();
  const labels = pages.event;

  if (!e) return loading ? <PageLoading /> : <NotFound withNavOffset />;

  const when = formatDateRange(e.dateStart, e.dateEnd);
  const facts = [
    { label: 'Date', value: <time dateTime={e.dateStart}>{when}</time> },
    { label: 'Venue', value: e.venue },
    ...(e.participants ? [{ label: 'Participants', value: e.participants.toLocaleString('en-GH') }] : []),
    ...(e.programme
      ? [
          {
            label: 'Programme',
            value: (
              <Link to={`/programmes/${e.programme.slug}`} className="underline decoration-lantern decoration-2 underline-offset-4 hover:text-slate">
                {e.programme.shortTitle}
              </Link>
            ),
          },
        ]
      : []),
  ];
  const description = e.seoDescription ?? (e.teaser || `${e.title}, ${when}, ${e.venue}.`);

  return (
    <>
      <Seo title={e.seoTitle ?? e.title} description={description} image={e.heroImage?.ogUrl ?? e.heroImage?.src} type="article" />
      <PhotoHero
        image={e.heroImage}
        icon={programmeIcon(e.programme?.slug)}
        eyebrow={e.isUpcoming ? common.upcomingEventEyebrow : (e.programme?.shortTitle ?? '')}
        title={e.title}
      >
        {e.isUpcoming && (
          <div className="mt-8 space-y-8">
            <Countdown date={e.dateStart} time={e.startTime} tone="dark" />
            <div className="flex flex-wrap gap-3">
              <ButtonLink to={`/donate?event=${e.slug}`} size="lg">
                {labels.supportLabel}
              </ButtonLink>
              <ButtonLink to={`/get-involved?event=${e.slug}#volunteer`} size="lg" variant="secondary-light">
                {labels.volunteerLabel}
              </ButtonLink>
            </div>
          </div>
        )}
      </PhotoHero>

      <div className="container-page -mt-px pt-10 md:pt-14">
        <Reveal>
          <FactStrip facts={facts} />
        </Reveal>
      </div>

      <article className="container-page grid gap-14 py-16 md:py-24 lg:grid-cols-12">
        <div className="space-y-14 lg:col-span-8">
          {e.story && (
            <Reveal>
              <Paragraphs items={paragraphs(e.story)} lead />
            </Reveal>
          )}

          {e.highlights.length > 0 && (
            <Reveal>
              <h2 className="text-title">{labels.highlightsHeading}</h2>
              <ul className="mt-6 space-y-4">
                {e.highlights.map((h) => (
                  <li key={h} className="flex gap-4 text-lead">
                    <span aria-hidden="true" className="mt-[0.6em] size-2 shrink-0 rounded-full bg-lantern" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          )}

          {e.schoolsVisited.length > 0 && (
            <Reveal>
              <h2 className="text-title">{labels.schoolsHeading}</h2>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {e.schoolsVisited.map((s) => (
                  <li key={s} className="rounded-2xl bg-mist px-5 py-4 font-semibold">
                    {s}
                  </li>
                ))}
              </ul>
            </Reveal>
          )}

          {e.closingNote && (
            <Reveal>
              <figure className="rounded-card border-l-4 border-lantern bg-[#FFF6E0] p-7 md:p-9">
                <blockquote className="font-display text-[1.25rem] leading-snug font-semibold tracking-display md:text-[1.5rem]">
                  {e.closingNote}
                </blockquote>
              </figure>
            </Reveal>
          )}
        </div>

        <aside className="lg:col-span-3 lg:col-start-10">
          <div className="space-y-4 lg:sticky lg:top-28">
            {e.programme && (
              <Link
                to={`/programmes/${e.programme.slug}`}
                className="group flex items-center justify-between gap-3 rounded-card bg-mist p-6 font-semibold transition-colors hover:bg-ink hover:text-white"
              >
                <span>
                  <span className="label block text-slate group-hover:text-white/60">Part of</span>
                  <span className="mt-1 block">{e.programme.shortTitle}</span>
                </span>
                <ArrowIcon />
              </Link>
            )}
            <Link to="/events?tab=past" className="inline-flex items-center gap-2 px-1 font-semibold hover:text-slate">
              <ArrowIcon className="size-4 rotate-180" /> All events
            </Link>
          </div>
        </aside>
      </article>

      {e.gallery.length > 0 && (
        <section className="pb-14 md:pb-28">
          <div className="container-page">
            <Reveal>
              <SectionHeading heading={labels.galleryHeading} />
            </Reveal>
            <div className="mt-10">
              <GalleryGrid images={e.gallery} />
            </div>
          </div>
        </section>
      )}

      <DonateBand cause={e.programme?.slug} />
    </>
  );
}
