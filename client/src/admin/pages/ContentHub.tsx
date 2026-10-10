import { Link } from 'react-router-dom';
import { PageHeader } from '../ui';

const GROUPS: { title: string; items: { to: string; label: string; help: string; icon: string }[] }[] = [
  {
    title: 'Post something new',
    items: [
      { to: '/admin/content/news/new', label: 'Write a news story', help: 'Share what happened at an outreach.', icon: 'M4 5h16v14H4zM8 9h8M8 13h8M8 17h5' },
      { to: '/admin/content/events/new', label: 'Add an event', help: 'An upcoming outreach, or one that already happened.', icon: 'M4 6h16v14H4zM4 10h16M9 3v4M15 3v4' },
      { to: '/admin/content/team?add=1', label: 'Add a team member', help: 'Name, role, photo and a short bio.', icon: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M18 8v6M15 11h6' },
      { to: '/admin/website-photos', label: 'Add photos to the website', help: 'See every photo spot on the site and tap to fill it.', icon: 'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z' },
      { to: '/admin/photos', label: 'Photo library', help: 'Upload many photos at once from your phone or computer.', icon: 'M4 16l4-4 3 3 5-5 4 4M4 20h16M12 3v9m0-9l-3 3m3-3l3 3' },
    ],
  },
  {
    title: 'Website sections',
    items: [
      { to: '/admin/content/news', label: 'News', help: 'All stories, drafts and published.', icon: 'M4 5h16v14H4zM8 9h8M8 13h8' },
      { to: '/admin/content/events', label: 'Events', help: 'Upcoming and past outreach.', icon: 'M4 6h16v14H4zM4 10h16' },
      { to: '/admin/content/slides', label: 'Home page slides', help: 'The big photos, headlines and buttons at the top.', icon: 'M3 5h18v12H3zM8 21h8M7 9h6' },
      { to: '/admin/content/home', label: 'Home page sections', help: 'Headings, order, and show or hide sections.', icon: 'M4 5h16M4 10h16M4 15h10M4 20h7' },
      { to: '/admin/content/programmes', label: 'Programmes', help: 'The four programmes: text, photos and “how it works”.', icon: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5' },
      { to: '/admin/content/team', label: 'Team', help: 'Names, roles, photos and short bios.', icon: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0' },
      { to: '/admin/content/impact', label: 'Impact numbers & gift prices', help: 'The counters on the home page and what each amount buys.', icon: 'M4 20V10M10 20V4M16 20v-8M22 20H2' },
      { to: '/admin/content/values', label: 'Core values', help: 'The eight values and their explanations.', icon: 'M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z' },
    ],
  },
  {
    title: 'Details & page text',
    items: [
      { to: '/admin/content/settings/contact', label: 'Contact & social links', help: 'Phone, email, WhatsApp, address, Facebook…', icon: 'M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2' },
      { to: '/admin/content/settings/organisation', label: 'Organisation details', help: 'Name, mission line, registration number, bank and MoMo.', icon: 'M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6' },
      { to: '/admin/content/settings/donation', label: 'Donation & thank-you text', help: 'The donation card, thank-you page, receipt and what donors share.', icon: 'M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z' },
      { to: '/admin/content/settings/labels', label: 'Buttons, labels & 404 page', help: 'Link wording, the bottom-of-page call to action, and the “page not found” screen.', icon: 'M4 7h16v10H4zM8 12h8' },
      { to: '/admin/content/settings/pages', label: 'Page headings & intros', help: 'About, Programmes, Events, News, Gallery, Contact…', icon: 'M4 4h16v4H4zM4 12h10M4 16h16M4 20h8' },
      { to: '/admin/content/settings/footer', label: 'Menu & footer', help: 'Menu labels, footer text and links, newsletter text.', icon: 'M4 6h16M4 12h16M4 18h16' },
    ],
  },
];

export default function ContentHub() {
  return (
    <>
      <PageHeader title="Website" subtitle="Change almost anything on the site. Changes go live as soon as you save." />
      <div className="space-y-8">
        {GROUPS.map((g) => (
          <section key={g.title}>
            <h2 className="mb-3 text-sm font-bold tracking-wide text-slate uppercase">{g.title}</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((it) => (
                <li key={it.to}>
                  <Link to={it.to} className="flex h-full items-start gap-4 rounded-3xl bg-white p-5 ring-1 ring-ink/[0.05] transition-shadow hover:shadow-soft">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#FFF6E0] text-ink">
                      <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d={it.icon} />
                      </svg>
                    </span>
                    <span>
                      <span className="block font-semibold">{it.label}</span>
                      <span className="mt-0.5 block text-sm text-slate">{it.help}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
