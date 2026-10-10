import type { TeamMember } from '@gtyf/shared/api';
import { EmptyState } from '../components/cards';
import { Seo } from '../components/Seo';
import { TeamShowcase } from '../components/TeamShowcase';
import { Filled } from '../components/ui/Filled';
import { Reveal } from '../components/ui/Reveal';
import { PageIntro } from '../components/ui/SectionHeading';
import { useContent } from '../lib/content';
import { useSite } from '../lib/site';

export default function Team() {
  const { pages } = useSite();
  const { data } = useContent<TeamMember[]>('/content/team');
  const p = pages.team;
  return (
    <>
      <Seo title={p.eyebrow} />
      <PageIntro eyebrow={p.eyebrow} heading={p.heading} underlineWord={p.underlineWord} intro={<Filled value={p.intro} />} />
      <section className="overflow-hidden pb-16 md:pb-32">
        <div className="container-page">
          {data && data.length > 0 ? (
            <Reveal>
              <TeamShowcase members={data} />
            </Reveal>
          ) : (
            <EmptyState>{p.empty}</EmptyState>
          )}
        </div>
      </section>
    </>
  );
}
