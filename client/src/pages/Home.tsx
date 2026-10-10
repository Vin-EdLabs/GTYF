import type { ReactNode } from 'react';
import type { HomeContent, HomeSection } from '@gtyf/shared/api';
import type { HomeSectionKey } from '@gtyf/shared/content';
import { ImpactBand, SelectionSteps, ValuesMarquee } from '../components/blocks';
import { HeroSlideshow } from '../components/home/HeroSlideshow';
import {
  JourneyTimeline,
  LatestNews,
  ProgrammeGrid,
  UpcomingFeature,
} from '../components/home/HomeSections';
import { Seo } from '../components/Seo';
import { useContent } from '../lib/content';
import { useHomeSections, useSite } from '../lib/site';

/**
 * Home page. Section order and visibility come from the admin
 * (home_sections), so staff can reorder or hide sections without a developer.
 */
export default function Home() {
  const { data } = useContent<HomeContent>('/content/home');
  const sections = useHomeSections();
  const { organisation } = useSite();
  if (!data) return <Seo />;

  const render: Record<HomeSectionKey, (s: HomeSection) => ReactNode> = {
    hero: () => <HeroSlideshow slides={data.heroSlides} title={organisation.name} />,
    impact: (s) => <ImpactBand stats={data.impactStats} section={s} />,
    programmes: (s) => <ProgrammeGrid programmes={data.programmes} section={s} />,
    selection: (s) => <SelectionSteps section={s} />,
    upcoming: (s) => <UpcomingFeature event={data.upcomingEvent} section={s} />,
    journey: (s) => <JourneyTimeline events={data.journey} section={s} />,
    values: (s) => <ValuesMarquee values={data.coreValues} eyebrow={s.eyebrow} />,
    news: (s) => <LatestNews posts={data.latestNews} section={s} />,
  };

  return (
    <>
      <Seo />
      {sections
        .filter((s) => s.isVisible && s.key in render)
        .map((s) => (
          <div key={s.key} data-section={s.key}>
            {render[s.key](s)}
          </div>
        ))}
    </>
  );
}
