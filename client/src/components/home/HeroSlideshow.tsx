import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import type { HeroSlide } from '@gtyf/shared/api';
import { EASE } from '../../lib/motion';
import { programmeIcon } from '../icons/ImpactIcon';
import { ButtonLink } from '../ui/Button';
import { UnderlinedHeading } from '../ui/HandUnderline';
import { Picture } from '../ui/Picture';

const SLIDE_MS = 7000;
const SWIPE_PX = 50;

/**
 * Full-bleed hero slideshow with story-style progress bars.
 *
 * - Crossfade (1.2s) with a slow Ken Burns zoom (1 → 1.08 over 7s).
 * - It ALWAYS keeps moving: one timer advances the slide every 7 seconds. Tapping,
 *   hovering, swiping or clicking a progress bar never stops it; those only
 *   restart the 7 seconds. (It waits while the browser tab is hidden, because
 *   browsers freeze animations there, and starts again by itself on return.)
 * - Swipe on touch, arrow keys when focused (or anywhere while the hero is on screen).
 * - First slide is prerendered and its image is the eager, high-priority LCP element.
 */
export function HeroSlideshow({ slides, title }: { slides: HeroSlide[]; title: string }) {
  const [index, setIndex] = useState(0);
  // Bumped whenever the 7 seconds should start over (manual navigation, tab returning).
  const [cycle, setCycle] = useState(0);
  const [tabHidden, setTabHidden] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const reduce = useReducedMotion();
  const root = useRef<HTMLElement>(null);
  const pointerStart = useRef<number | null>(null);

  const count = slides.length;
  /** Go to a slide because the visitor asked to; restarts its 7 seconds. */
  const go = useCallback(
    (i: number) => {
      setIndex(((i % count) + count) % count);
      setCycle((c) => c + 1);
    },
    [count],
  );

  // The slide timer. Re-created on every slide change or restart; never "paused" by interaction.
  useEffect(() => {
    if (count < 2 || tabHidden) return;
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % count), SLIDE_MS);
    return () => window.clearTimeout(id);
  }, [index, cycle, tabHidden, count]);

  // Track tab visibility (to wait while hidden) and whether the hero is on screen (for arrow keys).
  useEffect(() => {
    const onVisibility = () => {
      setTabHidden(document.hidden);
      if (!document.hidden) setCycle((c) => c + 1);
    };
    document.addEventListener('visibilitychange', onVisibility);
    const io = new IntersectionObserver(([e]) => setOnScreen(!!e?.isIntersecting), { threshold: 0.25 });
    if (root.current) io.observe(root.current);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      io.disconnect();
    };
  }, []);

  // Arrow keys work anywhere on the page while the hero is visible, unless typing in a field.
  useEffect(() => {
    if (!onScreen || count < 2) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      const t = e.target instanceof Element ? e.target : document.body;
      if (t.closest('input, textarea, select, [contenteditable], [role="dialog"]')) return;
      if (root.current?.contains(t)) return; // handled by the section's own handler
      if (e.key === 'ArrowRight') go(index + 1);
      if (e.key === 'ArrowLeft') go(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onScreen, count, index, go]);

  // Warm the cache for the next slide's image so the crossfade never waits.
  useEffect(() => {
    const next = slides[(index + 1) % count]?.image;
    if (!next || typeof window === 'undefined') return;
    const img = new Image();
    img.sizes = '100vw';
    img.srcset = next.srcSetWebp;
    img.src = next.src;
  }, [index, count, slides]);

  if (count === 0) return null;
  const slide = slides[index]!;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(index + 1);
    else if (e.key === 'ArrowLeft') go(index - 1);
    else return;
    e.preventDefault();
  };
  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') pointerStart.current = e.clientX;
  };
  const onPointerUp = (e: PointerEvent) => {
    if (pointerStart.current === null) return;
    const dx = e.clientX - pointerStart.current;
    pointerStart.current = null;
    if (Math.abs(dx) > SWIPE_PX) go(index + (dx < 0 ? 1 : -1));
  };

  return (
    <section
      ref={root}
      aria-roledescription="carousel"
      aria-label="Our work"
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      className="relative isolate flex h-[100svh] min-h-[36rem] touch-pan-y items-end overflow-hidden bg-ink text-white select-none"
    >
      {/* Images: crossfade + Ken Burns */}
      <AnimatePresence initial={false}>
        <m.div
          key={slide.id}
          className="absolute inset-0 -z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0.2 : 1.2, ease: EASE }}
        >
          <div
            className="absolute inset-0"
            style={{
              animation: reduce ? 'none' : `ken-burns ${SLIDE_MS + 1200}ms var(--ease-guide) forwards`,
              animationPlayState: tabHidden ? 'paused' : 'running',
            }}
          >
            <Picture
              image={slide.image}
              sizes="100vw"
              priority={index === 0}
              placeholderIcon={programmeIcon(slide.programmeSlug)}
            />
          </div>
        </m.div>
      </AnimatePresence>

      {/* Legibility scrim: strongest bottom-left where the text sits. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgb(11_20_34/0.92)_0%,rgb(11_20_34/0.55)_38%,rgb(11_20_34/0.1)_70%),linear-gradient(to_right,rgb(11_20_34/0.55),transparent_65%)]"
      />

      {/* One stable h1 for the page; slide headlines are h2s that change. */}
      <h1 className="sr-only">{title}</h1>
      <div className="container-page relative pt-28 pb-24 md:pb-32">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${count}`}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: reduce ? 0.2 : 0.8, ease: EASE }}
          >
            <p className="label text-lantern">{slide.eyebrow}</p>
            <UnderlinedHeading
              as="h2"
              text={slide.headline}
              word={slide.underlineWord}
              className="mt-5 max-w-[15ch] text-hero font-extrabold"
            />
            {slide.subtext && <p className="prose-measure mt-6 max-w-xl text-lead text-white/80">{slide.subtext}</p>}
            <div className="mt-9 flex gap-3 sm:flex-wrap">
              <ButtonLink to={slide.primaryHref} size="lg" className="flex-1 sm:flex-none">
                {slide.primaryLabel}
              </ButtonLink>
              <ButtonLink to={slide.secondaryHref} size="lg" variant="secondary-light" className="flex-1 sm:flex-none">
                {slide.secondaryLabel}
              </ButtonLink>
            </div>
          </m.div>
        </AnimatePresence>
      </div>

      {/* Story-style progress bars: tap one to jump to that slide */}
      {count > 1 && (
        <div className="absolute inset-x-0 bottom-0">
          <div className="container-page flex items-center gap-4 pb-7 md:pb-9">
            <ol className="flex flex-1 gap-2" aria-label="Choose a slide">
              {slides.map((s, i) => (
                <li key={s.id} className="flex-1">
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`Slide ${i + 1}: ${s.headline}`}
                    aria-current={i === index ? 'true' : undefined}
                    className="group block w-full py-3"
                  >
                    <span className="block h-[3px] overflow-hidden rounded-full bg-white/25 transition-colors group-hover:bg-white/40">
                      {i < index && <span className="block h-full w-full bg-white" />}
                      {i === index && (
                        // Purely visual: the timer above is what advances the slide.
                        <span
                          key={`bar-${index}-${cycle}`}
                          data-keep-motion
                          className="block h-full w-full origin-left bg-white"
                          style={{
                            animation: `hero-progress ${SLIDE_MS}ms linear forwards`,
                            animationPlayState: tabHidden ? 'paused' : 'running',
                          }}
                        />
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <p className="label hidden text-white/70 tabular-nums sm:block" aria-hidden="true">
              {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
