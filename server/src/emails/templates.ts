/**
 * Branded HTML emails. Table layout + inline styles because email clients
 * (Gmail, Outlook, phone mail apps) ignore most modern CSS. Every template
 * also returns a plain-text version.
 */
import { formatCedis, formatDate } from '@gtyf/shared';
import type { Email } from '../lib/mailer';
import type { ReceiptWords } from '../lib/receiptText';

const INK = '#0B1422';
const LANTERN = '#F2A900';
const SLATE = '#5B6676';
const MIST = '#F3F5F8';
const RULING = 'rgba(61,111,214,0.18)';
const MARGIN = 'rgba(214,69,61,0.6)';
const FONT = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

interface Org {
  name: string;
  siteUrl: string;
  registrationNumber?: string;
}

function layout(org: Org, preheader: string, body: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(org.name)}</title></head>
<body style="margin:0;padding:0;background:${MIST};font-family:${FONT};color:${INK};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${MIST};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="padding:8px 4px 20px;">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="width:44px;"><img src="${org.siteUrl}/brand/logo-mark.png" width="44" height="44" alt="" style="display:block;border-radius:22px;border:1px solid #E6E9EF;background:#fff;"></td>
    <td style="padding-left:12px;font-weight:700;font-size:16px;letter-spacing:-0.01em;">${esc(org.name)}</td>
  </tr></table>
