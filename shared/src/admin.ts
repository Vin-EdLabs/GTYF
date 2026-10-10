/**
 * Admin panel: shared types and validation (used by the admin UI and the API).
 */
import { z } from 'zod';
import { ADMIN_ROLES, type AdminRole, type DonationFrequency, type DonationStatus } from './index';
import type { DonationReceipt } from './donations';

export const ROLE_LABELS: Record<AdminRole, { label: string; help: string }> = {
  super_admin: { label: 'Super admin', help: 'Everything, including managing other admins.' },
  finance: { label: 'Finance', help: 'Donations, receipts, refunds and exports.' },
  editor: { label: 'Editor', help: 'Website content (programmes, events, news, photos).' },
};

/**
 * Minimum 5 characters, at GTYF's request. Short passwords are protected by
 * login rate limiting per visitor AND a per-account lockout after repeated
 * wrong attempts (server/src/lib/auth.ts).
 */
export const PASSWORD_MIN = 5;
const password = z.string().min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`).max(200);

export const loginSchema = z.object({
  email: z.email('Enter your email address.').transform((e) => e.trim().toLowerCase()),
  password: z.string().min(1, 'Enter your password.').max(200),
});

export const createAdminSchema = z.object({
  name: z.string().trim().min(2, 'Enter their name.').max(120),
  email: z.email('Enter a valid email address.').transform((e) => e.trim().toLowerCase()),
  password,
  role: z.enum(ADMIN_ROLES),
});

export const updateAdminSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  role: z.enum(ADMIN_ROLES).optional(),
  isActive: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({ password });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password.'),
  newPassword: password,
});

/** What staff may change on a donation. Amounts and paid status come from Paystack and are never editable. */
export const updateDonationSchema = z.object({
  donorName: z.string().trim().min(2, 'Enter the donor’s name.').max(120).optional(),
  donorEmail: z
    .email('Enter a valid email address.')
    .transform((e) => e.trim().toLowerCase())
    .optional(),
  adminNotes: z.string().trim().max(4000).optional(),
});

export const refundSchema = z.object({
  reason: z.string().trim().min(3, 'Say briefly why it was refunded.').max(500),
});

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AdminDonationRow {
  id: string;
  reference: string;
  donorName: string;
  donorEmail: string;
  amount: number;
  fee: number;
  total: number;
  frequency: DonationFrequency;
  status: DonationStatus;
  causeName: string;
  channel: string | null;
  anonymous: boolean;
  createdAt: string;
  paidAt: string | null;
}

export interface AdminDonationList {
  rows: AdminDonationRow[];
  page: number;
  pageSize: number;
  totalRows: number;
  /** Sum of successful gifts matching the filters (pesewas). */
  raisedInFilter: number;
}

export interface AdminDonationDetail extends AdminDonationRow {
  donorPhone: string | null;
  donorCountry: string | null;
  donorCity: string | null;
  campaignTitle: string | null;
  eventTitle: string | null;
  dedication: { type: 'honour' | 'memory'; name: string; email: string | null } | null;
  showOnWall: boolean;
  impactSummary: string | null;
  failureReason: string | null;
  adminNotes: string | null;
  refundedAt: string | null;
  refundReason: string | null;
  receiptSentAt: string | null;
  paystackTransactionId: number | null;
  subscriptionCode: string | null;
  /** Same shape the donor sees, so the admin can preview the exact receipt. */
  receipt: DonationReceipt;
}

export interface DashboardStats {
  raised: { allTime: number; thisYear: number; thisMonth: number };
  feesCovered: number;
  successfulGifts: number;
  donors: number;
  activeMonthlyDonors: number;
  monthlyRecurringTotal: number;
  byMonth: { month: string; amount: number; gifts: number }[];
  byCause: { cause: string; amount: number; gifts: number }[];
  latest: AdminDonationRow[];
}

export interface ActivityEntry {
  id: string;
  adminName: string | null;
  action: string;
  summary: string;
  createdAt: string;
}
