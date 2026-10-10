/**
 * Site details and page text. The form is built from the settings themselves,
 * so any text the site uses can be edited here, with plain-English labels.
 */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { isTodo } from '@gtyf/shared';
import type { SiteSettings } from '@gtyf/shared/content';
import { adminApi, useAdminData } from '../auth';
import { FormSection, IconBtn, ImageField, SaveBar, useSave } from '../content/kit';
import { Input, Notice, PageHeader, Spinner, TextArea } from '../ui';

type Key = keyof SiteSettings;
const GROUPS: Record<string, { title: string; subtitle: string; keys: Key[] }> = {
  contact: { title: 'Contact & social links', subtitle: 'Shown in the footer and on the Contact page. Leave a social link empty to hide it.', keys: ['contact', 'socials'] },
  organisation: { title: 'Organisation details', subtitle: 'Your name, mission, registration number and bank details.', keys: ['organisation', 'bank'] },
  pages: { title: 'Page headings & intros', subtitle: 'The heading and intro text at the top of each page, and the About page story.', keys: ['about', 'pages'] },
  donation: { title: 'Donation & thank-you text', subtitle: 'The words on the donation card, the thank-you page, the receipt (on screen, PDF and email) and what donors share.', keys: ['donate', 'thanks'] },
  labels: { title: 'Buttons, labels & 404 page', subtitle: 'Link and button wording used across the site, the call-to-action at the bottom of pages, and the “page not found” screen.', keys: ['common', 'closing', 'notFound'] },
  footer: { title: 'Menu & footer', subtitle: 'Menu labels, footer text and links, and how the site appears on Google.', keys: ['navigation', 'footer', 'seo'] },
};

const SECTION_TITLES: Record<string, string> = {
  contact: 'Contact details',
  socials: 'Social media links',
  organisation: 'Organisation',
  bank: 'Bank & Mobile Money (for direct transfers)',
  about: 'About page',
  pages: 'Other pages',
  navigation: 'Top menu',
  footer: 'Footer',
  seo: 'Google & link previews',
  donate: 'Donation card and donate page',
  thanks: 'Thank-you page, receipt and emails',
  common: 'Buttons and links',
  closing: 'Closing call-to-action (bottom of pages)',
  notFound: 'Page not found (404)',
  programmes: 'Programmes page',
  programme: 'Each programme page',
  events: 'Events page',
  event: 'Each event page',
  news: 'News page',
  gallery: 'Gallery page',
  team: 'Team page',
  getInvolved: 'Get involved page',
};

