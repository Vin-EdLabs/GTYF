import { Link } from 'react-router-dom';
import { useSite } from '../../lib/site';

/**
 * GTYF's logo: the round emblem (three figures above a hand) on a white disc,
 * so it reads on both the dark hero and the white nav, with the name beside it.
 * Files are generated from shared/pic/logo.jpeg by `npm run brand -w server`.
 */
export function Logo({ tone = 'dark', onClick }: { tone?: 'dark' | 'light'; onClick?: () => void }) {
  const { organisation } = useSite();
  const text = tone === 'light' ? 'text-white' : 'text-ink';
  return (
    <Link
      to="/"
      onClick={onClick}
      className={`group inline-flex items-center gap-2.5 ${text} transition-colors duration-500`}
      aria-label={`${organisation.name}, home`}
    >
      <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white shadow-[0_0_0_1px_rgb(11_20_34/0.08)] transition-transform duration-500 ease-guide group-hover:scale-105 md:size-12">
        <picture>
          <source srcSet="/brand/logo-mark.webp" type="image/webp" />
          <img src="/brand/logo-mark.png" alt="" width={80} height={80} className="size-full object-contain" />
        </picture>
      </span>
      <span className="font-display text-[1.0625rem] leading-[1.05] font-bold tracking-display">
        <span className="hidden sm:inline">{organisation.name}</span>
        {/* Two short lines on phones instead of the acronym alone. */}
        <span className="block text-[0.9375rem] sm:hidden">
          Guide The Youth
          <br />
          Foundation
        </span>
      </span>
    </Link>
  );
}
