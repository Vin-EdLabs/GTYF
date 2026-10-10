/**
 * npm run test:donations -w server   (API must be running; uses Paystack TEST keys)
 *
 * End-to-end check of the donation backend without a browser:
 *   initialize (real Paystack test API) → pending → signed charge.success webhook
 *   → success, receipt, PDF; replayed webhook ignored; bad signature rejected;
 *   wrong amount refused; monthly initialize creates a plan.
 * Payments are never completed on Paystack itself; the webhook is simulated
 * with a correctly signed payload, exactly as Paystack would send it.
 */
import crypto from 'node:crypto';

const API = process.env.API_URL ?? 'http://localhost:4000';
const secret = process.env.PAYSTACK_SECRET_KEY ?? '';
if (!secret.startsWith('sk_test_')) {
  console.error('Refusing to run: PAYSTACK_SECRET_KEY must be a TEST key (sk_test_…).');
  process.exit(1);
}

let failures = 0;
const check = (label: string, ok: boolean, detail?: unknown) => {
  console.log(`${ok ? '✓' : '✗'} ${label}${ok || detail === undefined ? '' : `  → ${JSON.stringify(detail)}`}`);
  if (!ok) failures++;
};

async function json(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, init);
  return { status: res.status, body: (await res.json().catch(() => null)) as any };
}

const post = (path: string, body: unknown) =>
  json(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

async function webhook(payload: unknown, sign = true) {
  const raw = JSON.stringify(payload);
  const sig = crypto.createHmac('sha512', sign ? secret : 'wrong-secret').update(raw).digest('hex');
  const res = await fetch(`${API}/api/paystack/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-paystack-signature': sig },
    body: raw,
  });
  return { status: res.status, body: (await res.json().catch(() => null)) as any };
}

const chargeSuccess = (reference: string, amount: number, id: number) => ({
  event: 'charge.success',
  data: {
    id,
    status: 'success',
    reference,
    amount,
    currency: 'GHS',
    channel: 'mobile_money',
    paid_at: new Date().toISOString(),
    gateway_response: 'Approved',
    customer: { email: 'test.donor@example.com', customer_code: 'CUS_smoketest' },
  },
});

const donor = {
  fullName: 'Test Donor',
  email: 'test.donor@example.com',
  country: 'Ghana',
  city: 'Kumasi',
  anonymous: false,
  showOnWall: true,
};

// 1. Config
const config = await json('/api/donations/config');
check('config lists causes and impact items', config.status === 200 && config.body.causes.length === 4 && config.body.impactItems.length > 0, config.body);

// 2. Validation
const bad = await post('/api/donations/initialize', { ...donor, cause: null, frequency: 'one_time', amount: 100, coverFee: false });
check('rejects gifts under GH₵ 5', bad.status === 400 && !!bad.body.details?.amount, bad.body);

// 3. One-time gift of GH₵ 200 to Uniforms, fee covered, dedicated
const init = await post('/api/donations/initialize', {
  ...donor,
  cause: 'uniforms-footwear',
  frequency: 'one_time',
  amount: 20000,
  coverFee: true,
  dedication: { type: 'honour', name: 'Auntie Efua', notifyEmail: 'efua@example.com' },
  // A client trying to set its own total is ignored.
  total: 1,
});
check('initialize returns an access code from Paystack', init.status === 201 && !!init.body?.accessCode, init.body);
check('fee recomputed on the server (GH₵ 3.98 on GH₵ 200)', init.body?.fee === 398 && init.body?.total === 20398, init.body);
const { reference, receiptToken, total } = init.body;

const pending = await json(`/api/donations/${reference}?t=${receiptToken}`);
check('unpaid donation reads as pending', pending.body?.status === 'pending', pending.body);

const noToken = await json(`/api/donations/${reference}?t=wrong`);
check('receipt hidden without the token', noToken.status === 404);

// 4. Webhook
const badSig = await webhook(chargeSuccess(reference, total, 910001), false);
check('webhook with a bad signature is rejected', badSig.status === 401);

const hook = await webhook(chargeSuccess(reference, total, 910001));
check('signed charge.success accepted', hook.status === 200, hook.body);

const paid = await json(`/api/donations/${reference}?t=${receiptToken}`);
check('donation now success', paid.body?.status === 'success', paid.body);
check('impact frozen on receipt', paid.body?.impactSummary === 'GH₵ 200 = 1 full school uniform + 1 pair of shoes', paid.body?.impactSummary);

const replay = await webhook(chargeSuccess(reference, total, 910001));
check('replayed webhook ignored', replay.status === 200 && replay.body?.duplicate === true, replay.body);

// 5. PDF
const pdf = await fetch(`${API}/api/donations/${reference}/receipt.pdf?t=${receiptToken}`);
const bytes = Buffer.from(await pdf.arrayBuffer());
check('PDF receipt downloads', pdf.status === 200 && bytes.subarray(0, 4).toString() === '%PDF' && bytes.length > 1500, { status: pdf.status, size: bytes.length });

// 6. Amount mismatch is refused
const init2 = await post('/api/donations/initialize', { ...donor, cause: null, frequency: 'one_time', amount: 5000, coverFee: false });
await webhook(chargeSuccess(init2.body.reference, 100, 910002));
const mismatch = await json(`/api/donations/${init2.body.reference}?t=${init2.body.receiptToken}`);
check('charge for the wrong amount is not accepted', mismatch.body?.status === 'failed', mismatch.body);

// 7. Monthly
const monthly = await post('/api/donations/initialize', { ...donor, cause: 'learning-materials', frequency: 'monthly', amount: 10000, coverFee: false });
check('monthly initialize creates a plan and returns an access code', monthly.status === 201 && !!monthly.body?.accessCode, monthly.body);

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll donation checks passed.');
process.exit(failures ? 1 : 0);
