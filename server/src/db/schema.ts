/**
 * Database schema (Drizzle ORM, PostgreSQL).
 *
 * Conventions:
 * - Column names are camelCase here and snake_case in Postgres (casing: 'snake_case').
 * - Money is integer pesewas. Never floats.
 * - Anything shown publicly has a `status` (draft/published) or `isVisible` flag.
 * - Editable text lives in the database; the site hard-codes none of it.
 */
import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  type AnyPgColumn,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  ADMIN_ROLES,
  DONATION_FREQUENCIES,
  DONATION_STATUSES,
  IMPACT_ICONS,
  INBOX_STATUSES,
  PUBLISH_STATUSES,
} from '@gtyf/shared';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const adminRole = pgEnum('admin_role', ADMIN_ROLES);
export const publishStatus = pgEnum('publish_status', PUBLISH_STATUSES);
export const donationFrequency = pgEnum('donation_frequency', DONATION_FREQUENCIES);
export const donationStatus = pgEnum('donation_status', DONATION_STATUSES);
export const inboxStatus = pgEnum('inbox_status', INBOX_STATUSES);
export const impactIcon = pgEnum('impact_icon', IMPACT_ICONS);
export const dedicationType = pgEnum('dedication_type', ['honour', 'memory']);
export const subscriptionStatus = pgEnum('subscription_status', [
  'active',
  'non_renewing',
  'attention',
  'cancelled',
  'completed',
]);
export const campaignStatus = pgEnum('campaign_status', ['draft', 'active', 'completed', 'archived']);
export const eventListKind = pgEnum('event_list_kind', ['highlight', 'school_visited']);

// ---------------------------------------------------------------------------
// Shared column helpers
// ---------------------------------------------------------------------------

const id = () => uuid().primaryKey().defaultRandom();
const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const seoColumns = () => ({
  seoTitle: text(),
  seoDescription: text(),
});

// ---------------------------------------------------------------------------
// Admin users and audit trail
// ---------------------------------------------------------------------------