const LABELS: Record<string, [string, string?]> = {
  email: ['Email address'],
  phone: ['Phone number', 'e.g. +233 20 000 0000'],
  whatsapp: ['WhatsApp number', 'International format without +, e.g. 233200000000. Adds a “Message us on WhatsApp” link.'],
  address: ['Postal or office address'],
  facebook: ['Facebook page link', 'Full link, e.g. https://facebook.com/…'],
  instagram: ['Instagram link'],
  x: ['X (Twitter) link'],
  tiktok: ['TikTok link'],
  youtube: ['YouTube link'],
  linkedin: ['LinkedIn link'],
  name: ['Organisation name'],
  shortName: ['Short name', 'e.g. GTYF'],
  missionLine: ['Mission statement'],
  registrationNumber: ['Registration number', 'Shown in the footer and on receipts.'],
  foundedYear: ['Year founded'],
  location: ['Where you work', 'Shown in the footer.'],
  logoMediaId: ['Logo (optional)', 'Leave empty to keep the current logo.'],
  accountName: ['Account name'],
  bankName: ['Bank name'],
  accountNumber: ['Account number'],
  branch: ['Branch'],
  momoNumber: ['Mobile Money number'],
  momoName: ['Mobile Money account name'],
  eyebrow: ['Small label above the heading'],
  heading: ['Heading'],
  underlineWord: ['Word to underline', 'One word from the heading that gets the hand-drawn underline.'],
  intro: ['Intro text'],
  storyHeading: ['Story heading'],
  story: ['Our story', 'How and why GTYF began. Separate paragraphs with an empty line.'],
  whereHeading: ['“Where we work” heading'],
  whereBody: ['“Where we work” text'],
  valuesHeading: ['Values heading'],
  selectionHeading: ['“How we choose” heading'],
  teamHeading: ['Team heading'],
  teamLinkLabel: ['Team link text'],
  empty: ['Message when there’s nothing to show'],
  emptyUpcoming: ['Message when no event is planned'],
  upcomingTab: ['“Upcoming” tab label'],
  pastTab: ['“Past” tab label'],
  success: ['Thank-you message after the form is sent'],
  formHeading: ['Form heading'],
  volunteerHeading: ['Volunteer heading'],
  volunteerIntro: ['Volunteer intro'],
  partnerHeading: ['Partner heading'],
  partnerIntro: ['Partner intro'],
  howItWorksLabel: ['“How it works” label'],
  eventsHeading: ['Past events heading'],
  galleryHeading: ['Photos heading'],
  fundHeading: ['Donation card heading'],
  fundBody: ['Donation card text'],
  highlightsHeading: ['Highlights heading'],
  schoolsHeading: ['Schools heading'],
  supportLabel: ['“Support this outreach” button'],
  volunteerLabel: ['“Volunteer” button'],
  links: ['Menu links'],
  donateLabel: ['Donate button text'],
  blurb: ['Footer description'],
  newsletterHeading: ['Newsletter heading'],
  newsletterBody: ['Newsletter text'],
  newsletterSuccess: ['Newsletter thank-you message'],
  exploreHeading: ['First links heading'],
  exploreLinks: ['First links'],
  involvedHeading: ['Second links heading'],
  involvedLinks: ['Second links'],
  contactHeading: ['Contact heading'],
  paymentsNote: ['Payments note'],
  learnMore: ['“Learn more” link'],
  exploreProgramme: ['“Explore the programme” link'],
  readMore: ['“Read more” link on event cards'],
  allProgrammes: ['“All programmes” link'],
  allNews: ['“All news” link'],
  upcomingBadge: ['“Upcoming” tag on event cards'],
  programmeEyebrow: ['Small label on programme pages'],
  upcomingEventEyebrow: ['Small label on upcoming event pages'],
  leaderBadge: ['“Leader” tag on team photos'],
  joinList: ['Newsletter button'],
  joiningLabel: ['Newsletter button while sending'],
  newsletterPlaceholder: ['Newsletter email box hint'],
  body: ['Text'],
  homeLabel: ['“Go home” button'],
  pageEyebrow: ['Small label above the cause name (donate page)'],
  eventEyebrow: ['Small label when giving to an event'],
  secureNote: ['Security line at the top of the card'],
  monthlyLabel: ['“Monthly” choice'],
  oneTimeLabel: ['“One-time” choice'],
  monthlyNote: ['Note under the amount (monthly)'],
  oneTimeNote: ['Note under the amount (one-time)'],
  causeHeading: ['Heading above the causes'],
  impactLabel: ['Heading of the “impact” box'],
  detailsHeading: ['Heading above name, email and phone'],
  mobileMoneyHint: ['Link that switches monthly to one-time'],
  moreOptionsLabel: ['Link that opens the extra options (anonymous, dedicate…)'],
  giveLabel: ['Word on the pay button, before the amount (e.g. Give)'],
  coverFeeText: ['Text under “cover the fees”'],
  anonymousText: ['Text under “give anonymously”'],
  trustNote: ['Reassurance under the pay button'],
  headline: ['Thank-you page heading', 'Use {name} for the donor’s first name.'],
  introOnce: ['Line under the thank-you heading (one-time gift)'],
  introMonthly: ['Line under the thank-you heading (monthly gift)'],
  receiptTitle: ['Receipt title'],
  receivedFrom: ['“Received from” line'],
  message: ['Thank-you message on the receipt', 'Also used in the receipt email and PDF.'],
  signOff: ['Signature under the message'],
  shareLabel: ['“Share my impact” button'],
  friendLabel: ['“Tell a friend” button'],
  pdfLabel: ['“Receipt PDF” button'],
  emailNote: ['Note under the buttons'],
  monthlyHeading: ['“Make it monthly” heading'],
  monthlyBody: ['“Make it monthly” text'],
  whatsappText: ['Message a donor sends to friends on WhatsApp'],
  copyright: ['Copyright line', '{year} and {name} are filled in automatically.'],
  defaultTitle: ['Site title on Google'],
  titleTemplate: ['Page title pattern', '%s is replaced by the page name.'],
  defaultDescription: ['Site description on Google'],
  defaultOgImageId: ['Default share image', 'Shown when a page without its own photo is shared on WhatsApp or Facebook.'],
};

const LONG = /(mission|intro|story|body|blurb|description|success|empty|note)/i;
const human = (k: string) => LABELS[k]?.[0] ?? k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

type Json = string | number | null | Json[] | { [k: string]: Json };

