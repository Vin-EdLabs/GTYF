import { createElement, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  as?: 'div' | 'section' | 'li' | 'article' | 'header';
  className?: string;
  /** Stagger, in seconds. */
  delay?: number;
  id?: string;
}

/**
 * Fades and lifts content 24px as it scrolls into view.
 *
 * Content is visible in the prerendered HTML and stays visible if JS is slow
 * or off: only elements confirmed to be below the fold after hydration are
 * hidden, and only until they enter the viewport. Reduced motion skips it.
 */
export function Reveal({ children, as = 'div', className, delay = 0, id }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return; // already on screen

    el.dataset.reveal = 'pending';
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.dataset.reveal = 'shown';
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style: CSSProperties | undefined = delay ? { transitionDelay: `${delay}s` } : undefined;
  return createElement(as, { ref, className, style, id }, children);
}