export const admins = pgTable('admins', {
  id: id(),
  email: text().notNull().unique(),
  name: text().notNull(),
  passwordHash: text().notNull(),
  role: adminRole().notNull().default('editor'),
  isActive: boolean().notNull().default(true),
  lastLoginAt: timestamp({ withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** "Who changed what and when." Written by every admin mutation. */
export const activityLog = pgTable(
  'activity_log',
  {
    id: id(),
    adminId: uuid().references(() => admins.id, { onDelete: 'set null' }),
    action: text().notNull(), // e.g. 'create', 'update', 'publish', 'delete', 'login'
    entityType: text().notNull(), // e.g. 'event', 'hero_slide'
    entityId: text(),
    summary: text().notNull(), // plain language: "Published event 'Life After School Program'"
    changes: jsonb(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.createdAt), index().on(t.entityType, t.entityId)],
);

// ---------------------------------------------------------------------------
// Media library
// ---------------------------------------------------------------------------

export interface MediaVariant {
  width: number;
  height: number;
  /** webp/avif at 640, 1280, 2048 wide; one 1200×630 jpeg for link previews. */
  format: 'webp' | 'avif' | 'jpeg';
  path: string;
}

export const media = pgTable(
  'media',
  {
    id: id(),
    storageKey: text().notNull().unique(),
    originalFilename: text().notNull(),
    mimeType: text().notNull(),
    width: integer().notNull(),
    height: integer().notNull(),
    bytes: integer().notNull(),
    /** Resized WebP/AVIF files at 640 / 1280 / 2048. */
    variants: jsonb().$type<MediaVariant[]>().notNull().default([]),
    blurDataUrl: text(),
    /** Required before an image can be used publicly. */
    altText: text().notNull().default(''),
    caption: text(),
    /** Focal point as fractions of width/height (0–1). Keeps faces in frame on every screen. */
    focalX: real().notNull().default(0.5),
    focalY: real().notNull().default(0.5),
    /** Optional crop rectangle in source pixels. */
    crop: jsonb().$type<{ x: number; y: number; width: number; height: number } | null>(),
    /** Child-safeguarding: an image showing children cannot be published without consent. */
    showsChildren: boolean().notNull().default(false),
    consentConfirmed: boolean().notNull().default(false),
    consentConfirmedBy: uuid().references(() => admins.id, { onDelete: 'set null' }),
    consentConfirmedAt: timestamp({ withTimezone: true }),
    year: integer(),
    programmeId: uuid().references((): AnyPgColumn => programmes.id, { onDelete: 'set null' }),
    eventId: uuid().references((): AnyPgColumn => events.id, { onDelete: 'set null' }),
    tags: text().array().notNull().default(sql`'{}'::text[]`),
    /** Order within a programme or event gallery. */
    sortOrder: integer().notNull().default(0),
    uploadedBy: uuid().references(() => admins.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index().on(t.programmeId),
    index().on(t.eventId),
    index().on(t.year),
    check('media_focal_range', sql`${t.focalX} between 0 and 1 and ${t.focalY} between 0 and 1`),
    // Consent is recorded with a timestamp. The public API never serves an
    // image where showsChildren is true and consentConfirmed is false.
    check(
      'media_consent_recorded',
      sql`not ${t.consentConfirmed} or ${t.consentConfirmedAt} is not null`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Site content
// ---------------------------------------------------------------------------

/** One row per settings group (see SiteSettings in @gtyf/shared). */
export const siteSettings = pgTable('site_settings', {
  key: text().primaryKey(),
  value: jsonb().notNull(),
  updatedBy: uuid().references(() => admins.id, { onDelete: 'set null' }),
  updatedAt: updatedAt(),
});

/** Home page sections: editable headings, visibility and order. */
export const homeSections = pgTable('home_sections', {
  key: text().primaryKey(),
  eyebrow: text().notNull().default(''),
  heading: text().notNull().default(''),
  underlineWord: text().notNull().default(''),
  body: text().notNull().default(''),
  /** Section-specific lists, e.g. the three trust steps. */
  items: jsonb().$type<{ title: string; body: string }[]>().notNull().default([]),
  isVisible: boolean().notNull().default(true),
  sortOrder: integer().notNull().default(0),
  updatedAt: updatedAt(),
});

export const heroSlides = pgTable('hero_slides', {
  id: id(),
  eyebrow: text().notNull(),
  headline: text().notNull(),
  underlineWord: text().notNull().default(''),
  subtext: text().notNull().default(''),
  imageId: uuid().references(() => media.id, { onDelete: 'set null' }),
  programmeId: uuid().references(() => programmes.id, { onDelete: 'set null' }),
  primaryLabel: text().notNull().default('Donate'),
  primaryHref: text().notNull().default('/donate'),
  secondaryLabel: text().notNull().default('Learn more'),
  secondaryHref: text().notNull().default('/about'),
  isActive: boolean().notNull().default(true),
  sortOrder: integer().notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const programmes = pgTable('programmes', {
  id: id(),
  slug: text().notNull().unique(),
  title: text().notNull(),
  shortTitle: text().notNull(),
  summary: text().notNull(),
  body: text().notNull(),
  heroImageId: uuid().references((): AnyPgColumn => media.id, { onDelete: 'set null' }),
  status: publishStatus().notNull().default('published'),
  sortOrder: integer().notNull().default(0),
  ...seoColumns(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** "How it works" rows on a programme page. */
export const programmeSections = pgTable(
  'programme_sections',
  {
    id: id(),
    programmeId: uuid()
      .notNull()
      .references(() => programmes.id, { onDelete: 'cascade' }),
    heading: text().notNull(),
    body: text().notNull(),
    imageId: uuid().references(() => media.id, { onDelete: 'set null' }),
    sortOrder: integer().notNull().default(0),
  },
  (t) => [index().on(t.programmeId)],
);

/**
 * Events. Upcoming vs past is derived from the dates (an event becomes "past"
 * the day after it ends), so nothing needs moving by hand after an outreach.
 */
export const events = pgTable(
  'events',
  {
    id: id(),
    slug: text().notNull().unique(),
    title: text().notNull(),
    programmeId: uuid().references(() => programmes.id, { onDelete: 'set null' }),
    dateStart: date().notNull(),
    dateEnd: date(),
    /** Local start time (Ghana is UTC+0 all year). Used for the countdown. */
    startTime: time(),
    venue: text().notNull(),
    participants: integer(),
    summary: text(),
    story: text(),
    closingNote: text(),
    heroImageId: uuid().references((): AnyPgColumn => media.id, { onDelete: 'set null' }),
    volunteersWanted: boolean().notNull().default(false),
    status: publishStatus().notNull().default('draft'),
    ...seoColumns(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index().on(t.dateStart),
    index().on(t.programmeId),
    check('events_date_order', sql`${t.dateEnd} is null or ${t.dateEnd} >= ${t.dateStart}`),
  ],
);

/** Bulleted lists on an event page: highlights and schools visited. */
export const eventHighlights = pgTable(
  'event_highlights',
  {
    id: id(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    kind: eventListKind().notNull().default('highlight'),
    text: text().notNull(),
    sortOrder: integer().notNull().default(0),
  },
  (t) => [index().on(t.eventId)],
);

export const newsPosts = pgTable(
  'news_posts',
  {
    id: id(),
    slug: text().notNull().unique(),
    title: text().notNull(),
    excerpt: text().notNull().default(''),
    /** TipTap document JSON (source of truth for editing). */
    bodyJson: jsonb(),
    /** Sanitised HTML rendered from bodyJson on save. */
    bodyHtml: text().notNull().default(''),
    coverImageId: uuid().references(() => media.id, { onDelete: 'set null' }),
    programmeId: uuid().references(() => programmes.id, { onDelete: 'set null' }),
    eventId: uuid().references(() => events.id, { onDelete: 'set null' }),
    authorId: uuid().references(() => admins.id, { onDelete: 'set null' }),
    status: publishStatus().notNull().default('draft'),
    publishedAt: timestamp({ withTimezone: true }),
    ...seoColumns(),
    ogImageId: uuid().references(() => media.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.status, t.publishedAt)],
);

export const teamMembers = pgTable('team_members', {
  id: id(),
  name: text().notNull(),
  role: text().notNull(),
  bio: text().notNull().default(''),
  photoId: uuid().references(() => media.id, { onDelete: 'set null' }),
  /** Leaders are always shown first, ahead of everyone else (then by sort order). */
  isLeader: boolean().notNull().default(false),
  /** Optional contact / profile links, shown as small icons when filled in. */
  email: text().notNull().default(''),
  linkedin: text().notNull().default(''),
  instagram: text().notNull().default(''),
  tiktok: text().notNull().default(''),
  isVisible: boolean().notNull().default(true),
  sortOrder: integer().notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const coreValues = pgTable('core_values', {
  id: id(),
  name: text().notNull(),
  description: text().notNull().default(''),
  /** True until GTYF confirms the wording. */
  descriptionIsDraft: boolean().notNull().default(true),
  sortOrder: integer().notNull().default(0),
});

export const impactStats = pgTable('impact_stats', {
  id: id(),
  key: text().notNull().unique(),
  value: integer().notNull(),
  prefix: text().notNull().default(''),
  suffix: text().notNull().default(''),
  label: text().notNull(),
  isYear: boolean().notNull().default(false),
  isVisible: boolean().notNull().default(true),
  sortOrder: integer().notNull().default(0),
  updatedAt: updatedAt(),
});

/** What a gift buys. Drives the live impact translation on the donation card. */
export const impactItems = pgTable(
  'impact_items',
  {
    id: id(),
    key: text().notNull().unique(),
    /** null = only used for "where it's needed most". */
    programmeId: uuid().references(() => programmes.id, { onDelete: 'set null' }),
    label: text().notNull(),
    singular: text().notNull(),
    plural: text().notNull(),
    unitPrice: integer().notNull(),
    icon: impactIcon().notNull(),
    needsConfirmation: boolean().notNull().default(true),
    isActive: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
    updatedAt: updatedAt(),
  },
  (t) => [check('impact_items_price_positive', sql`${t.unitPrice} > 0`)],
);

// ---------------------------------------------------------------------------
// Fundraising
// ---------------------------------------------------------------------------

export const campaigns = pgTable(
  'campaigns',
  {
    id: id(),
    slug: text().notNull().unique(),
    title: text().notNull(),
    summary: text().notNull().default(''),
    body: text().notNull().default(''),
    programmeId: uuid().references(() => programmes.id, { onDelete: 'set null' }),
    coverImageId: uuid().references(() => media.id, { onDelete: 'set null' }),
    targetAmount: integer().notNull(),
    /** Cached totals, updated only by the Paystack webhook. */
    raisedAmount: integer().notNull().default(0),
    donorCount: integer().notNull().default(0),
    startsAt: date(),
    deadline: date(),
    showSupporterWall: boolean().notNull().default(true),
    status: campaignStatus().notNull().default('draft'),
    ...seoColumns(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [check('campaigns_target_positive', sql`${t.targetAmount} > 0`)],
);

export const donors = pgTable('donors', {
  id: id(),
  email: text().notNull().unique(),
  fullName: text().notNull(),
  phone: text(),
  country: text(),
  city: text(),
  paystackCustomerCode: text().unique(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const donations = pgTable(
  'donations',
  {
    id: id(),
    /** GTYF-2026-XXXXXX. Also the Paystack transaction reference. */
    reference: text().notNull().unique(),
    /** Random secret in the thank-you URL; required to read the receipt. */
    receiptToken: text().notNull(),
    donorId: uuid()
      .notNull()
      .references(() => donors.id, { onDelete: 'restrict' }),
    /** Gift amount, fee covered by the donor, and what was charged. All pesewas. */
    amount: integer().notNull(),
    fee: integer().notNull().default(0),
    total: integer().notNull(),
    currency: text().notNull().default('GHS'),
    /** null programme = "where it's needed most". */
    programmeId: uuid().references(() => programmes.id, { onDelete: 'set null' }),
    campaignId: uuid().references(() => campaigns.id, { onDelete: 'set null' }),
    eventId: uuid().references(() => events.id, { onDelete: 'set null' }),
    frequency: donationFrequency().notNull(),
    status: donationStatus().notNull().default('pending'),
    coverFee: boolean().notNull().default(false),
    anonymous: boolean().notNull().default(false),
    showOnWall: boolean().notNull().default(false),
    wallName: text(),
    wallCity: text(),
    dedicationType: dedicationType(),
    dedicationName: text(),
    dedicationEmail: text(),
    dedicationNotifiedAt: timestamp({ withTimezone: true }),
    /** Impact line frozen at the time of giving, for the receipt. */
    impactSummary: text(),
    paystackAccessCode: text(),
    paystackTransactionId: bigint({ mode: 'number' }),
    paystackPlanCode: text(),
    paystackSubscriptionCode: text(),
    channel: text(), // mobile_money | card | bank
    /** Paystack's message when a charge fails, for the admin. */
    failureReason: text(),
    /** Internal notes from staff; never shown to the donor. */
    adminNotes: text(),
    /** Set when staff record a refund made in the Paystack dashboard. */
    refundedAt: timestamp({ withTimezone: true }),
    refundReason: text(),
    subscriptionId: uuid().references(() => subscriptions.id, { onDelete: 'set null' }),
    paidAt: timestamp({ withTimezone: true }),
    receiptSentAt: timestamp({ withTimezone: true }),
    adminAlertSentAt: timestamp({ withTimezone: true }),
    metadata: jsonb(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index().on(t.status, t.createdAt),
    index().on(t.donorId),
    index().on(t.programmeId),
    index().on(t.campaignId),
    check('donations_amounts', sql`${t.amount} > 0 and ${t.fee} >= 0 and ${t.total} = ${t.amount} + ${t.fee}`),
  ],
);

/** Cache of Paystack plan codes: one plan per amount + interval. */
export const paystackPlans = pgTable(
  'paystack_plans',
  {
    id: id(),
    planCode: text().notNull().unique(),
    name: text().notNull(),
    amount: integer().notNull(),
    currency: text().notNull().default('GHS'),
    interval: text().notNull().default('monthly'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.amount, t.currency, t.interval)],
);

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: id(),
    donorId: uuid()
      .notNull()
      .references(() => donors.id, { onDelete: 'restrict' }),
    subscriptionCode: text().notNull().unique(),
    emailToken: text(),
    /** Paystack page where the donor can update their card or cancel. */
    manageLinkSentAt: timestamp({ withTimezone: true }),
    welcomeSentAt: timestamp({ withTimezone: true }),
    planCode: text().notNull(),
    amount: integer().notNull(),
    currency: text().notNull().default('GHS'),
    programmeId: uuid().references(() => programmes.id, { onDelete: 'set null' }),
    campaignId: uuid().references(() => campaigns.id, { onDelete: 'set null' }),
    status: subscriptionStatus().notNull().default('active'),
    nextPaymentDate: timestamp({ withTimezone: true }),
    cancelledAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.status)],
);

/** Every Paystack webhook we accept. The unique key makes processing idempotent. */
export const webhookEvents = pgTable('webhook_events', {
  id: id(),
  provider: text().notNull().default('paystack'),
  eventKey: text().notNull().unique(),
  eventType: text().notNull(),
  payload: jsonb().notNull(),
  processedAt: timestamp({ withTimezone: true }),
  error: text(),
  receivedAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Inboxes
// ---------------------------------------------------------------------------

export const volunteers = pgTable('volunteers', {
  id: id(),
  fullName: text().notNull(),
  email: text().notNull(),
  phone: text(),
  location: text(),
  interests: text().array().notNull().default(sql`'{}'::text[]`),
  availability: text(),
  message: text(),
  eventId: uuid().references(() => events.id, { onDelete: 'set null' }),
  status: inboxStatus().notNull().default('new'),
  notes: text(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const partnerEnquiries = pgTable('partner_enquiries', {
  id: id(),
  organisation: text().notNull(),
  contactName: text().notNull(),
  email: text().notNull(),
  phone: text(),
  partnershipType: text(),
  message: text().notNull(),
  status: inboxStatus().notNull().default('new'),
  notes: text(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const contactMessages = pgTable('contact_messages', {
  id: id(),
  fullName: text().notNull(),
  email: text().notNull(),
  phone: text(),
  subject: text(),
  message: text().notNull(),
  status: inboxStatus().notNull().default('new'),
  notes: text(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: id(),
  email: text().notNull().unique(),
  name: text(),
  source: text(), // e.g. 'footer', 'upcoming-empty-state'
  unsubscribedAt: timestamp({ withTimezone: true }),
  createdAt: createdAt(),
});

/** Privacy-friendly analytics: a counter per path per day. No cookies, no IPs. */
export const pageViews = pgTable(
  'page_views',
  {
    path: text().notNull(),
    day: date().notNull(),
    count: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.path, t.day] })],
);

// ---------------------------------------------------------------------------
// Relations (for db.query.* with nested reads)
// ---------------------------------------------------------------------------

export const programmesRelations = relations(programmes, ({ one, many }) => ({
  heroImage: one(media, { fields: [programmes.heroImageId], references: [media.id] }),
  sections: many(programmeSections),
  events: many(events),
  impactItems: many(impactItems),
}));

export const programmeSectionsRelations = relations(programmeSections, ({ one }) => ({
  programme: one(programmes, { fields: [programmeSections.programmeId], references: [programmes.id] }),
  image: one(media, { fields: [programmeSections.imageId], references: [media.id] }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  programme: one(programmes, { fields: [events.programmeId], references: [programmes.id] }),
  heroImage: one(media, { fields: [events.heroImageId], references: [media.id] }),
  highlights: many(eventHighlights),
}));

export const eventHighlightsRelations = relations(eventHighlights, ({ one }) => ({
  event: one(events, { fields: [eventHighlights.eventId], references: [events.id] }),
}));

export const heroSlidesRelations = relations(heroSlides, ({ one }) => ({
  image: one(media, { fields: [heroSlides.imageId], references: [media.id] }),
  programme: one(programmes, { fields: [heroSlides.programmeId], references: [programmes.id] }),
}));

export const impactItemsRelations = relations(impactItems, ({ one }) => ({
  programme: one(programmes, { fields: [impactItems.programmeId], references: [programmes.id] }),
}));

export const newsPostsRelations = relations(newsPosts, ({ one }) => ({
  coverImage: one(media, { fields: [newsPosts.coverImageId], references: [media.id] }),
  programme: one(programmes, { fields: [newsPosts.programmeId], references: [programmes.id] }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  photo: one(media, { fields: [teamMembers.photoId], references: [media.id] }),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  programme: one(programmes, { fields: [campaigns.programmeId], references: [programmes.id] }),
  coverImage: one(media, { fields: [campaigns.coverImageId], references: [media.id] }),
  donations: many(donations),
}));

export const donorsRelations = relations(donors, ({ many }) => ({
  donations: many(donations),
  subscriptions: many(subscriptions),
}));

export const donationsRelations = relations(donations, ({ one }) => ({
  donor: one(donors, { fields: [donations.donorId], references: [donors.id] }),
  programme: one(programmes, { fields: [donations.programmeId], references: [programmes.id] }),
  campaign: one(campaigns, { fields: [donations.campaignId], references: [campaigns.id] }),
  event: one(events, { fields: [donations.eventId], references: [events.id] }),
  subscription: one(subscriptions, { fields: [donations.subscriptionId], references: [subscriptions.id] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  donor: one(donors, { fields: [subscriptions.donorId], references: [donors.id] }),
  programme: one(programmes, { fields: [subscriptions.programmeId], references: [programmes.id] }),
}));

export const mediaRelations = relations(media, ({ one }) => ({
  programme: one(programmes, { fields: [media.programmeId], references: [programmes.id] }),
  event: one(events, { fields: [media.eventId], references: [events.id] }),
}));