function FieldFor({ k, value, onChange }: { k: string; value: Json; onChange: (v: Json) => void }) {
  const [label, hint] = [human(k), LABELS[k]?.[1]];
  if (k.endsWith('MediaId') || k.endsWith('ImageId') || k === 'photoId') return <ImageField label={label} help={hint} value={(value as string | null) ?? null} onChange={onChange} />;
  if (typeof value === 'number') return <Input label={label} hint={hint} name={k} type="number" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />;
  if (Array.isArray(value)) return <LinkList label={label} value={value as { label: string; href: string }[]} onChange={onChange as (v: Json) => void} />;
  if (value !== null && typeof value === 'object') {
    return (
      <div className="space-y-4 rounded-2xl bg-mist p-4">
        <p className="font-display font-bold">{SECTION_TITLES[k] ?? human(k)}</p>
        {Object.entries(value).map(([ck, cv]) => (
          <FieldFor key={ck} k={ck} value={cv} onChange={(v) => onChange({ ...value, [ck]: v })} />
        ))}
      </div>
    );
  }
  // Placeholders ("TODO: …") show as empty fields with the note as a hint.
  const str = (value as string | null) ?? '';
  const todo = isTodo(str);
  const shown = todo ? '' : str;
  const props = { label, name: k, value: shown, placeholder: todo ? 'Not filled in yet' : undefined, hint: todo ? `${hint ? `${hint} ` : ''}Still to add: ${str.replace(/^TODO:\s*/, '')}` : hint };
  return LONG.test(k) || shown.length > 90 ? (
    <TextArea {...props} rows={Math.min(8, Math.max(2, Math.ceil(shown.length / 70)))} onChange={(e) => onChange(e.target.value)} />
  ) : (
    <Input {...props} onChange={(e) => onChange(e.target.value)} />
  );
}

function LinkList({ label, value, onChange }: { label: string; value: { label: string; href: string }[]; onChange: (v: Json) => void }) {
  const set = (i: number, patch: Partial<{ label: string; href: string }>) => onChange(value.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  return (
    <div>
      <p className="text-[0.9375rem] font-semibold">{label}</p>
      <ul className="mt-2 space-y-2">
        {value.map((l, i) => (
          <li key={i} className="flex items-end gap-2 rounded-2xl bg-white p-3">
            <div className="grid flex-1 grid-cols-2 gap-2">
              <Input label="Text" name={`ll${i}`} value={l.label} onChange={(e) => set(i, { label: e.target.value })} />
              <Input label="Goes to" name={`lh${i}`} value={l.href} onChange={(e) => set(i, { href: e.target.value })} />
            </div>
            <IconBtn label="Remove link" onClick={() => onChange(value.filter((_, k) => k !== i))} d="M6 6l12 12M18 6L6 18" />
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => onChange([...value, { label: '', href: '/' }])} className="mt-2 h-11 rounded-full px-3 font-semibold text-slate hover:bg-ink/5">
        + Add link
      </button>
    </div>
  );
}

export default function Settings() {
  const { group = 'contact' } = useParams();
  const cfg = GROUPS[group] ?? GROUPS.contact!;
  const { data } = useAdminData<SiteSettings>('/content/settings');
  const [draft, setDraft] = useState<Partial<SiteSettings> | null>(null);
  const { busy, message, run } = useSave<unknown>();

  useEffect(() => {
    if (data) setDraft(Object.fromEntries(cfg.keys.map((k) => [k, data[k]])) as Partial<SiteSettings>);
  }, [data, group]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!draft) return <Spinner />;

  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        await run(async () => {
          for (const k of cfg.keys) await adminApi(`/content/settings/${k}`, { method: 'PUT', json: draft[k] });
          return true;
        });
      }}
    >
      <Link to="/admin/content" className="mb-3 inline-flex min-h-11 items-center font-semibold text-slate hover:text-ink">
        ← Website
      </Link>
      <PageHeader title={cfg.title} subtitle={cfg.subtitle} />
      {group === 'donation' && (
        <div className="mb-4">
          <Notice>
            You can use these placeholders: <strong>{'{name}'}</strong> = the donor’s first name, <strong>{'{org}'}</strong> = your organisation’s name, <strong>{'{impact}'}</strong> = what the gift provides,
            <strong> {'{link}'}</strong> = your donate page link. They’re filled in automatically.
          </Notice>
        </div>
      )}
      {group === 'organisation' && (
        <div className="mb-4">
          <Notice>Bank and Mobile Money details are only shown where you choose to show them; online gifts always go through Paystack.</Notice>
        </div>
      )}
      <div className="space-y-4">
        {cfg.keys.map((k) => (
          <FormSection key={k} title={SECTION_TITLES[k] ?? k}>
            {Object.entries(draft[k] as Record<string, Json>)
              .filter(([field]) => field !== 'logoMediaId') // the logo comes from the brand files
              .map(([field, value]) => (
              <FieldFor
                key={field}
                k={field}
                value={value}
                onChange={(v) => setDraft((d) => ({ ...d!, [k]: { ...(d![k] as object), [field]: v } }))}
              />
            ))}
          </FormSection>
        ))}
      </div>
      <SaveBar busy={busy} message={message} />
    </form>
  );
}
