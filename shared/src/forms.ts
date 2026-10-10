/**
 * Form schemas, validated in the browser for instant feedback and again on
 * the server (never trust the client). Every form also carries a hidden
 * `website` honeypot field, checked separately.
 */
import { z } from 'zod';

const name = z.string().trim().min(2, 'Please enter your name.').max(120);
const email = z
  .email('Please enter a valid email address.')
  .max(254)
  .transform((e) => e.trim().toLowerCase());
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));
const phone = z
  .string()
  .trim()
  .max(30)
  .regex(/^[+\d\s()-]*$/, 'Please use digits, spaces and + only.')
  .optional()
  .transform((v) => (v ? v : undefined));
const message = (min: number) =>
  z.string().trim().min(min, `Please write at least ${min} characters.`).max(4000);

export const VOLUNTEER_INTERESTS = [
  'Outreach days',
  'Mentoring young people',
  'Teaching support',
  'Photography and media',
  'Fundraising',
  'Logistics and transport',
] as const;

export const volunteerSchema = z.object({
  fullName: name,
  email,
  phone,
  location: optionalText(120),
  interests: z.array(z.enum(VOLUNTEER_INTERESTS)).max(VOLUNTEER_INTERESTS.length).default([]),
  availability: optionalText(300),
  message: optionalText(4000),
  /** Slug of the event they want to help with, if they came from one. */
  eventSlug: optionalText(160),
});
export type VolunteerInput = z.input<typeof volunteerSchema>;

export const PARTNERSHIP_TYPES = [
  'Business or corporate',
  'School',
  'Church or faith group',
  'NGO or foundation',
  'Individual',
  'Other',
] as const;

export const partnerSchema = z.object({
  organisation: z.string().trim().min(2, 'Please enter your organisation.').max(160),
  contactName: name,
  email,
  phone,
  partnershipType: z.enum(PARTNERSHIP_TYPES, 'Please choose one.'),
  message: message(10),
});
export type PartnerInput = z.input<typeof partnerSchema>;

export const contactSchema = z.object({
  fullName: name,
  email,
  phone,
  subject: optionalText(160),
  message: message(10),
});
export type ContactInput = z.input<typeof contactSchema>;

export const newsletterSchema = z.object({
  email,
  name: optionalText(120),
  source: optionalText(60),
});

export type FieldErrors = Record<string, string[] | undefined>;
