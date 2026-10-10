import { useId, useState, type ReactNode } from 'react';
import type { TeamMember } from '@gtyf/shared/api';
import { useSite } from '../lib/site';
import { Picture } from './ui/Picture';
import { SectionHeading } from './ui/SectionHeading';

interface Props {
  members: TeamMember[];
  /** Section heading (omit on pages that already have their own big heading). */
  eyebrow?: string;
  heading?: string;
  underlineWord?: string;
  /** An extra link beside the heading, e.g. "Meet the team →". */
  aside?: ReactNode;
}

/**
 * The team as a plain vertical list with a clear pecking order: leaders first,
 * larger and gold-ringed, then everyone else in compact rows. Each person's
 * story is a tap on "Read more" away. No sideways scrolling anywhere, and about
 * four people fit on a phone screen at once.
 */
export function TeamShowcase({ members, eyebrow, heading, underlineWord, aside }: Props) {
  if (!members.length) return null;
  const leaders = members.filter((m) => m.isLeader);
  const others = members.filter((m) => !m.isLeader);
  let rank = 0;

  return (
    <div>
      {heading ? (
        <SectionHeading eyebrow={eyebrow} heading={heading} underlineWord={underlineWord} aside={aside} />
      ) : aside ? (
        <div className="flex justify-end">{aside}</div>
      ) : null}

      <div className={heading || aside ? 'mt-10' : ''}>
        {leaders.length > 0 && (
          <ul role="list" aria-label="Leadership" className="grid items-start md:grid-cols-2 md:gap-x-10">
            {leaders.map((m) => (
              <Person key={m.id} m={m} rank={++rank} big />
            ))}
          </ul>
        )}
        {others.length > 0 && (
          <ul role="list" aria-label="Team" className={`grid items-start md:grid-cols-2 md:gap-x-10 ${leaders.length ? 'border-t border-ink/[0.08] md:mt-4 md:pt-4' : ''}`}>
            {others.map((m) => (
              <Person key={m.id} m={m} rank={++rank} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Person({ m, rank, big = false }: { m: TeamMember; rank: number; big?: boolean }) {
  const { common } = useSite();
  const [open, setOpen] = useState(false);
  const bioId = useId();
  const long = m.bio.length > 70;

  return (
    <li className="flex gap-4 border-b border-ink/[0.08] py-4 last:border-0 sm:gap-6 md:border-0 md:py-5">
      <div
        className={`relative shrink-0 overflow-hidden rounded-full bg-mist ${
          big ? 'size-[5.75rem] ring-[3px] ring-lantern ring-offset-[3px] sm:size-36' : 'size-[5.25rem] ring-1 ring-ink/10 sm:size-32'
        }`}
      >
        <Picture image={m.photo} sizes="160px" placeholderIcon="mentor" />
      </div>
      <div className="min-w-0 flex-1 self-center">
        <h3 className={`leading-tight font-bold ${big ? 'text-[1.3125rem] sm:text-[1.75rem]' : 'text-[1.1875rem] sm:text-[1.375rem]'}`}>{m.name}</h3>
        <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className={`label rounded-full px-2.5 py-1 text-ink ${big ? 'bg-lantern' : 'bg-lantern/25'}`}>{m.role}</span>
          {m.isLeader && <span className="label rounded-full bg-ink px-2.5 py-1 text-white">{common.leaderBadge}</span>}
        </p>
        {m.bio && (
          <p id={bioId} className={`mt-2 text-[0.9375rem] leading-snug text-slate ${open ? '' : 'line-clamp-2'}`}>
            {m.bio}
          </p>
        )}
        {m.bio && (long || open) && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={bioId}
            className="mt-1 inline-flex min-h-8 items-center text-sm font-semibold text-ink underline decoration-lantern decoration-2 underline-offset-4"
          >
            {open ? 'Show less' : 'Read more'}
          </button>
        )}
        <Socials m={m} />
        <span className="sr-only">Position {rank}</span>
      </div>
    </li>
  );
}

const ICONS = {
  email: 'M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-11Zm2 .6 7 5 7-5',
  linkedin: 'M6.5 9v9M6.5 6v.01M11 18V9m0 3.5c0-2 1.3-3.5 3.2-3.5 2 0 3.3 1.2 3.3 3.8V18',
  instagram: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm5 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm5-2.5v.01',
  tiktok: 'M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.3 2.4 1.9 4 4.5 4.2',
} as const;

/** Small round icon links, only for the profiles that were filled in. */
function Socials({ m }: { m: TeamMember }) {
  const links = [
    { key: 'email', label: 'Email', href: m.email ? `mailto:${m.email}` : '' },
    { key: 'linkedin', label: 'LinkedIn', href: m.linkedin },
    { key: 'instagram', label: 'Instagram', href: m.instagram },
    { key: 'tiktok', label: 'TikTok', href: m.tiktok },
  ] as const;
  const shown = links.filter((l) => l.href);
  if (!shown.length) return null;
  return (
    <ul role="list" className="mt-3 flex flex-wrap gap-2">
      {shown.map((l) => (
        <li key={l.key}>
          <a
            href={l.href}
            {...(l.key === 'email' ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
            aria-label={`${m.name} on ${l.label}`.replace(' on Email', ' by email')}
            className="grid size-10 place-items-center rounded-full bg-ink/[0.06] text-ink transition-all duration-300 hover:-translate-y-0.5 hover:bg-ink hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="size-[1.125rem]" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={ICONS[l.key]} />
            </svg>
          </a>
        </li>
      ))}
    </ul>
  );
}
