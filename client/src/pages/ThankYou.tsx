import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { m, useReducedMotion } from 'framer-motion';
import { fillTemplate, formatCedis } from '@gtyf/shared';
import type { DonationReceipt } from '@gtyf/shared/donations';
import { Receipt } from '../components/donate/Receipt';
import { Seo } from '../components/Seo';
import { Button, ButtonLink } from '../components/ui/Button';
import { UnderlinedHeading } from '../components/ui/HandUnderline';
import { lastDonation } from '../lib/pay';
import { EASE } from '../lib/motion';
import { drawImpactImage, shareOrDownload } from '../lib/shareImage';
import { useSite } from '../lib/site';

type View = { kind: 'verifying' } | { kind: 'success'; r: DonationReceipt } | { kind: 'slow'; r: DonationReceipt | null } | { kind: 'failed'; r: DonationReceipt | null } | { kind: 'missing' };

const POLL_MS = 2500;
const GIVE_UP_MS = 60_000; // Mobile Money approvals can take a while

/**
 * /donate/thank-you?ref=…&t=…
 * Confirms the gift with our server (which asks Paystack), then reveals the
 * impact receipt with share, download and "tell a friend" actions.
 */
export default function ThankYou() {
  const [params] = useSearchParams();
  const remembered = typeof window !== 'undefined' ? lastDonation() : null;
  const reference = params.get('ref') ?? params.get('reference') ?? remembered?.reference ?? null;
  const token = params.get('t') ?? (remembered?.reference === reference ? remembered?.receiptToken : null) ?? null;
  const [view, setView] = useState<View>({ kind: 'verifying' });

  useEffect(() => {
    if (!reference || !token) {
      setView({ kind: 'missing' });
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const started = Date.now();
    const poll = async () => {
      try {
        const res = await fetch(`/api/donations/${encodeURIComponent(reference)}?t=${encodeURIComponent(token)}`, { cache: 'no-store' });
        if (res.status === 404) return !cancelled && setView({ kind: 'missing' });
        const r = (await res.json()) as DonationReceipt;
        if (cancelled) return;
        if (r.status === 'success') return setView({ kind: 'success', r });
        if (r.status === 'failed' || r.status === 'reversed') return setView({ kind: 'failed', r });
        if (Date.now() - started > GIVE_UP_MS) return setView({ kind: 'slow', r });
      } catch {
        if (Date.now() - started > GIVE_UP_MS) return !cancelled && setView({ kind: 'slow', r: null });
      }
      timer = setTimeout(poll, POLL_MS);
    };
    // A short pause lets the "writing" moment land even when confirmation is instant.
    timer = setTimeout(poll, 900);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [reference, token]);

  return (
    <>
      <Seo title="Thank you" noindex />
      <section className="min-h-[80svh] bg-mist pb-16">
        {view.kind === 'verifying' && <Verifying />}
        {view.kind === 'success' && <Success r={view.r} reference={reference!} token={token!} />}
        {view.kind === 'slow' && (
          <Message
            heading="Your payment is still being confirmed."
            body="Mobile Money approvals can take a minute or two. There’s nothing more you need to do: we’ll email your receipt as soon as it comes through."
            action={<ButtonLink to="/">Back to the home page</ButtonLink>}
          />
        )}
        {view.kind === 'failed' && (
          <Message
            heading="That payment didn’t go through."
            body="No money was taken. This sometimes happens with a declined card or an unapproved Mobile Money prompt. Your details are saved, so trying again only takes a moment."
            action={
              <ButtonLink to={`/donate?${new URLSearchParams({ ...(view.r?.causeSlug ? { cause: view.r.causeSlug } : {}), ...(view.r ? { amount: String(view.r.amount), frequency: view.r.frequency } : {}) })}`} size="lg">
                Try again
              </ButtonLink>
            }
          />
        )}
        {view.kind === 'missing' && (
          <Message
            heading="We couldn’t find that gift."
            body="The link may be incomplete. If you’ve just given, your receipt is on its way to your email."
            action={<ButtonLink to="/donate">Go to the donate page</ButtonLink>}
          />
        )}
      </section>
    </>
  );
}

/** "Recording your gift…": lines being written into an exercise book. */
function Verifying() {
  const reduce = useReducedMotion();
  return (
    <div role="status" className="container-page grid min-h-[80svh] place-items-center py-16">
      <div className="w-full max-w-sm">
        <div className="ruled relative h-56 overflow-hidden rounded-card shadow-soft">
          <div className="absolute inset-y-0 left-[4.25rem] right-8 pt-[2.35rem]">
            {[0.9, 0.75, 0.85, 0.5].map((w, i) => (
              <span
                key={i}
                aria-hidden="true"
                className="mb-[1.5rem] block h-2 origin-left rounded-full bg-ink/70"
                style={{
                  width: `${w * 100}%`,
                  transform: reduce ? 'none' : 'scaleX(0)',
                  animation: reduce ? 'none' : `write-line 0.9s ${0.2 + i * 0.75}s var(--ease-guide) forwards`,
                }}
              />
            ))}
          </div>
        </div>
        <p className="mt-8 text-center font-display text-xl font-semibold">Recording your gift…</p>
      </div>
    </div>
  );
}

function Success({ r, reference, token }: { r: DonationReceipt; reference: string; token: string }) {
  // Wording is editable in Admin → Website → Donation & thank-you text.
  const { organisation, thanks } = useSite();
  const reduce = useReducedMotion();
  const [sharing, setSharing] = useState<'idle' | 'working' | 'done'>('idle');
  const receiptRef = useRef<HTMLElement>(null);
  const siteUrl = (import.meta.env.VITE_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');
  const host = siteUrl.replace(/^https?:\/\//, '');
  const impactText = (r.impactSummary ?? '').replace(/^.*?=\s*/, '');
  const monthly = r.frequency === 'monthly';

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  const share = async () => {
    setSharing('working');
    try {
      const blob = await drawImpactImage(r, organisation.name, host);
      await shareOrDownload(blob, `my-gtyf-impact-${r.reference}.png`, `I just supported ${organisation.name}. Join me: ${siteUrl}/donate`);
      setSharing('done');
    } catch {
      setSharing('idle');
    }
  };

  const whatsappText = encodeURIComponent(
    fillTemplate(thanks.whatsappText, { impact: impactText || 'a gift', org: organisation.name, link: `${siteUrl}/donate` }),
  );

  // A gentle burst of lantern light behind the headline.
  const sparks = Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * Math.PI * 2;
    const dist = 90 + (i % 3) * 38;
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist * 0.6, size: 6 + (i % 3) * 4, delay: 0.15 + (i % 4) * 0.05 };
  });

  return (
    <div className="container-page pt-10 md:pt-16">
      <div className="relative mx-auto max-w-xl text-center">
        {!reduce && (
          <div aria-hidden="true" className="pointer-events-none absolute top-16 left-1/2">
            {sparks.map((s, i) => (
              <m.span
                key={i}
                className={`absolute rounded-full ${i % 3 === 0 ? 'bg-lantern' : i % 3 === 1 ? 'bg-[#E8508B]' : 'bg-[#3BA4E0]'}`}
                style={{ width: s.size, height: s.size, marginLeft: -s.size / 2, marginTop: -s.size / 2 }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
                animate={{ x: s.x, y: s.y, opacity: [0, 1, 0], scale: 1 }}
                transition={{ duration: 1.6, ease: EASE, delay: s.delay }}
              />
            ))}
          </div>
        )}
        <m.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} className="mx-auto grid size-16 place-items-center rounded-full bg-[#1F9D55] text-white shadow-[0_12px_30px_-10px_rgb(31_157_85/0.7)]">
          <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <m.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.3, ease: EASE }} />
          </svg>
        </m.div>
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}>
          <UnderlinedHeading as="h1" text={fillTemplate(thanks.headline, { name: r.firstName })} word={r.firstName} className="mt-6 text-[clamp(2.5rem,1.8rem+3.5vw,4.25rem)] leading-[1.02] font-extrabold" />
          <p className="prose-measure mx-auto mt-4 text-lead text-slate">
            {monthly ? thanks.introMonthly : thanks.introOnce}{' '}
            {impactText ? (
              <>
                It provides <strong className="text-ink">{impactText}</strong>
                {monthly ? ' every month' : ''}.
              </>
            ) : (
              'It goes straight to our work with children in Wamfie.'
            )}
          </p>
        </m.div>
      </div>

      <m.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.45 }} className="mt-10">
        <Receipt ref={receiptRef} r={r} orgName={organisation.name} />
      </m.div>

      <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.6, ease: EASE }} className="mx-auto mt-8 grid max-w-md gap-3">
        <Button size="lg" onClick={share} disabled={sharing === 'working'} className="w-full">
          {sharing === 'working' ? 'Preparing your image…' : sharing === 'done' ? 'Share it again' : thanks.shareLabel}
        </Button>
        <div className="grid grid-cols-2 gap-3">
          <a
            href={`https://wa.me/?text=${whatsappText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-white px-4 font-semibold shadow-soft ring-1 ring-ink/10 hover:ring-ink"
          >
            <svg viewBox="0 0 24 24" className="size-5 text-[#1FAF38]" fill="currentColor" aria-hidden="true">
              <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.1.3.7 1.1 1.4 1.8 1 .9 1.8 1.1 2.1 1.3.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.4Z" />
            </svg>
            {thanks.friendLabel}
          </a>
          <a
            href={`/api/donations/${encodeURIComponent(reference)}/receipt.pdf?t=${encodeURIComponent(token)}`}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-white px-4 font-semibold shadow-soft ring-1 ring-ink/10 hover:ring-ink"
          >
            <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 3v9m0 0l-3.5-3.5M10 12l3.5-3.5M4 15.5h12" />
            </svg>
            {thanks.pdfLabel}
          </a>
        </div>
        <p className="text-center text-sm text-slate">{thanks.emailNote}</p>
      </m.div>

      {!monthly && (
        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.7, ease: EASE }}
          className="mx-auto mt-10 max-w-md rounded-card bg-ink p-7 text-white"
        >
          <p className="font-display text-2xl font-bold">{thanks.monthlyHeading}</p>
          <p className="mt-2 text-white/70">{thanks.monthlyBody}</p>
          <ButtonLink
            to={`/donate?${new URLSearchParams({ frequency: 'monthly', amount: String(r.amount), ...(r.causeSlug ? { cause: r.causeSlug } : {}) })}`}
            className="mt-6 w-full"
          >
            Give {formatCedis(r.amount)} monthly
          </ButtonLink>
        </m.div>
      )}

      <p className="mt-10 text-center">
        <Link to="/" className="inline-flex min-h-11 items-center font-semibold text-slate hover:text-ink">
          Back to the home page
        </Link>
      </p>
    </div>
  );
}

function Message({ heading, body, action }: { heading: string; body: string; action: React.ReactNode }) {
  return (
    <div className="container-page grid min-h-[70svh] place-items-center py-16">
      <div role="status" className="w-full max-w-xl rounded-card bg-white p-8 shadow-soft ring-1 ring-ink/[0.06] sm:p-10">
        <h1 className="text-[1.75rem] leading-tight font-bold">{heading}</h1>
        <p className="mt-4 text-lead text-slate">{body}</p>
        <div className="mt-6">{action}</div>
      </div>
    </div>
  );
}
