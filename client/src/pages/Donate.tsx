import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, m } from 'framer-motion';
import { DONATION_LIMITS } from '@gtyf/shared/donations';
import type { EventDetail } from '@gtyf/shared/api';
import { DonationCard, type Frequency } from '../components/donate/DonationCard';
import { programmeIcon } from '../components/icons/ImpactIcon';
import { Seo } from '../components/Seo';
import { Picture } from '../components/ui/Picture';
import { fetchContent } from '../lib/content';
import { EASE } from '../lib/motion';
import { useDonationConfig, useSite } from '../lib/site';

/**
 * /donate — split screen on desktop (photo left, card right); on phones a
 * short photo band and then the card, so the form is reachable immediately.
 * Accepts ?cause= ?frequency= ?amount= ?event= ?campaign= for pre-selection.
 */
export default function Donate() {
  const [params] = useSearchParams();
  const config = useDonationConfig();
  const { organisation, donate } = useSite();

  const causeParam = params.get('cause');
  const initialCause = config.causes.some((c) => c.slug === causeParam) ? causeParam : null;
  const initialFrequency: Frequency = params.get('frequency') === 'one_time' ? 'one_time' : 'monthly';
  const amountParam = Number(params.get('amount'));
  const initialAmount = Number.isInteger(amountParam) && amountParam >= DONATION_LIMITS.min ? amountParam : 20_000;
  const eventSlug = params.get('event') ?? undefined;
  const campaignSlug = params.get('campaign') ?? undefined;

  const [cause, setCause] = useState<string | null>(initialCause);
  const onCauseChange = useCallback((c: string | null) => setCause(c), []);
  const [event, setEvent] = useState<EventDetail | null>(null);

  // Giving tagged to an event: show which outreach it supports.
  useEffect(() => {
    if (!eventSlug) return;
    fetchContent<EventDetail>(`/content/events/${eventSlug}`).then(setEvent).catch(() => setEvent(null));
  }, [eventSlug]);

  const info = config.causes.find((c) => c.slug === cause);
  const title = event ? event.title : (info?.title ?? "Where it's needed most");

  return (
    <>
      <Seo title="Donate" description={organisation.missionLine} />
      <div className="lg:grid lg:min-h-[calc(100svh-5rem)] lg:grid-cols-2">
        {/* Photo: short band on phones, full-height sticky panel on desktop */}
        <div className="relative h-44 overflow-hidden bg-ink text-white sm:h-56 lg:sticky lg:top-20 lg:h-[calc(100svh-5rem)]">
          <AnimatePresence initial={false}>
            <m.div
              key={cause ?? 'general'}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: EASE }}
            >
              <Picture image={event?.heroImage ?? info?.heroImage ?? null} sizes="(min-width: 1024px) 50vw, 100vw" priority placeholderIcon={programmeIcon(cause)} />
            </m.div>
          </AnimatePresence>
          <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_top,rgb(11_20_34/0.85),rgb(11_20_34/0.1)_70%)]" />
          <div className="absolute inset-x-0 bottom-0 p-5 pb-14 sm:p-8 sm:pb-16 lg:p-12">
            <p className="label text-lantern">{event ? donate.eventEyebrow : donate.pageEyebrow}</p>
            <AnimatePresence mode="wait" initial={false}>
              <m.h1
                key={title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="mt-2 max-w-[18ch] text-[clamp(1.75rem,1.2rem+2.4vw,3.5rem)] leading-[1.05] font-extrabold"
              >
                {title}
              </m.h1>
            </AnimatePresence>
          </div>
        </div>

        <div className="relative bg-mist px-3 pb-10 sm:px-8 lg:flex lg:items-start lg:justify-center lg:px-12 lg:py-16">
          <div className="relative -mt-10 w-full max-w-xl sm:mx-auto lg:mt-0">
            <DonationCard
              initialCause={initialCause}
              initialFrequency={initialFrequency}
              initialAmount={initialAmount}
              eventSlug={eventSlug}
              campaignSlug={campaignSlug}
              onCauseChange={onCauseChange}
            />
          </div>
        </div>
      </div>
    </>
  );
}
