import { Link } from 'react-router-dom';
import type { ProgrammeSummary } from '@gtyf/shared/api';
import { DonateBand } from '../components/blocks';
import { programmeIcon } from '../components/icons/ImpactIcon';
import { Seo } from '../components/Seo';
import { Picture } from '../components/ui/Picture';
import { Reveal } from '../components/ui/Reveal';
import { ArrowIcon, PageIntro } from '../components/ui/SectionHeading';
import { useContent } from '../lib/content';
import { useSite } from '../lib/site';

/** Programmes as large alternating editorial rows. */
export default function Programmes() {
  const { pages, common } = useSite();
  const { data } = useContent<ProgrammeSummary[]>('/content/programmes');
  const p = pages.programmes;

  return (
    <>
      <Seo title={p.eyebrow} description={p.intro} />
      <PageIntro eyebrow={p.eyebrow} heading={p.heading} underlineWord={p.underlineWord} intro={p.intro} />
      <section className="container-page space-y-24 pb-24 md:space-y-36 md:pb-36">
        {data?.map((prog, i) => (
          <Reveal key={prog.slug} className="group relative grid items-center gap-8 md:grid-cols-12 md:gap-12">
            <div
              className={`relative aspect-[4/3] overflow-hidden rounded-card md:col-span-7 ${i % 2 ? 'md:order-2 md:col-start-6' : ''}`}
            >
              <div className="absolute inset-0 transition-transform duration-[1200ms] ease-guide group-hover:scale-[1.04]">
                <Picture image={prog.heroImage} sizes="(min-width: 768px) 58vw, 100vw" placeholderIcon={programmeIcon(prog.slug)} priority={i === 0} />
              </div>
            </div>
            <div className={`md:col-span-5 ${i % 2 ? 'md:order-1 md:col-start-1 md:row-start-1' : ''}`}>
              <p className="label text-slate">{String(i + 1).padStart(2, '0')}</p>
              <h2 className="mt-3 text-title">
                <Link to={`/programmes/${prog.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
                  {prog.title}
                </Link>
              </h2>
              <p className="mt-4 text-lead text-slate">{prog.summary}</p>
              <span className="mt-6 inline-flex items-center gap-2 font-semibold">
                {common.exploreProgramme} <ArrowIcon className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </div>
            <span aria-hidden="true" className="pointer-events-none absolute -inset-3 rounded-card ring-lantern group-has-[a:focus-visible]:ring-3" />
          </Reveal>
        ))}
      </section>
      <DonateBand />
    </>
  );
}
