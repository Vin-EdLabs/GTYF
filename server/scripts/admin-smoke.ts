/**
 * npm run test:admin -w server   (API running; uses SEED_ADMIN_* from .env and Paystack TEST keys)
 *
 * Checks the admin API end to end: sign-in, wrong password, role limits,
 * creating another admin, dashboard totals, transactions list/detail/edit,
 * refund, CSV export and sign-out. Creates a paid test gift via a signed webhook.
 */
import crypto from 'node:crypto';

const API = process.env.API_URL ?? 'http://localhost:4000';
const email = process.env.SEED_ADMIN_EMAIL ?? '';
const password = process.env.SEED_ADMIN_PASSWORD ?? '';
const secret = process.env.PAYSTACK_SECRET_KEY ?? '';
if (!email || !password || !secret.startsWith('sk_test_')) {
  console.error('Needs SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD and a TEST Paystack key in .env');
  process.exit(1);
}

let failures = 0;
const check = (label: string, ok: boolean, detail?: unknown) => {
  console.log(`${ok ? '✓' : '✗'} ${label}${ok || detail === undefined ? '' : `  → ${JSON.stringify(detail).slice(0, 300)}`}`);
  if (!ok) failures++;
};

/** Tiny cookie-keeping client, one per "browser". */
function client() {
  let cookie = '';
  return async (path: string, init: RequestInit & { json?: unknown } = {}) => {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: { ...(init.json ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      body: init.json ? JSON.stringify(init.json) : init.body,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0]!;
    const type = res.headers.get('content-type') ?? '';
    return { status: res.status, body: (type.includes('json') ? await res.json() : await res.text()) as any };
  };
}

// A paid test gift to look at.
const init = (await (
  await fetch(`${API}/api/donations/initialize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cause: 'learning-materials', frequency: 'one_time', amount: 15000, coverFee: false, fullName: 'Kofi Test Boateng', email: 'kofi.test@example.com', country: 'Ghana', anonymous: false, showOnWall: false, dedication: null }),
  })
).json()) as { reference: string; total: number };
const payload = JSON.stringify({ event: 'charge.success', data: { id: Date.now(), status: 'success', reference: init.reference, amount: init.total, currency: 'GHS', channel: 'card', paid_at: new Date().toISOString(), customer: { email: 'kofi.test@example.com', customer_code: 'CUS_admin_smoke' } } });
await fetch(`${API}/api/paystack/webhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-paystack-signature': crypto.createHmac('sha512', secret).update(payload).digest('hex') },
  body: payload,
});

const anon = client();
check('admin API refuses visitors who are not signed in', (await anon('/api/admin/dashboard')).status === 401);
check('wrong password is refused', (await anon('/api/admin/auth/login', { method: 'POST', json: { email, password: 'wrong-password-1' } })).status === 401);

const boss = client();
const login = await boss('/api/admin/auth/login', { method: 'POST', json: { email, password } });
check('super admin signs in', login.status === 200 && login.body.admin?.role === 'super_admin', login.body);
check('session reads back', (await boss('/api/admin/auth/me')).body.admin?.email === email);

const dash = await boss('/api/admin/dashboard');
check('dashboard shows total income', dash.status === 200 && dash.body.raised.allTime >= 15000 && dash.body.byMonth.length === 12, dash.body.raised);

const list = await boss(`/api/admin/donations?q=${encodeURIComponent(init.reference)}`);
const row = list.body.rows?.[0];
check('transaction appears in the list, searchable by receipt number', row?.reference === init.reference && row.status === 'success', list.body);

const detail = await boss(`/api/admin/donations/${row.id}`);
check('transaction detail includes the receipt', detail.body.receipt?.donorName === 'Kofi Test Boateng', detail.body.receipt);

const edit = await boss(`/api/admin/donations/${row.id}`, { method: 'PATCH', json: { donorName: 'Kofi Boateng', adminNotes: 'Name corrected at donor’s request.' } });
check('donor name and notes can be edited', edit.body.donorName === 'Kofi Boateng' && edit.body.adminNotes?.includes('corrected'), edit.body);
const noAmount = await boss(`/api/admin/donations/${row.id}`, { method: 'PATCH', json: { amount: 1 } });
check('amount cannot be changed', noAmount.status === 200 && noAmount.body.amount === 15000, noAmount.body.amount);

const pdf = await fetch(`${API}/api/admin/donations/${row.id}/receipt.pdf`, { headers: { Cookie: '' } });
check('receipt PDF needs sign-in', pdf.status === 401);

const csv = await boss('/api/admin/donations/export.csv');
check('CSV export works', typeof csv.body === 'string' && csv.body.includes(init.reference), String(csv.body).slice(0, 200));

// Another admin (finance)
const newEmail = `finance.${Date.now()}@example.com`;
const created = await boss('/api/admin/admins', { method: 'POST', json: { name: 'Esi Finance', email: newEmail, password: 'FinanceTest123', role: 'finance' } });
check('super admin creates another admin', created.status === 201 && created.body.role === 'finance', created.body);
const weak = await boss('/api/admin/admins', { method: 'POST', json: { name: 'Weak', email: `weak.${Date.now()}@example.com`, password: 'abcd', role: 'editor' } });
check('passwords under 5 characters are refused', weak.status === 400);

// 5-letter passwords are allowed, protected by a per-account lockout.
const fiveEmail = `five.${Date.now()}@example.com`;
const five = await boss('/api/admin/admins', { method: 'POST', json: { name: 'Five Letters', email: fiveEmail, password: 'kwame', role: 'editor' } });
check('a 5-letter password is accepted', five.status === 201, five.body);
const guesser = client();
let lastStatus = 0;
for (let i = 0; i < 10; i++) lastStatus = (await guesser('/api/admin/auth/login', { method: 'POST', json: { email: fiveEmail, password: `wrong${i}` } })).status;
const afterLock = await guesser('/api/admin/auth/login', { method: 'POST', json: { email: fiveEmail, password: 'kwame' } });
check('account locks after 10 wrong passwords (even the right one is refused for 15 min)', lastStatus === 401 && afterLock.status === 429 && /this account/.test(afterLock.body?.error ?? ''), { lastStatus, afterLock: afterLock.status, msg: afterLock.body?.error });
await boss(`/api/admin/admins/${five.body.id}`, { method: 'PATCH', json: { isActive: false } });

const esi = client();
check('new admin can sign in', (await esi('/api/admin/auth/login', { method: 'POST', json: { email: newEmail, password: 'FinanceTest123' } })).status === 200);
check('finance admin sees donations', (await esi('/api/admin/donations')).status === 200);
check('finance admin cannot manage admins', (await esi('/api/admin/admins')).status === 403);

const refund = await esi(`/api/admin/donations/${row.id}/refund`, { method: 'POST', json: { reason: 'Test refund from admin smoke test' } });
check('finance admin can record a refund', refund.body.status === 'reversed', refund.body.status);

await boss(`/api/admin/admins/${created.body.id}`, { method: 'PATCH', json: { isActive: false } });
check('deactivated admin is signed out immediately', (await esi('/api/admin/donations')).status === 401);

const activity = await boss('/api/admin/activity');
check('activity log records who did what', activity.body.some((a: { summary: string }) => a.summary.includes('refunded')), activity.body.slice(0, 3));

await boss('/api/admin/auth/logout', { method: 'POST' });
check('sign out works', (await boss('/api/admin/auth/me')).status === 401);

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll admin checks passed.');
process.exit(failures ? 1 : 0);
