/**
 * Shapes of the public content API (server/src/routes/content.ts).
 * Both sides import these so a change on one side is a type error on the other.
 */
import type { ImpactIcon } from './index';
import type { SiteSettings } from './content/siteSettings';
import type { HomeSectionKey } from './content/home';

/** An image that is safe to show publicly (alt text present, consent confirmed where a child is shown). */
export interface PublicImage {
  id: string;
  alt: string;
  caption: string | null;
  width: number;
  height: number;
  /** Focal point, 0–1. Used as CSS object-position so faces stay in frame. */
  focalX: number;
  focalY: number;
  blurDataUrl: string | null;
  /** Largest WebP, for plain <img src> and lightboxes. */
  src: string;
  /** `url 640w, url 1280w, url 2048w` per format. */
  srcSetWebp: string;
  srcSetAvif: string;
  /** 1200×630 JPEG for link previews, when available. */
  ogUrl: string | null;
}

export interface HomeSection {
  key: HomeSectionKey;
  eyebrow: string;
  heading: string;
  underlineWord: string;
  body: string;
  items: { title: string; body: string }[];
  isVisible: boolean;
  sortOrder: number;
}

export interface SiteResponse {
  settings: SiteSettings;
  homeSections: HomeSection[];
  /** Everything the donation card needs, so it can be prerendered on any page. */
  donation: import('./donations').DonationConfig;
  /** Link-preview image used when a page has none of its own (from settings.seo.defaultOgImageId). */
  defaultShareImage: string | null;
}

export interface HeroSlide {
  id: string;
  eyebrow: string;
  headline: string;
  underlineWord: string;
  subtext: string;
  image: PublicImage | null;
  programmeSlug: string | null;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
}

export interface ImpactStat {
  key: string;
  value: number;
  prefix: string;
  suffix: string;
  label: string;
  isYear: boolean;
}

export interface ImpactItem {
  key: string;
  programmeSlug: string | null;
  label: string;
  singular: string;
  plural: string;
  unitPrice: number;
  icon: ImpactIcon;
}

export interface CoreValue {
  name: string;
  description: string;
  descriptionIsDraft: boolean;
}

export interface ProgrammeSummary {
  slug: string;
  title: string;
  shortTitle: string;
  summary: string;
  heroImage: PublicImage | null;
}

export interface ProgrammeSection {
  heading: string;
  body: string;
  image: PublicImage | null;
}

export interface EventSummary {
  slug: string;
  title: string;
  dateStart: string;
  dateEnd: string | null;
  startTime: string | null;
  venue: string;
  participants: number | null;
  /** Card text: the summary, else the start of the story, else the first highlight. */
  teaser: string;
  heroImage: PublicImage | null;
  programme: { slug: string; shortTitle: string } | null;
  isUpcoming: boolean;
}

export interface EventDetail extends EventSummary {
  story: string | null;
  closingNote: string | null;
  highlights: string[];
  schoolsVisited: string[];
  volunteersWanted: boolean;
  gallery: PublicImage[];
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface ProgrammeDetail extends ProgrammeSummary {
  body: string;
  sections: ProgrammeSection[];
  events: EventSummary[];
  gallery: PublicImage[];
  impactItems: ImpactItem[];
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface NewsSummary {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  coverImage: PublicImage | null;
  programme: { slug: string; shortTitle: string } | null;
}

export interface NewsDetail extends NewsSummary {
  bodyHtml: string;
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  photo: PublicImage | null;
  /** Leaders are listed first. */
  isLeader: boolean;
  /** Optional; empty string when not set. */
  email: string;
  linkedin: string;
  instagram: string;
  tiktok: string;
}

export interface GalleryItem extends PublicImage {
  year: number | null;
  programme: { slug: string; shortTitle: string } | null;
  event: { slug: string; title: string } | null;
}

export interface HomeContent {
  heroSlides: HeroSlide[];
  impactStats: ImpactStat[];
  programmes: ProgrammeSummary[];
  upcomingEvent: EventSummary | null;
  journey: EventSummary[];
  coreValues: CoreValue[];
  latestNews: NewsSummary[];
  impactItems: ImpactItem[];
}

export interface AboutContent {
  coreValues: CoreValue[];
  impactStats: ImpactStat[];
  team: TeamMember[];
  programmes: ProgrammeSummary[];
  /** The About page photo chosen in the admin (Website photos). */
  photo: PublicImage | null;
}

export interface EventsContent {
  upcoming: EventSummary[];
  past: EventSummary[];
}

export interface GalleryContent {
  items: GalleryItem[];
  programmes: { slug: string; shortTitle: string }[];
  years: number[];
}

export interface StaticPaths {
  programmes: string[];
  events: string[];
  news: string[];
}
