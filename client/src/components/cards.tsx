import { Link } from 'react-router-dom';
import { useSite } from '../lib/site';
import { formatDate, formatDateRange } from '@gtyf/shared';
import type { EventSummary, NewsSummary } from '@gtyf/shared/api';
import { programmeIcon } from './icons/ImpactIcon';
import { Picture } from './ui/Picture';
import { ArrowIcon } from './ui/SectionHeading';

/** Event card: photo, date + venue, title, one-line teaser. */
export function EventCard({ event, headingLevel = 'h3' }: { event: EventSummary; headingLevel?: 'h2' | 'h3' }) {
  const H = headingLevel;
  const { common } = useSite();
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card bg-white shadow-soft">
      <div className="relative aspect-[4/3] overflow-hidden">
        <div className="absolute inset-0 transition-transform duration-700 ease-guide group-hover:scale-[1.04]">
          <Picture
            image={event.heroImage}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            placeholderIcon={programmeIcon(event.programme?.slug)}
            placeholderTone="light"
          />
        </div>
        {event.isUpcoming && (
          <span className="label absolute top-4 left-4 rounded-full bg-lantern px-3 py-1.5 text-ink">{common.upcomingBadge}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <p className="label text-slate">
          <time dateTime={event.dateStart}>{formatDateRange(event.dateStart, event.dateEnd)}</time>
          <span aria-hidden="true"> · </span>
          {event.venue}
        </p>
        <H className="mt-3 text-[1.375rem] leading-tight font-bold">
          <Link to={`/events/${event.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {event.title}
          </Link>
        </H>
        {event.teaser && <p className="mt-3 line-clamp-3 text-slate">{event.teaser}</p>}
        <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[0.9375rem] font-semibold text-ink">
          {common.readMore} <ArrowIcon className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
      {/* Focus ring for the whole card (the link is stretched over it). */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-card ring-lantern group-has-[a:focus-visible]:ring-3" />
    </article>
  );
}

export function NewsCard({ post, headingLevel = 'h3' }: { post: NewsSummary; headingLevel?: 'h2' | 'h3' }) {
  const H = headingLevel;
  return (
    <article className="group relative flex h-full flex-col">
      <div className="relative aspect-[3/2] overflow-hidden rounded-card">
        <div className="absolute inset-0 transition-transform duration-700 ease-guide group-hover:scale-[1.04]">
          <Picture
            image={post.coverImage}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            placeholderIcon={programmeIcon(post.programme?.slug)}
            placeholderTone="light"
          />
        </div>
      </div>
      <p className="label mt-5 text-slate">
        <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
        {post.programme && (
          <>
            <span aria-hidden="true"> · </span>
            {post.programme.shortTitle}
          </>
        )}
      </p>
      <H className="mt-2 text-[1.375rem] leading-tight font-bold">
        <Link to={`/news/${post.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
          {post.title}
        </Link>
      </H>
      {post.excerpt && <p className="mt-2 line-clamp-3 text-slate">{post.excerpt}</p>}
      <span aria-hidden="true" className="pointer-events-none absolute -inset-2 rounded-card ring-lantern group-has-[a:focus-visible]:ring-3" />
    </article>
  );
}

/** Quiet empty state: a lantern and one line. */
export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid place-items-center rounded-card bg-mist px-6 py-20 text-center">
      <svg viewBox="0 0 32 32" className="size-10" aria-hidden="true">
        <circle cx="16" cy="16" r="14.5" fill="none" stroke="var(--color-lantern)" strokeOpacity=".35" strokeWidth="1.5" />
        <circle cx="16" cy="16" r="7" fill="var(--color-lantern)" />
      </svg>
      <div className="prose-measure mt-5 text-lead text-slate">{children}</div>
    </div>
  );
}
