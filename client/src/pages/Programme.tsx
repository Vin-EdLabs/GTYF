import { useParams } from 'react-router-dom';
import { paragraphs } from '@gtyf/shared';
import type { ProgrammeDetail } from '@gtyf/shared/api';
import { Paragraphs, PhotoHero } from '../components/blocks';
import { EventCard } from '../components/cards';
import { DonationCard } from '../components/donate/DonationCard';
import { programmeIcon } from '../components/icons/ImpactIcon';
import { GalleryGrid } from '../components/Lightbox';
import { Seo } from '../components/Seo';
import { ButtonLink } from '../components/ui/Button';
import { Picture } from '../components/ui/Picture';
import { Reveal } from '../components/ui/Reveal';
import { SectionHeading } from '../components/ui/SectionHeading';
import { useContent } from '../lib/content';
import { useSite } from '../lib/site';
import { PageLoading } from './PageLoading';
import NotFound from './NotFound';

export default function Programme() {
  const { slug } = useParams();
  const { data: p, loading } = useContent<ProgrammeDetail>(`/content/programmes/${slug}`);
  const { pages, common } = useSite();
  const labels = pages.programme;

  if (!p) return loading ? <PageLoading /> : <NotFound withNavOffset />;
  const [lead, ...rest] = paragraphs(p.body);
  const icon = programmeIcon(p.slug);

  return (
    <>
      <Seo title={p.seoTitle ?? p.title} description={p.seoDescription ?? p.summary} image={p.heroImage?.ogUrl ?? p.heroImage?.src} />
      <PhotoHero image={p.heroImage} icon={icon} eyebrow={common.programmeEyebrow} title={p.title}>
        <p className="prose-measure mt-6 text-lead text-white/80">{p.summary}</p>
      </PhotoHero>

      {/* The story */}
      <section className="container-page grid gap-10 py-14 md:py-28 lg:grid-cols-12">
        <Reveal className="lg:col-span-7">
          <p className="font-display text-[clamp(1.375rem,1.1rem+1.1vw,2rem)] leading-snug font-semibold tracking-display">{lead}</p>
          {rest.length > 0 && (
            <div className="mt-8">
              <Paragraphs items={rest} />
            </div>
          )}
        </Reveal>
        <Reveal delay={0.1} className="lg:col-span-4 lg:col-start-9">
          <ButtonLink to="#give" size="lg" className="w-full">
            {labels.fundHeading}
          </ButtonLink>
        </Reveal>
      </section>

      {/* How it works: alternating image/text rows */}
      {p.sections.length > 0 && (
        <section className="bg-mist py-14 md:py-28">
          <div className="container-page">
            <p className="label text-slate">{labels.howItWorksLabel}</p>
            <div className="mt-10 space-y-20 md:space-y-28">
              {p.sections.map((s, i) => (
                <Reveal key={s.heading} className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
                  <div className={`relative aspect-[4/3] overflow-hidden rounded-card ${i % 2 ? 'md:order-2' : ''}`}>
                    <Picture image={s.image} sizes="(min-width: 768px) 50vw, 100vw" placeholderIcon={icon} placeholderTone="light" />
                  </div>
                  <div>
                    <h2 className="text-title">{s.heading}</h2>
                    <div className="mt-5">
                      <Paragraphs items={paragraphs(s.body)} />
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Past events for this programme */}
      {p.events.length > 0 && (
        <section className="py-14 md:py-28">
          <div className="container-page">
            <Reveal>
              <SectionHeading heading={labels.eventsHeading} />
            </Reveal>
            <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {p.events.map((e, i) => (
                <Reveal as="li" key={e.slug} delay={(i % 3) * 0.08}>
                  <EventCard event={e} />
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Gallery strip */}
      {p.gallery.length > 0 && (
        <section className="pb-14 md:pb-28">
          <div className="container-page">
            <Reveal>
              <SectionHeading heading={labels.galleryHeading} />
            </Reveal>
            <div className="mt-10">
              <GalleryGrid images={p.gallery.slice(0, 9)} />
            </div>
          </div>
        </section>
      )}

      {/* Fund this programme: the live donation card, pre-selected to this programme. */}
      <section id="give" className="scroll-mt-20 bg-ink py-14 text-white md:py-28">
        <div className="container-page grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal className="lg:sticky lg:top-28">
            <SectionHeading tone="dark" eyebrow={p.shortTitle} heading={labels.fundHeading} body={labels.fundBody} />
          </Reveal>
          <Reveal delay={0.1} className="-mx-2 min-w-0 text-ink sm:mx-0">
            <DonationCard initialCause={p.slug} lockCause />
          </Reveal>
        </div>
      </section>
    </>
  );
}
