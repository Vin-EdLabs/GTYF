import { Link } from 'react-router-dom';
import { isTodo, paragraphs } from '@gtyf/shared';
import type { AboutContent } from '@gtyf/shared/api';
import { DonateBand, ImpactBand, Paragraphs, SelectionSteps, ValuesGrid } from '../components/blocks';
import { Picture, PhotoPlaceholder } from '../components/ui/Picture';
import { Reveal } from '../components/ui/Reveal';
import { ArrowIcon, PageIntro, SectionHeading } from '../components/ui/SectionHeading';
import { Filled } from '../components/ui/Filled';
import { Seo } from '../components/Seo';
import { TeamShowcase } from '../components/TeamShowcase';
import { useContent } from '../lib/content';
import { useHomeSection, useSite } from '../lib/site';

export default function About() {
  const { about, organisation } = useSite();
  const { data } = useContent<AboutContent>('/content/about');
  const selection = useHomeSection('selection');
  const impact = useHomeSection('impact');

  return (
    <>
      <Seo title={about.eyebrow} description={organisation.missionLine} />
      <PageIntro eyebrow={about.eyebrow} heading={about.heading} underlineWord={about.underlineWord} intro={about.intro} />

      {/* Where we work + our story */}
      <section className="container-page grid gap-14 pb-16 md:pb-32 lg:grid-cols-2 lg:gap-20">
        <Reveal className="relative aspect-[4/5] overflow-hidden rounded-card lg:sticky lg:top-28 lg:self-start">
          {/* Chosen in the admin under Website photos → About page. */}
          {data?.photo ? <Picture image={data.photo} sizes="(min-width: 1024px) 50vw, 100vw" /> : <PhotoPlaceholder icon="lantern" />}
        </Reveal>
        <div className="space-y-16">
          <Reveal>
            <h2 className="text-title">{about.whereHeading}</h2>
            <div className="mt-5">
              <Paragraphs items={paragraphs(about.whereBody)} lead />
            </div>
          </Reveal>
          {(!isTodo(about.story) || import.meta.env.DEV) && (
            <Reveal>
              <h2 className="text-title">{about.storyHeading}</h2>
              <div className="mt-5">
                <Filled value={about.story}>{(v) => <Paragraphs items={paragraphs(v)} />}</Filled>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {data && <ImpactBand stats={data.impactStats} section={impact} />}

      {data && data.coreValues.length > 0 && (
        <section className="py-16 md:py-32">
          <div className="container-page">
            <Reveal>
              <SectionHeading heading={about.valuesHeading} />
            </Reveal>
            <div className="mt-12">
              <ValuesGrid values={data.coreValues} />
            </div>
          </div>
        </section>
      )}

      <SelectionSteps section={selection && { ...selection, eyebrow: '', heading: about.selectionHeading, underlineWord: '' }} />

      {data && data.team.length > 0 && (
        <section className="overflow-hidden py-16 md:py-32">
          <div className="container-page">
            <Reveal>
              <TeamShowcase
                members={data.team}
                heading={about.teamHeading}
                aside={
                  <Link to="/team" className="inline-flex items-center gap-2 font-semibold hover:text-slate">
                    {about.teamLinkLabel} <ArrowIcon />
                  </Link>
                }
              />
            </Reveal>
          </div>
        </section>
      )}

      <DonateBand />
    </>
  );
}
