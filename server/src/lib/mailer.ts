/**
 * Email sending. Uses SMTP when configured; otherwise (development) each email
 * is written to MAIL_OUTBOX_DIR as an .html file so it can be opened and checked.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../env';

export interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

let transporter: Transporter | null = null;
if (env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
}

export async function sendEmail(email: Email): Promise<void> {
  if (transporter) {
    await transporter.sendMail({ from: env.SMTP_FROM, ...email });
    return;
  }
  const dir = path.resolve(env.MAIL_OUTBOX_DIR);
  await fs.mkdir(dir, { recursive: true });
  const slug = email.subject.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
  const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}-${slug}.html`);
  await fs.writeFile(file, `<!-- To: ${email.to} | Subject: ${email.subject} -->\n${email.html}`);
  console.log(`[mail] (no SMTP) "${email.subject}" to ${email.to} → ${path.relative(process.cwd(), file)}`);
}

/** Send, but never let an email failure break a payment flow. Returns whether it was sent. */
export async function trySendEmail(email: Email): Promise<boolean> {
  try {
    await sendEmail(email);
    return true;
  } catch (err) {
    console.error('[mail] failed:', email.subject, err);
    return false;
  }
}
