import { useSearchParams } from 'react-router-dom';
import type { EventsContent } from '@gtyf/shared/api';
import { EventCard } from '../components/cards';
import { NewsletterForm } from '../components/NewsletterForm';
import { Seo } from '../components/Seo';
import { Reveal } from '../components/ui/Reveal';
import { PageIntro } from '../components/ui/SectionHeading';
import { useContent } from '../lib/content';
import { useSite } from '../lib/site';

type Tab = 'upcoming' | 'past';

export default function Events() {
  const { pages } = useSite();
  const p = pages.events;
  const { data } = useContent<EventsContent>('/content/events');
  const [params, setParams] = useSearchParams();

  const upcoming = data?.upcoming ?? [];
  const past = data?.past ?? [];
  // Default to Upcoming when something is planned, otherwise show the record of past work.
  const requested = params.get('tab');
  const tab: Tab = requested === 'upcoming' || requested === 'past' ? requested : upcoming.length ? 'upcoming' : 'past';
  const list = tab === 'upcoming' ? upcoming : past;

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'upcoming', label: p.upcomingTab, count: upcoming.length },
    { key: 'past', label: p.pastTab, count: past.length },
  ];

  return (
    <>
      <Seo title={p.eyebrow} description={p.intro} />
      <PageIntro eyebrow={p.eyebrow} heading={p.heading} underlineWord={p.underlineWord} intro={p.intro}>
        {/* Segmented tabs; the selection is in the URL so it can be shared. */}
        <div role="tablist" aria-label={p.eyebrow} className="mt-12 inline-flex rounded-full bg-mist p-1.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              id={`tab-${t.key}`}
              aria-selected={tab === t.key}
              aria-controls="events-panel"
              onClick={() => setParams({ tab: t.key }, { replace: true, preventScrollReset: true })}
              className={`relative rounded-full px-6 py-2.5 font-semibold transition-colors duration-300 ${
                tab === t.key ? 'bg-ink text-white shadow-soft' : 'text-ink/60 hover:text-ink'
              }`}
            >
              {t.label}
              <span className={`label ml-2 ${tab === t.key ? 'text-lantern' : 'text-slate'}`}>{t.count}</span>
            </button>
          ))}
        </div>
      </PageIntro>

      <section id="events-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="container-page pb-16 md:pb-32">
        {list.length > 0 ? (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((e, i) => (
              <Reveal as="li" key={e.slug} delay={(i % 3) * 0.06}>
                <EventCard event={e} headingLevel="h2" />
              </Reveal>
            ))}
          </ul>
        ) : (
          <div className="grid items-center gap-8 rounded-card bg-mist p-8 md:grid-cols-2 md:p-14">
            <p className="font-display text-title font-semibold">{p.emptyUpcoming}</p>
            <NewsletterForm source="events-empty-state" successMessage="Thank you. You'll be the first to hear." />
          </div>
        )}
      </section>
    </>
  );
}
