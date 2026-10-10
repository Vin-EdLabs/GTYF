import { Link } from 'react-router-dom';
import { fillTemplate } from '@gtyf/shared';
import type { NavLink as NavLinkItem, SiteSettings } from '@gtyf/shared/content';
import { useSite } from '../../lib/site';
import { Filled, hasContent } from '../ui/Filled';
import { NewsletterForm } from '../NewsletterForm';
import { Logo } from './Logo';

const SOCIAL_LABELS: Record<keyof SiteSettings['socials'], string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  x: 'X',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
};

function LinkColumn({ heading, links }: { heading: string; links: NavLinkItem[] }) {
  return (
    <div>
      <h2 className="label text-white/50">{heading}</h2>
      <ul className="mt-5 space-y-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link to={l.href} className="inline-block py-1 text-white/80 transition-colors hover:text-lantern">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const { organisation, contact, socials, footer } = useSite();
  const socialLinks = (Object.keys(SOCIAL_LABELS) as (keyof typeof SOCIAL_LABELS)[]).filter((k) => hasContent(socials[k]));
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ink text-white">
      {/* Newsletter */}
      <div className="container-page border-b border-white/10 py-14 md:py-24">
        <div className="grid items-end gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-display">{footer.newsletterHeading}</h2>
            <p className="prose-measure mt-4 text-lead text-white/70">{footer.newsletterBody}</p>
          </div>
          <div className="md:justify-self-end">
            <NewsletterForm source="footer" tone="dark" successMessage={footer.newsletterSuccess} />
          </div>
        </div>
      </div>

      {/* Links and contact */}
      <div className="container-page grid grid-cols-2 gap-x-6 gap-y-12 py-14 md:py-16 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div className="col-span-2 max-w-sm lg:col-span-1">
          <Logo tone="light" />
          <p className="mt-5 text-white/70">{footer.blurb}</p>
          <p className="label mt-6 text-white/50">{organisation.location}</p>
        </div>

        <LinkColumn heading={footer.exploreHeading} links={footer.exploreLinks} />
        <LinkColumn heading={footer.involvedHeading} links={footer.involvedLinks} />

        <div className="col-span-2 lg:col-span-1">
          <h2 className="label text-white/50">{footer.contactHeading}</h2>
          <ul className="mt-5 space-y-3 text-white/80">
            <li>
              <Filled value={contact.email}>
                {(v) => (
                  <a href={`mailto:${v}`} className="transition-colors hover:text-lantern">
                    {v}
                  </a>
                )}
              </Filled>
            </li>
            <li>
              <Filled value={contact.phone}>
                {(v) => (
                  <a href={`tel:${v.replace(/\s+/g, '')}`} className="transition-colors hover:text-lantern">
                    {v}
                  </a>
                )}
              </Filled>
            </li>
            <li>
              <Filled value={contact.address}>{(v) => <address className="not-italic">{v}</address>}</Filled>
            </li>
          </ul>
          {socialLinks.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
              {socialLinks.map((k) => (
                <li key={k}>
                  <a
                    href={socials[k]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-white/80 underline decoration-white/20 underline-offset-4 transition-colors hover:text-lantern hover:decoration-lantern"
                  >
                    {SOCIAL_LABELS[k]}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Legal bar */}
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-6 text-sm text-white/50 md:flex-row md:items-center md:justify-between">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              {fillTemplate(footer.copyright, { year, name: organisation.name })}
            </span>
            <Filled value={organisation.registrationNumber}>
              {(v) => <span className="label text-white/50">Reg. No. {v}</span>}
            </Filled>
          </p>
          <p className="flex items-center gap-2">
            <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor" aria-hidden="true">
              <path d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 4 15h8a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 12 6h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 5H6V4.5a2 2 0 1 1 4 0V6Z" />
            </svg>
            {footer.paymentsNote}
          </p>
        </div>
      </div>
    </footer>
  );
}