</td></tr>
${body}
<tr><td style="padding:24px 4px;font-size:12px;line-height:18px;color:${SLATE};">
  ${esc(org.name)}${org.registrationNumber ? ` · Reg. No. ${esc(org.registrationNumber)}` : ''}<br>
  Payments secured by Paystack. <a href="${org.siteUrl}" style="color:${SLATE};">${org.siteUrl.replace(/^https?:\/\//, '')}</a>
</td></tr>
</table></td></tr></table></body></html>`;
}

const button = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 4px;"><tr><td style="border-radius:999px;background:${LANTERN};">
  <a href="${href}" style="display:inline-block;padding:14px 26px;font-weight:700;font-size:15px;color:${INK};text-decoration:none;border-radius:999px;">${esc(label)}</a>
  </td></tr></table>`;

const card = (inner: string) =>
  `<tr><td style="background:#ffffff;border-radius:20px;padding:32px 28px;box-shadow:0 12px 32px -12px rgba(11,20,34,0.14);">${inner}</td></tr>`;

/** The exercise-book receipt: blue ruling, red margin line. */
function ruledReceipt(rows: [string, string][], impact: string | null) {
  const lines = rows
    .map(
      ([k, v]) => `<tr>
      <td style="width:44px;border-right:2px solid ${MARGIN};"></td>
      <td style="padding:0 0 0 16px;height:36px;border-bottom:1px solid ${RULING};font-family:Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${SLATE};">${esc(k)}</td>
      <td align="right" style="height:36px;padding:0 16px 0 8px;border-bottom:1px solid ${RULING};font-weight:600;font-size:15px;">${esc(v)}</td></tr>`,
    )
    .join('');
  const impactRow = impact
    ? `<tr><td style="width:44px;border-right:2px solid ${MARGIN};"></td><td colspan="2" style="padding:14px 16px 6px 16px;font-size:17px;line-height:26px;font-weight:700;border-bottom:1px solid ${RULING};">${esc(impact)}</td></tr>`
    : '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;background:#fff;border:1px solid #E6E9EF;border-radius:14px;overflow:hidden;">
  <tr><td style="width:44px;border-right:2px solid ${MARGIN};height:18px;"></td><td colspan="2"></td></tr>
  ${lines}${impactRow}
  <tr><td style="width:44px;border-right:2px solid ${MARGIN};height:18px;"></td><td colspan="2"></td></tr></table>`;
}

export interface ReceiptData {
  /** Editable wording (Admin → Website → Donation & thank-you text). */
  words: ReceiptWords;
  firstName: string;
  donorName: string;
  reference: string;
  paidAt: Date;
  causeName: string;
  amount: number;
  fee: number;
  total: number;
  monthly: boolean;
  impact: string | null;
  channel: string | null;
  dedication: { type: 'honour' | 'memory'; name: string } | null;
  receiptUrl: string;
  pdfUrl: string;
}

const channelLabel = (c: string | null) =>
  c === 'mobile_money' ? 'Mobile Money' : c === 'card' ? 'Card' : c === 'bank' || c === 'bank_transfer' ? 'Bank' : (c ?? 'Paystack');

export function receiptEmail(org: Org, to: string, d: ReceiptData): Email {
  const rows: [string, string][] = [
    ['Receipt', d.reference],
    ['Date', formatDate(d.paidAt.toISOString())],
    ['Cause', d.causeName],
    ['Gift', `${formatCedis(d.amount)}${d.monthly ? ' / month' : ''}`],
    ...(d.fee ? ([['Fee covered', formatCedis(d.fee)]] as [string, string][]) : []),
    ['Total paid', formatCedis(d.total)],
    ['Paid by', channelLabel(d.channel)],
  ];
  const dedication = d.dedication
    ? `<p style="margin:16px 0 0;font-size:15px;line-height:24px;color:${SLATE};">Given ${d.dedication.type === 'honour' ? 'in honour of' : 'in memory of'} <strong style="color:${INK}">${esc(d.dedication.name)}</strong>.</p>`
    : '';
  const html = layout(
    org,
    `Your gift of ${formatCedis(d.amount)} to ${org.name}. Receipt ${d.reference}.`,
    card(`<h1 style="margin:0;font-size:28px;line-height:34px;letter-spacing:-0.02em;">Thank you, ${esc(d.firstName)}.</h1>
    <p style="margin:12px 0 0;font-size:16px;line-height:26px;color:${SLATE};">${
      d.monthly ? 'Your monthly gift is set up. Here is the receipt for this month.' : 'Your gift has reached us. Here is your receipt.'
    }</p>
    <p style="margin:22px 0 0;font-size:13px;color:${SLATE};">${esc(d.words.receivedFrom)}</p>
    <p style="margin:2px 0 0;font-size:22px;font-weight:700;">${esc(d.donorName)}</p>
    <p style="margin:14px 0 0;font-size:13px;color:${SLATE};">${d.monthly ? 'Monthly gift' : 'Gift'}</p>
    <p style="margin:2px 0 0;font-size:40px;line-height:44px;font-weight:800;letter-spacing:-0.02em;">${formatCedis(d.amount, { decimals: true })}${
      d.monthly ? `<span style="font-size:18px;color:${SLATE}"> /month</span>` : ''
    }</p>
    ${ruledReceipt(rows, d.impact)}${dedication}
    <p style="margin:24px 0 0;font-size:16px;line-height:26px;">${esc(d.words.thankYou)}</p>
    <p style="margin:10px 0 0;font-size:16px;font-weight:700;">${esc(d.words.signOff)}</p>
    ${button(d.receiptUrl, 'See and share your impact')}
    <p style="margin:12px 0 0;font-size:13px;color:${SLATE};"><a href="${d.pdfUrl}" style="color:${INK};">Download receipt (PDF)</a></p>`),
  );
  const text = [
    `Thank you, ${d.firstName}.`,
    `${d.words.receivedFrom} ${d.donorName}.`,
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    d.impact ? `\n${d.impact}` : '',
    d.dedication ? `\nGiven ${d.dedication.type === 'honour' ? 'in honour of' : 'in memory of'} ${d.dedication.name}.` : '',
    `\nSee and share your impact: ${d.receiptUrl}`,
    `Receipt (PDF): ${d.pdfUrl}`,
    `\n${org.name}`,
  ].join('\n');
  return { to, subject: `Your receipt ${d.reference} · ${org.name}`, html, text };
}

export function monthlyWelcomeEmail(org: Org, to: string, d: { firstName: string; amount: number; causeName: string; impact: string | null }): Email {
  const html = layout(
    org,
    'Welcome to monthly giving.',
    card(`<h1 style="margin:0;font-size:28px;line-height:34px;letter-spacing:-0.02em;">Welcome, ${esc(d.firstName)}.</h1>
    <p style="margin:12px 0 0;font-size:16px;line-height:26px;color:${SLATE};">You now give <strong style="color:${INK}">${formatCedis(d.amount)} every month</strong> to ${esc(d.causeName)}. Monthly gifts let us plan each school term with confidence: we know the exercise books, uniforms and mentorship sessions are covered before we set out.</p>
    ${d.impact ? `<p style="margin:16px 0 0;font-size:17px;line-height:26px;font-weight:700;">${esc(d.impact)}</p>` : ''}
    <p style="margin:16px 0 0;font-size:15px;line-height:24px;color:${SLATE};">You'll get a receipt each month. You can change your card or stop at any time using the link in any receipt, or by replying to this email.</p>`),
  );
  const text = `Welcome, ${d.firstName}.\n\nYou now give ${formatCedis(d.amount)} every month to ${d.causeName}.\n${d.impact ?? ''}\n\nYou'll get a receipt each month. Reply to this email to change or stop your gift.\n\n${org.name}`;
  return { to, subject: `Welcome to monthly giving · ${org.name}`, html, text };
}

export function paymentFailedEmail(org: Org, to: string, d: { firstName: string; amount: number; manageUrl: string | null }): Email {
  const html = layout(
    org,
    'Your monthly gift did not go through.',
    card(`<h1 style="margin:0;font-size:26px;line-height:32px;letter-spacing:-0.02em;">Your monthly gift didn't go through.</h1>
    <p style="margin:12px 0 0;font-size:16px;line-height:26px;color:${SLATE};">Hi ${esc(d.firstName)}, we tried to collect your ${formatCedis(d.amount)} monthly gift but the payment was declined. This usually means the card has expired or been replaced.</p>
    ${d.manageUrl ? button(d.manageUrl, 'Update payment method') : `<p style="margin:16px 0 0;font-size:15px;color:${SLATE};">Reply to this email and we'll help you update it.</p>`}
    <p style="margin:12px 0 0;font-size:13px;color:${SLATE};">Nothing else needs doing. Thank you for standing with the children we serve.</p>`),
  );
  const text = `Hi ${d.firstName},\n\nWe tried to collect your ${formatCedis(d.amount)} monthly gift but the payment was declined.\n${d.manageUrl ? `Update your payment method: ${d.manageUrl}` : 'Reply to this email and we will help you update it.'}\n\n${org.name}`;
  return { to, subject: `Action needed: your monthly gift · ${org.name}`, html, text };
}

export function adminAlertEmail(
  org: Org,
  to: string,
  d: { reference: string; donorName: string; donorEmail: string; amount: number; total: number; monthly: boolean; causeName: string; channel: string | null; anonymous: boolean; adminUrl: string },
): Email {
  const rows: [string, string][] = [
    ['Reference', d.reference],
    ['Donor', `${d.donorName}${d.anonymous ? ' (anonymous)' : ''}`],
    ['Email', d.donorEmail],
    ['Cause', d.causeName],
    ['Gift', `${formatCedis(d.amount)}${d.monthly ? ' / month' : ''}`],
    ['Charged', formatCedis(d.total)],
    ['Channel', channelLabel(d.channel)],
  ];
  const html = layout(
    org,
    `New gift: ${formatCedis(d.amount)} from ${d.donorName}`,
    card(`<h1 style="margin:0;font-size:24px;line-height:30px;">New ${d.monthly ? 'monthly ' : ''}gift: ${formatCedis(d.amount)}</h1>${ruledReceipt(rows, null)}${button(d.adminUrl, 'Open in admin')}`),
  );
  return {
    to,
    subject: `New gift ${formatCedis(d.amount)}${d.monthly ? '/month' : ''} · ${d.causeName}`,
    html,
    text: rows.map(([k, v]) => `${k}: ${v}`).join('\n'),
  };
}

export function dedicationEmail(org: Org, to: string, d: { donorFirstName: string; type: 'honour' | 'memory'; name: string; causeName: string; siteUrl: string }): Email {
  const phrase = d.type === 'honour' ? 'in your honour' : `in memory of ${d.name}`;
  const html = layout(
    org,
    `${d.donorFirstName} made a gift ${phrase}.`,
    card(`<h1 style="margin:0;font-size:26px;line-height:32px;letter-spacing:-0.02em;">A gift ${esc(phrase)}.</h1>
    <p style="margin:12px 0 0;font-size:16px;line-height:26px;color:${SLATE};">${esc(d.donorFirstName)} has given to ${esc(d.causeName)} at ${esc(org.name)} ${esc(phrase)}. It will help needy school children in Wamfie, Ghana with the things they need to learn with confidence.</p>
    ${button(d.siteUrl, 'See our work')}`),
  );
  return {
    to,
    subject: `${d.donorFirstName} made a gift ${phrase}`,
    html,
    text: `${d.donorFirstName} has given to ${d.causeName} at ${org.name} ${phrase}.\n\n${d.siteUrl}`,
  };
}

// ---------------------------------------------------------------------------
// Get Involved / Contact form emails
// ---------------------------------------------------------------------------

export type FormKind = 'volunteer' | 'partner' | 'contact';
const KIND_LABEL: Record<FormKind, string> = { volunteer: 'volunteer', partner: 'partnership enquiry', contact: 'message' };

/** Tells the team a new form came in, with every answer and a button to the admin inbox. */
export function formAlertEmail(org: Org, to: string, d: { kind: FormKind; name: string; rows: [string, string][]; inboxUrl: string }): Email {
  const rows = d.rows.filter(([, v]) => v);
  const table = rows
    .map(
      ([k, v]) => `<tr><td style="padding:8px 12px 8px 0;vertical-align:top;font-size:13px;color:${SLATE};white-space:nowrap;">${esc(k)}</td><td style="padding:8px 0;font-size:15px;line-height:22px;">${esc(v).replace(/\n/g, '<br>')}</td></tr>`,
    )
    .join('');
  const html = layout(
    org,
    `New ${KIND_LABEL[d.kind]} from ${d.name}`,
    card(`<h1 style="margin:0;font-size:24px;line-height:30px;">New ${esc(KIND_LABEL[d.kind])} from ${esc(d.name)}</h1>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:16px;width:100%;">${table}</table>
    ${button(d.inboxUrl, 'Open in the admin inbox')}`),
  );
  return {
    to,
    subject: `New ${KIND_LABEL[d.kind]}: ${d.name}`,
    html,
    text: [`New ${KIND_LABEL[d.kind]} from ${d.name}`, '', ...rows.map(([k, v]) => `${k}: ${v}`), '', d.inboxUrl].join('\n'),
  };
}

/** Friendly confirmation to the person who filled in the form. */
export function formThanksEmail(org: Org, to: string, d: { kind: FormKind; firstName: string; phone?: string }): Email {
  const body =
    d.kind === 'volunteer'
      ? 'Thank you for offering your time. We’ve received your details and someone from our team will contact you soon about upcoming outreach and how you can help.'
      : d.kind === 'partner'
        ? 'Thank you for your interest in partnering with us. We’ve received your enquiry and will get back to you soon to talk about how we can work together.'
        : 'Thank you for getting in touch. We’ve received your message and will reply as soon as we can.';
  const html = layout(
    org,
    'We’ve received your message.',
    card(`<h1 style="margin:0;font-size:26px;line-height:32px;letter-spacing:-0.02em;">Thank you, ${esc(d.firstName)}.</h1>
    <p style="margin:12px 0 0;font-size:16px;line-height:26px;color:${SLATE};">${esc(body)}</p>
    ${button(org.siteUrl, 'Visit our website')}
    <p style="margin:16px 0 0;font-size:16px;font-weight:700;">The ${esc(org.name)} team</p>`),
  );
  return { to, subject: `We’ve received your ${KIND_LABEL[d.kind]} · ${org.name}`, html, text: `Thank you, ${d.firstName}.\n\n${body}\n\nThe ${org.name} team\n${org.siteUrl}` };
}
