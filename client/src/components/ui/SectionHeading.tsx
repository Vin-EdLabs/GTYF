import type { ReactNode } from 'react';
import { UnderlinedHeading } from './HandUnderline';

interface Props {
  eyebrow?: string;
  heading: string;
  underlineWord?: string;
  body?: ReactNode;
  tone?: 'dark' | 'light';
  as?: 'h1' | 'h2';
  size?: 'display' | 'hero';
  align?: 'left' | 'center';
  className?: string;
  /** Right-hand slot, e.g. a "View all" link. */
  aside?: ReactNode;
}

/** Eyebrow + big heading (one word hand-underlined) + optional lead. Used by every section. */
export function SectionHeading({
  eyebrow,
  heading,
  underlineWord,
  body,
  tone = 'light',
  as = 'h2',
  size = 'display',
  align = 'left',
  className = '',
  aside,
}: Props) {
  const dark = tone === 'dark';
  const centered = align === 'center';
  return (
    <div className={`flex flex-col gap-6 md:flex-row md:items-end md:justify-between ${className}`}>
      <div className={centered ? 'mx-auto text-center' : ''}>
        {eyebrow && <p className={`label ${dark ? 'text-lantern' : 'text-slate'}`}>{eyebrow}</p>}
        {heading && (
          <UnderlinedHeading
            as={as}
            text={heading}
            word={underlineWord}
            className={`${eyebrow ? 'mt-4' : ''} ${size === 'hero' ? 'text-hero font-extrabold' : 'text-display'} max-w-[18ch] ${
              centered ? 'mx-auto' : ''
            }`}
          />
        )}
        {body && (
          <div className={`prose-measure mt-5 text-lead ${dark ? 'text-white/70' : 'text-slate'} ${centered ? 'mx-auto' : ''}`}>
            {body}
          </div>
        )}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  );
}

/** Top-of-page intro for inner pages without a photo hero. */
export function PageIntro({
  eyebrow,
  heading,
  underlineWord,
  intro,
  children,
}: {
  eyebrow: string;
  heading: string;
  underlineWord?: string;
  intro?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="container-page pt-10 pb-10 md:pt-24 md:pb-20">
      <SectionHeading as="h1" size="hero" eyebrow={eyebrow} heading={heading} underlineWord={underlineWord} body={intro} />
      {children}
    </header>
  );
}

/** Small "View all →" style link used beside section headings. */
export function ArrowIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
