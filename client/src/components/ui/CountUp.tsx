import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  /** Years and similar are shown as-is, with no count-up or thousands separator. */
  plain?: boolean;
  durationMs?: number;
}

const format = (n: number, plain?: boolean) => (plain ? String(n) : n.toLocaleString('en-GH'));

/**
 * A number that counts up once, the first time it scrolls into view.
 * The final value is what's prerendered, so it's correct without JS; reduced
 * motion shows it immediately.
 */
export function CountUp({ value, plain, durationMs = 1600 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || plain || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    setShown(0);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / durationMs);
          const eased = 1 - Math.pow(1 - t, 4); // ease-out quart
          setShown(Math.round(value * eased));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, plain, durationMs]);

  return (
    <span ref={ref} className="tabular-nums">
      {/* Screen readers get the real number, not the animation. */}
      <span aria-hidden="true">{format(shown, plain)}</span>
      <span className="sr-only">{format(value, plain)}</span>
    </span>
  );
}
