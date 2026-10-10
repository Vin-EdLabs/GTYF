/**
 * Admin authentication.
 *
 * - Passwords are bcrypt-hashed (cost 12); never stored or logged in plain text.
 * - A signed JWT sits in an httpOnly, SameSite=Strict cookie, so page scripts
 *   can't read it and other sites can't send it.
 * - Every request re-reads the admin from the database, so deactivating an
 *   admin or changing their role takes effect immediately.
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import type { AdminRole } from '@gtyf/shared';
import { db } from '../db/client';
import { activityLog, admins } from '../db/schema';
import { env } from '../env';
import { HttpError } from './http';

export const SESSION_COOKIE = 'gtyf_admin';
/** Stay signed in for 60 days; every visit after the first day starts a fresh 60 days (sliding), so an admin who uses the app never gets signed out. */
const SESSION_DAYS = 60;
const RENEW_AFTER_MS = 24 * 3600 * 1000;

export type AdminRow = typeof admins.$inferSelect;

declare module 'express-serve-static-core' {
  interface Request {
    admin?: AdminRow;
  }
}

export const hashPassword = (plain: string) => bcrypt.hash(plain, 12);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

/** Constant-time-ish failure path: compare against a dummy hash when the email is unknown. */
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 12);
/**
 * Per-account lockout. Passwords may be as short as 5 characters, so besides
 * the per-visitor rate limit, an account is locked for 15 minutes after 10
 * wrong passwords in a row, from ANY number of computers. That makes guessing
 * impractical even for attackers spreading attempts across many addresses.
 */
const MAX_FAILURES = 10;
const LOCK_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; lockedUntil: number }>();

export class AccountLockedError extends Error {
  constructor(public minutes: number) {
    super(`Too many wrong passwords for this account. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`);
  }
}

export async function checkCredentials(email: string, password: string): Promise<AdminRow | null> {
  const record = failures.get(email);
  if (record && record.lockedUntil > Date.now()) {
    throw new AccountLockedError(Math.ceil((record.lockedUntil - Date.now()) / 60000));
  }
  const [admin] = await db.select().from(admins).where(eq(admins.email, email));
  const ok = await verifyPassword(password, admin?.passwordHash ?? DUMMY_HASH);
  if (admin && ok && admin.isActive) {
    failures.delete(email);
    return admin;
  }
  const count = (record && record.lockedUntil <= Date.now() && record.count >= MAX_FAILURES ? 0 : (record?.count ?? 0)) + 1;
  failures.set(email, { count, lockedUntil: count >= MAX_FAILURES ? Date.now() + LOCK_MS : 0 });
  if (count >= MAX_FAILURES) console.warn(`[auth] ${email} locked for 15 minutes after ${count} failed sign-ins`);
  return null;
}

export function startSession(res: Response, admin: AdminRow) {
  // Including a slice of the password hash means changing the password signs out other sessions.
  const token = jwt.sign({ sub: admin.id, pv: admin.passwordHash.slice(-10) }, env.JWT_SECRET, { expiresIn: `${SESSION_DAYS}d` });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api',
    maxAge: SESSION_DAYS * 24 * 3600 * 1000,
  });
}

export function endSession(res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: '/api', sameSite: 'strict', secure: env.NODE_ENV === 'production', httpOnly: true });
}

/** Push the sign-in forward when the cookie is more than a day old. */
function renewSession(req: Request, res: Response, admin: AdminRow) {
  const token = req.cookies?.[SESSION_COOKIE];
  const payload = typeof token === 'string' ? (jwt.decode(token) as { iat?: number } | null) : null;
  if (payload?.iat && Date.now() - payload.iat * 1000 > RENEW_AFTER_MS) startSession(res, admin);
}

export async function loadAdmin(req: Request): Promise<AdminRow | null> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== 'string') return null;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; pv: string };
    const [admin] = await db.select().from(admins).where(eq(admins.id, payload.sub));
    if (!admin || !admin.isActive || admin.passwordHash.slice(-10) !== payload.pv) return null;
    return admin;
  } catch {
    return null;
  }
}

/** Require a signed-in admin, optionally with one of the given roles (super admins always pass). */
export function requireAdmin(...roles: AdminRole[]): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const admin = await loadAdmin(req);
    if (!admin) return next(new HttpError(401, 'Please sign in.'));
    if (roles.length && admin.role !== 'super_admin' && !roles.includes(admin.role)) {
      return next(new HttpError(403, 'Your role doesn’t allow this. Ask a super admin.'));
    }
    renewSession(req, res, admin);
    req.admin = admin;
    next();
  };
}

/** "Who changed what and when." */
export async function logActivity(
  admin: AdminRow | undefined,
  action: string,
  entityType: string,
  entityId: string | null,
  summary: string,
  changes?: unknown,
) {
  await db.insert(activityLog).values({ adminId: admin?.id ?? null, action, entityType, entityId, summary, changes: changes ?? null });
}

export const publicAdmin = (a: AdminRow) => ({
  id: a.id,
  name: a.name,
  email: a.email,
  role: a.role,
  isActive: a.isActive,
  lastLoginAt: a.lastLoginAt?.toISOString() ?? null,
  createdAt: a.createdAt.toISOString(),
});
