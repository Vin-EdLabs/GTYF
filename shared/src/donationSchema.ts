/**
 * Validation for POST /api/donations/initialize. Kept apart from donations.ts
 * so the donation card can show live impact without shipping zod on first load;
 * the card loads this file only when the donor reaches the details step.
 */
import { z } from 'zod';
import { DONATION_LIMITS } from './donations';

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const donationInitSchema = z
  .object({
    /** Programme slug, or null for "where it's needed most". */
    cause: z.string().trim().max(80).nullable(),
    eventSlug: optionalTrimmed(160),
    campaignSlug: optionalTrimmed(160),
    frequency: z.enum(['monthly', 'one_time']),
    amount: z.number().int('Amount must be whole pesewas.').min(DONATION_LIMITS.min, 'The minimum gift is GH₵ 5.'),
    coverFee: z.boolean().default(false),
    fullName: z.string().trim().min(2, 'Please enter your name.').max(120),
    email: z
      .email('Please enter a valid email address for your receipt.')
      .max(254)
      .transform((e) => e.trim().toLowerCase()),
    phone: z
      .string()
      .trim()
      .max(30)
      .regex(/^[+\d\s()-]*$/, 'Please use digits, spaces and + only.')
      .optional()
      .transform((v) => (v ? v : undefined)),
    country: z.string().trim().min(2).max(60).default('Ghana'),
    city: optionalTrimmed(80),
    anonymous: z.boolean().default(false),
    showOnWall: z.boolean().default(false),
    dedication: z
      .object({
        type: z.enum(['honour', 'memory']),
        name: z.string().trim().min(2, 'Who is this gift for?').max(120),
        notifyEmail: z
          .union([z.email('Please enter a valid email or leave it blank.'), z.literal('')])
          .optional()
          .transform((v) => (v ? v.toLowerCase() : undefined)),
      })
      .nullable()
      .default(null),
  })
  .refine((d) => !(d.anonymous && d.showOnWall), { message: 'An anonymous gift can’t appear on the supporter wall.', path: ['showOnWall'] });

export type DonationInitInput = z.input<typeof donationInitSchema>;

