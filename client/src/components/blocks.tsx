/**
 * Content blocks shared by the home page and inner pages.
 */
import type { ReactNode } from 'react';
import type { CoreValue, HomeSection, ImpactStat, PublicImage } from '@gtyf/shared/api';
import { useSite } from '../lib/site';
import { type IconName } from './icons/ImpactIcon';
import { ButtonLink } from './ui/Button';
import { CountUp } from './ui/CountUp';
import { UnderlinedHeading } from './ui/HandUnderline';
import { Picture } from './ui/Picture';
import { Reveal } from './ui/Reveal';
import { SectionHeading } from './ui/SectionHeading';

/**
 * The numbers band, straight under the hero: a compact dark strip, a gold line on top,
 * big counting numbers in a grid that never exceeds four across. Add, remove, reorder and
 * reword the numbers in Admin → Impact numbers. The heading is optional (leave it blank to hide it).
 */
export function ImpactBand({ stats, section }: { stats: ImpactStat[]; section?: HomeSection }) {
  if (!stats.length) return null;
  const cols = stats.length >= 4 ? 'lg:grid-cols-4' : stats.length === 3 ? 'lg:grid-cols-3' : stats.length === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-1';
  return (
    <section className="relative overflow-hidden bg-ink py-14 text-white md:py-20">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,transparent,var(--color-lantern),transparent)]" />
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-lantern/[0.07] blur-3xl" />
      <div className="container-page relative">
        {section?.heading && (
          <Reveal>
            <SectionHeading tone="dark" eyebrow={section.eyebrow} heading={section.heading} underlineWord={section.underlineWord} body={section.body || undefined} />
          </Reveal>
        )}
        <dl className={`${section?.heading ? 'mt-10 md:mt-14' : ''} grid grid-cols-2 gap-3 sm:gap-4 ${cols}`}>
          {stats.map((s, i) => (
            <Reveal key={s.key} delay={(i % 4) * 0.06} className="flex flex-col rounded-3xl bg-white/[0.05] p-5 ring-1 ring-white/10 sm:p-7">
              <dd className="order-1 font-display text-[clamp(2.125rem,1.4rem+3.2vw,4rem)] leading-none font-extrabold tracking-display">
                {s.prefix && <span className="mr-1.5 text-[0.45em] font-semibold text-white/60">{s.prefix}</span>}
                <CountUp value={s.value} plain={s.isYear} />
                {s.suffix && <span className="text-lantern">{s.suffix}</span>}
              </dd>
              <span aria-hidden="true" className="order-2 my-4 h-0.5 w-8 rounded-full bg-lantern" />
              <dt className="order-3 text-[0.9375rem] leading-snug font-medium text-white/70">{s.label}</dt>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}

/** "How we choose who we help": the transparency proof. Visit → Verify → Follow up. */
export function SelectionSteps({ section, tone = 'mist' }: { section: HomeSection | undefined; tone?: 'mist' | 'paper' }) {
  if (!section) return null;
  return (
    <section className={`${tone === 'mist' ? 'bg-mist' : 'bg-paper'} py-16 md:py-32`}>
      <div className="container-page">
        <Reveal>
          <SectionHeading eyebrow={section.eyebrow} heading={section.heading} underlineWord={section.underlineWord} body={section.body} />
        </Reveal>
        <ol className="mt-16 grid gap-5 md:grid-cols-3">
          {section.items.map((step, i) => (
            <Reveal as="li" key={step.title} delay={i * 0.1} className="relative rounded-card bg-white p-7 shadow-soft md:p-8">
              <span className="grid size-10 place-items-center rounded-full bg-lantern font-display text-lg font-bold text-ink" aria-hidden="true">
                {i + 1}
              </span>
              <h3 className="mt-5 text-[1.5rem] leading-8 font-bold">{step.title}</h3>
              <p className="mt-2 text-slate">{step.body}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** The eight core values scrolling slowly, like a ticker. Static and wrapped under reduced motion. */
export function ValuesMarquee({ values, eyebrow }: { values: CoreValue[]; eyebrow?: string }) {
  if (!values.length) return null;
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center motion-reduce:flex-wrap motion-reduce:justify-center">
      {values.map((v) => (
        <li key={v.name} className="flex items-center">
          <span className="px-6 font-display text-[clamp(2rem,1.4rem+3vw,4rem)] font-bold whitespace-nowrap tracking-display md:px-10">
            {v.name}
          </span>
          <span aria-hidden="true" className="size-2.5 rounded-full bg-lantern" />
        </li>
      ))}
    </ul>
  );
  return (
    <section className="overflow-hidden border-y border-ink/8 py-14 md:py-20" aria-label={eyebrow || 'Our values'}>
      {eyebrow && <p className="label container-page mb-8 text-slate">{eyebrow}</p>}
      <div className="group flex w-max motion-reduce:w-full">
        <div
          className="flex animate-[marquee_48s_linear_infinite] group-hover:[animation-play-state:paused] motion-reduce:animate-none"
        >
          {row(false)}
          <span className="contents motion-reduce:hidden">{row(true)}</span>
        </div>
      </div>
    </section>
  );
}

/** Values as a grid with one-line explanations (About page). */
export function ValuesGrid({ values }: { values: CoreValue[] }) {
  return (
    <ul className="grid gap-px overflow-hidden rounded-card bg-ink/8 sm:grid-cols-2 lg:grid-cols-4">
      {values.map((v, i) => (
        <Reveal as="li" key={v.name} delay={(i % 4) * 0.06} className="bg-white p-7">
          <span className="label text-slate">{String(i + 1).padStart(2, '0')}</span>
          <h3 className="mt-6 text-[1.375rem] leading-tight font-bold">{v.name}</h3>
          <p className="mt-2 text-slate">
            {v.description}
            {v.descriptionIsDraft && import.meta.env.DEV && <span className="todo-placeholder ml-1">draft</span>}
          </p>
        </Reveal>
      ))}
    </ul>
  );
}

/** Full-bleed photo hero for programme and event pages. The nav overlays it. */
export function PhotoHero({
  image,
  icon,
  eyebrow,
  title,
  children,
}: {
  image: PublicImage | null;
  icon: IconName;
  eyebrow: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative isolate flex min-h-[78svh] items-end overflow-hidden bg-ink text-white md:min-h-[86svh]">
      <div className="absolute inset-0 -z-20">
        <Picture image={image} sizes="100vw" priority placeholderIcon={icon} />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgb(11_20_34/0.9)_0%,rgb(11_20_34/0.45)_45%,rgb(11_20_34/0.15)_75%)]"
      />
      <div className="container-page pt-32 pb-14 md:pb-20">
        <div className="label text-lantern">{eyebrow}</div>
        <h1 className="mt-5 max-w-[18ch] text-[clamp(2.5rem,1.4rem+4.6vw,5.5rem)] leading-[1] font-extrabold">{title}</h1>
        {children}
      </div>
    </section>
  );
}

/** Mono "fact strip": date · venue · participants... */
export function FactStrip({ facts }: { facts: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card bg-ink/10 md:grid-flow-col md:auto-cols-fr md:grid-cols-none">
      {facts.map((f) => (
        <div key={f.label} className="bg-white px-5 py-5 md:px-6">
          <dt className="label text-slate">{f.label}</dt>
          <dd className="mt-2 font-display text-lg leading-snug font-semibold">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Closing call to give, used at the foot of inner pages. */
export function DonateBand({ cause }: { cause?: string }) {
  // Wording comes from Admin → Website → Buttons, labels & 404 page.
  const { navigation, closing } = useSite();
  return (
    <section className="bg-ink py-24 text-white md:py-32">
      <Reveal className="container-page flex flex-col items-start gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <UnderlinedHeading text={closing.heading} word={closing.underlineWord} className="max-w-[16ch] text-display" />
          {closing.body && <p className="prose-measure mt-5 text-lead text-white/70">{closing.body}</p>}
        </div>
        <ButtonLink to={cause ? `/donate?cause=${cause}` : '/donate'} size="lg">
          {navigation.donateLabel}
        </ButtonLink>
      </Reveal>
    </section>
  );
}

/** Paragraph helper: first paragraph as a lead, the rest as body. */
export function Paragraphs({ items, lead = false }: { items: string[]; lead?: boolean }) {
  return (
    <div className="prose-measure space-y-5">
      {items.map((p, i) => (
        <p key={i} className={lead && i === 0 ? 'text-lead text-ink' : 'text-slate'}>
          {p}
        </p>
      ))}
    </div>
  );
}
