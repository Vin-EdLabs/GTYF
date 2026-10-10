import { createElement, type ReactNode } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { EASE } from '../../lib/motion';

interface Props {
  /** Full heading text, e.g. "Every child deserves a guide." */
  text: string;
  /** The one word that gets the hand-drawn lantern underline. Case-insensitive. */
  word?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p';
  className?: string;
}

/**
 * A heading with one word underlined in a hand-drawn stroke, like a pupil
 * marking the answer in an exercise book. The stroke draws itself on first view.
 */
export function UnderlinedHeading({ text, word, as = 'h2', className }: Props) {
  const idx = word ? text.toLowerCase().indexOf(word.toLowerCase()) : -1;
  let content: ReactNode = text;
  if (word && idx >= 0) {
    content = (
      <>
        {text.slice(0, idx)}
        <Underline>{text.slice(idx, idx + word.length)}</Underline>
        {text.slice(idx + word.length)}
      </>
    );
  }
  return createElement(as, { className }, content);
}

export function Underline({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const drawn = { pathLength: 1, opacity: 1 };
  return (
    <span className="relative inline-block whitespace-nowrap">
      <span className="relative z-10">{children}</span>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[0.14em] left-[-2%] z-0 h-[0.34em] w-[104%] overflow-visible"
        viewBox="0 0 200 22"
        preserveAspectRatio="none"
        fill="none"
      >
        <m.path
          d="M3 13.5C42 6.5 96 4 197 9"
          stroke="var(--color-lantern)"
          strokeWidth="5.5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          initial={reduce ? drawn : { pathLength: 0, opacity: 0 }}
          whileInView={drawn}
          viewport={{ once: true, margin: '-10% 0px' }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.25 }}
        />
        <m.path
          d="M14 18.5C68 13 128 12.5 184 15"
          stroke="var(--color-lantern)"
          strokeWidth="3.5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          initial={reduce ? drawn : { pathLength: 0, opacity: 0 }}
          whileInView={drawn}
          viewport={{ once: true, margin: '-10% 0px' }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.75 }}
        />
      </svg>
    </span>
  );
}
