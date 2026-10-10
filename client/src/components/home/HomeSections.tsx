import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { formatCedis, formatDateRange, yearOf } from '@gtyf/shared';
import type { EventSummary, HomeSection, ImpactItem, NewsSummary, ProgrammeSummary } from '@gtyf/shared/api';
import { useSite } from '../../lib/site';
import { EventCard, NewsCard } from '../cards';
import { Countdown } from '../Countdown';
import { ImpactIcon, programmeIcon } from '../icons/ImpactIcon';
import { NewsletterForm } from '../NewsletterForm';
import { ButtonLink } from '../ui/Button';
import { Picture } from '../ui/Picture';
import { Reveal } from '../ui/Reveal';
import { ArrowIcon, SectionHeading } from '../ui/SectionHeading';

/** Four programmes as a 2×2 editorial grid with big photos. */
export function ProgrammeGrid({ programmes, section }: { programmes: ProgrammeSummary[]; section?: HomeSection }) {
  const { common } = useSite();
  return (
    <section className="py-16 md:py-32">
      <div className="container-page">
        <Reveal>
          <SectionHeading
            eyebrow={section?.eyebrow}
            heading={section?.heading ?? ''}
            underlineWord={section?.underlineWord}
            aside={
              <Link to="/programmes" className="inline-flex items-center gap-2 font-semibold hover:text-slate">
                {common.allProgrammes} <ArrowIcon />
              </Link>
            }
          />
        </Reveal>
        <ul className="mt-14 grid gap-x-6 gap-y-14 md:grid-cols-2">
          {programmes.map((p, i) => (
            <Reveal as="li" key={p.slug} delay={(i % 2) * 0.1} className="group relative">
              <div className="relative aspect-[4/3] overflow-hidden rounded-card">
                <div className="absolute inset-0 transition-transform duration-[1200ms] ease-guide group-hover:scale-[1.05]">
                  <Picture image={p.heroImage} sizes="(min-width: 768px) 50vw, 100vw" placeholderIcon={programmeIcon(p.slug)} />
                </div>
              </div>
              <p className="label mt-6 text-slate">{String(i + 1).padStart(2, '0')}</p>
              <h3 className="mt-2 text-title">
                <Link to={`/programmes/${p.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
                  {p.title}
                </Link>
              </h3>
              <p className="prose-measure mt-3 text-slate">{p.summary}</p>
              <span className="mt-4 inline-flex items-center gap-2 font-semibold">
                {common.learnMore} <ArrowIcon className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
              <span aria-hidden="true" className="pointer-events-none absolute -inset-3 rounded-card ring-lantern group-has-[a:focus-visible]:ring-3" />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Next outreach with a live countdown, or a graceful "being planned" state with signup. */
export function UpcomingFeature({ event, section }: { event: EventSummary | null; section?: HomeSection }) {
  const { pages } = useSite();
  const labels = pages.event;

  if (!event) {
    return (
      <section className="py-16 md:py-32">
        <Reveal className="container-page">
          <div className="grid items-center gap-10 rounded-card bg-mist p-8 md:grid-cols-[1.2fr_1fr] md:p-14">
            <SectionHeading eyebrow={section?.eyebrow} heading={section?.heading ?? ''} underlineWord={section?.underlineWord} body={section?.body || pages.events.emptyUpcoming} />
            <NewsletterForm source="upcoming-empty-state" successMessage="Thank you. You'll be the first to hear." />
          </div>
        </Reveal>
      </section>
    );
  }

  return (
    <section className="py-16 md:py-32">
      <div className="container-page">
        <Reveal>
          <SectionHeading eyebrow={section?.eyebrow} heading={section?.heading ?? ''} underlineWord={section?.underlineWord} />
        </Reveal>
        <Reveal className="mt-12 grid overflow-hidden rounded-card bg-ink text-white md:grid-cols-2">
          <div className="relative min-h-72">
            <Picture image={event.heroImage} sizes="(min-width: 768px) 50vw, 100vw" placeholderIcon={programmeIcon(event.programme?.slug)} />
          </div>
          <div className="flex flex-col gap-6 p-8 md:p-12">
            <p className="label text-lantern">
              <time dateTime={event.dateStart}>{formatDateRange(event.dateStart, event.dateEnd)}</time> · {event.venue}
            </p>
            <h3 className="text-title">
              <Link to={`/events/${event.slug}`} className="hover:text-lantern">
                {event.title}
              </Link>
            </h3>
            {event.teaser && <p className="text-white/70">{event.teaser}</p>}
            <Countdown date={event.dateStart} time={event.startTime} tone="dark" />
            <div className="mt-auto flex flex-wrap gap-3">
              <ButtonLink to={`/donate?event=${event.slug}`}>{labels.supportLabel}</ButtonLink>
              <ButtonLink to={`/get-involved?event=${event.slug}#volunteer`} variant="secondary-light">
                {labels.volunteerLabel}
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/** Horizontal, snap-scrolling timeline of past outreach, oldest first. */
export function JourneyTimeline({ events, section }: { events: EventSummary[]; section?: HomeSection }) {
  const track = useRef<HTMLOListElement>(null);
  if (!events.length) return null;

  const scroll = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const card = el.querySelector('li');
    el.scrollBy({ left: dir * ((card?.clientWidth ?? 320) + 24), behavior: 'smooth' });
  };

  return (
    <section className="overflow-hidden bg-mist py-16 md:py-32">
      <div className="container-page">
        <Reveal>
          <SectionHeading
            eyebrow={section?.eyebrow}
            heading={section?.heading ?? ''}
            underlineWord={section?.underlineWord}
            aside={
              <div className="flex gap-2">
                {([-1, 1] as const).map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => scroll(dir)}
                    className="grid size-12 place-items-center rounded-full border-[1.5px] border-ink/15 transition-colors hover:border-ink hover:bg-ink hover:text-white"
                  >
                    <span className="sr-only">{dir === 1 ? 'Later events' : 'Earlier events'}</span>
                    <ArrowIcon className={`size-5 ${dir === -1 ? 'rotate-180' : ''}`} />
                  </button>
                ))}
              </div>
            }
          />
        </Reveal>
      </div>
      <ol
        ref={track}
        tabIndex={0}
        aria-label="Timeline of past events"
        className="scrollbar-none mt-14 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-[max(1.25rem,calc((100vw-80rem)/2+2.5rem))] pb-4 focus-visible:outline-offset-[-3px]"
      >
        {events.map((e, i) => {
          const year = yearOf(e.dateStart);
          const newYear = i === 0 || yearOf(events[i - 1]!.dateStart) !== year;
          return (
            <li key={e.slug} className="w-[82vw] max-w-sm shrink-0 snap-start">
              <div className="mb-5 flex items-center gap-3" aria-hidden={!newYear || undefined}>
                <span className={`font-display text-3xl font-bold ${newYear ? 'text-ink' : 'text-transparent'}`}>{year}</span>
                <span className="h-px flex-1 bg-ink/15" />
                <span className="size-2.5 rounded-full bg-lantern" />
              </div>
              <EventCard event={e} />
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function LatestNews({ posts, section }: { posts: NewsSummary[]; section?: HomeSection }) {
  const { common } = useSite();
  if (!posts.length) return null; // no placeholder news: the section appears with the first real story
  return (
    <section className="py-16 md:py-32">
      <div className="container-page">
        <Reveal>
          <SectionHeading
            eyebrow={section?.eyebrow}
            heading={section?.heading ?? ''}
            underlineWord={section?.underlineWord}
            aside={
              <Link to="/news" className="inline-flex items-center gap-2 font-semibold hover:text-slate">
                {common.allNews} <ArrowIcon />
              </Link>
            }
          />
        </Reveal>
        <ul className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p, i) => (
            <Reveal as="li" key={p.slug} delay={i * 0.08}>
              <NewsCard post={p} />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Impact items as lines on an exercise-book page: price → what it buys. */
export function ImpactItemList({ items }: { items: ImpactItem[] }) {
  if (!items.length) return null;
  return (
    <ul className="divide-y divide-ink/[0.07] rounded-card bg-white px-6 py-2 text-ink shadow-soft">
      {items.map((it) => (
        <li key={it.key} className="flex min-h-16 items-center gap-4">
          <ImpactIcon name={it.icon} className="size-9 shrink-0 text-ink" />
          <span className="flex-1 leading-snug">
            <span className="block font-semibold">1 {it.singular}</span>
          </span>
          <span className="font-mono text-sm font-semibold whitespace-nowrap">{formatCedis(it.unitPrice)}</span>
        </li>
      ))}
    </ul>
  );
}
