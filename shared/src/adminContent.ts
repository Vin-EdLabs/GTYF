/**
 * Admin content editing: validation and shapes for every editable thing on the site.
 */
import { z } from 'zod';
import { IMPACT_ICONS, PUBLISH_STATUSES } from './index';

const text = (max: number, min = 0, msg = 'Please fill this in.') => z.string().trim().min(min, msg).max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null));
const id = z.uuid().nullable().optional().transform((v) => v ?? null);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date.');
/** Internal paths ("/donate") or full https links. */
const href = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v.startsWith('/') || /^https?:\/\//.test(v) || v.startsWith('#'), 'Use a page path like /donate or a full https:// link.');
const slug = z
  .string()
  .trim()
  .toLowerCase()
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes only.')
  .optional();

// --- Media ---------------------------------------------------------------

export const mediaUpdateSchema = z
  .object({
    altText: text(300),
    caption: optionalText(500),
    focalX: z.number().min(0).max(1),
    focalY: z.number().min(0).max(1),
    showsChildren: z.boolean(),
    consentConfirmed: z.boolean(),
    programmeId: id,
    eventId: id,
    year: z.number().int().min(2000).max(2100).nullable().optional().transform((v) => v ?? null),
    hideFromGallery: z.boolean(),
  })
  .partial();

export interface AdminMedia {
  id: string;
  src: string;
  thumb: string;
  width: number;
  height: number;
  altText: string;
  caption: string | null;
  focalX: number;
  focalY: number;
  showsChildren: boolean;
  consentConfirmed: boolean;
  programmeId: string | null;
  eventId: string | null;
  year: number | null;
  hideFromGallery: boolean;
  /** A placeholder stock photo (Unsplash) to be replaced with GTYF's own. */
  isDemo: boolean;
  /** Why it isn't shown publicly yet, if it isn't. */
  hiddenReason: string | null;
  originalFilename: string;
  createdAt: string;
}

// --- Hero slides -----------------------------------------------------------

export const heroSlideSchema = z.object({
  eyebrow: text(120, 1),
  headline: text(140, 2),
  underlineWord: text(40),
  subtext: text(300),
  imageId: id,
  programmeId: id,
  primaryLabel: text(40, 1),
  primaryHref: href,
  secondaryLabel: text(40, 1),
  secondaryHref: href,
  isActive: z.boolean(),
});
export type HeroSlideInput = z.input<typeof heroSlideSchema>;

// --- Home sections ---------------------------------------------------------

export const homeSectionSchema = z.object({
  eyebrow: text(120),
  heading: text(160),
  underlineWord: text(40),
  body: text(1000),
  items: z.array(z.object({ title: text(80, 1), body: text(400, 1) })).max(6),
  isVisible: z.boolean(),
});

export const reorderSchema = z.object({ ids: z.array(z.string().min(1)).min(1).max(200) });

// --- Programmes ------------------------------------------------------------

export const programmeSchema = z.object({
  title: text(160, 2),
  shortTitle: text(60, 2),
  summary: text(400, 10),
  body: text(8000, 10),
  heroImageId: id,
  status: z.enum(PUBLISH_STATUSES),
  seoTitle: optionalText(120),
  seoDescription: optionalText(300),
  sections: z
    .array(z.object({ heading: text(160, 2), body: text(4000, 2), imageId: id }))
    .max(10),
});

// --- Events ----------------------------------------------------------------

export const eventSchema = z
  .object({
    title: text(160, 3, 'Give the event a title.'),
    slug,
    programmeId: id,
    dateStart: isoDate,
    dateEnd: isoDate.nullable().optional().transform((v) => v ?? null),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .nullable()
      .optional()
      .or(z.literal(''))
      .transform((v) => v || null),
    venue: text(200, 2, 'Where is it?'),
    participants: z.number().int().min(0).max(1_000_000).nullable().optional().transform((v) => v ?? null),
    summary: optionalText(400),
    story: optionalText(8000),
    closingNote: optionalText(2000),
    highlights: z.array(text(400, 1)).max(20),
    schoolsVisited: z.array(text(160, 1)).max(40),
    heroImageId: id,
    volunteersWanted: z.boolean(),
    status: z.enum(PUBLISH_STATUSES),
    seoTitle: optionalText(120),
    seoDescription: optionalText(300),
  })
  .refine((e) => !e.dateEnd || e.dateEnd >= e.dateStart, { message: 'The end date must be on or after the start date.', path: ['dateEnd'] });
export type EventInput = z.input<typeof eventSchema>;

// --- News ------------------------------------------------------------------

export const newsSchema = z.object({
  title: text(200, 3, 'Give the story a title.'),
  slug,
  excerpt: text(400),
  bodyJson: z.unknown().optional(),
  bodyHtml: z.string().max(200_000),
  coverImageId: id,
  programmeId: id,
  eventId: id,
  status: z.enum(PUBLISH_STATUSES),
  publishedAt: z.iso.datetime().nullable().optional().transform((v) => v ?? null),
  seoTitle: optionalText(120),
  seoDescription: optionalText(300),
});

// --- Team, values, impact --------------------------------------------------

/** A pasted profile link ("linkedin.com/in/ama" is fine). Empty means "none". Must belong to the right site. */
const profileLink = (hosts: string[], site: string) =>
  z
    .string()
    .trim()
    .max(300)
    .default('')
    .transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v.replace(/^\/+/, '')}` : v))
    .refine(
      (v) => {
        if (!v) return true;
        try {
          const host = new URL(v).hostname.toLowerCase().replace(/^www\./, '');
          return hosts.some((h) => host === h || host.endsWith(`.${h}`));
        } catch {
          return false;
        }
      },
      `Paste the link to their ${site} profile.`,
    );

export const teamMemberSchema = z.object({
  name: text(120, 2),
  role: text(120, 2),
  bio: text(1500),
  photoId: id,
  isLeader: z.boolean().default(false),
  email: z.string().trim().max(200).default('').refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Enter a valid email address.'),
  linkedin: profileLink(['linkedin.com'], 'LinkedIn'),
  instagram: profileLink(['instagram.com'], 'Instagram'),
  tiktok: profileLink(['tiktok.com'], 'TikTok'),
  isVisible: z.boolean(),
});

export const coreValuesSchema = z.object({
  values: z.array(z.object({ name: text(60, 2), description: text(300), descriptionIsDraft: z.boolean() })).min(1).max(16),
});

export const impactStatsSchema = z.object({
  stats: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(60),
        value: z.number().int().min(0).max(1_000_000_000),
        prefix: text(30),
        suffix: text(10),
        label: text(120, 2),
        isYear: z.boolean(),
        isVisible: z.boolean(),
      }),
    )
    .max(16),
});

export const impactItemSchema = z.object({
  label: text(120, 2),
  singular: text(80, 2),
  plural: text(80, 2),
  unitPrice: z.number().int().min(100, 'At least GH₵ 1.').max(10_000_000),
  icon: z.enum(IMPACT_ICONS),
  programmeId: id,
  isActive: z.boolean(),
  needsConfirmation: z.boolean(),
});

/** Turn a title into a URL slug: "Back to School 2026!" → "back-to-school-2026". */
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';
