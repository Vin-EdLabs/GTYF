import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatCedis } from '@gtyf/shared';
import type { AdminDonationDetail } from '@gtyf/shared/admin';
import type { FieldErrors } from '@gtyf/shared/forms';
import { Receipt } from '../../components/donate/Receipt';
import { ApiError } from '../../lib/api';
import { useSite } from '../../lib/site';
import { adminApi, useAdminData } from '../auth';
import { AdminButton, Card, Input, Notice, Spinner, StatusBadge, TextArea, formatDateTime } from '../ui';

const channelLabel = (c: string | null) =>
  c === 'mobile_money' ? 'Mobile Money' : c === 'card' ? 'Card' : c === 'bank' || c === 'bank_transfer' ? 'Bank' : c ? c : '—';

export default function DonationDetail() {
  const { id } = useParams();
  const { data: d, setData, error, loading } = useAdminData<AdminDonationDetail>(`/donations/${id}`);
  const { organisation } = useSite();
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [showRefund, setShowRefund] = useState(false);

  if (loading && !d) return <Spinner />;
  if (error || !d) return <Notice kind="error">{error ?? 'Donation not found.'}</Notice>;

  const act = async (fn: () => Promise<AdminDonationDetail>, success: string) => {
    setMessage(null);
    try {
      setData(await fn());
      setMessage({ kind: 'success', text: success });
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : 'Something went wrong.' });
    }
  };

  const canReceipt = d.status === 'success' || d.status === 'reversed';

  return (
    <>
      <Link to="/admin/donations" className="mb-4 inline-flex min-h-11 items-center gap-2 font-semibold text-slate hover:text-ink">
        ← All donations
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <StatusBadge status={d.status} />
            <span className="text-sm text-slate">{d.reference}</span>
          </div>
          <p className="mt-3 font-display text-[2.5rem] leading-none font-extrabold tracking-display">
            {formatCedis(d.amount, { decimals: true })}
            {d.frequency === 'monthly' && <span className="text-xl font-bold text-slate"> /month</span>}
          </p>
          <p className="mt-2 text-slate">
            {d.donorName} · {d.causeName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canReceipt && (
            <a href={`/api/admin/donations/${d.id}/receipt.pdf`} target="_blank" rel="noopener" className="inline-flex h-12 items-center rounded-full bg-white px-5 font-semibold ring-1 ring-ink/15 hover:ring-ink/40">
              Receipt PDF
            </a>
          )}
          {d.status === 'success' && (
            <AdminButton variant="secondary" onClick={() => act(() => adminApi(`/donations/${d.id}/resend-receipt`, { method: 'POST' }), `Receipt sent to ${d.donorEmail}.`)}>
              Resend receipt
            </AdminButton>
          )}
          {d.status === 'success' && (
            <AdminButton variant="danger" onClick={() => setShowRefund(true)}>
              Mark refunded
            </AdminButton>
          )}
        </div>
      </div>

      {message && (
        <div className="mb-4">
          <Notice kind={message.kind}>{message.text}</Notice>
        </div>
      )}
      {showRefund && (
        <RefundForm
          onCancel={() => setShowRefund(false)}
          onDone={(next) => {
            setShowRefund(false);
            setData(next);
            setMessage({ kind: 'success', text: 'Marked as refunded and removed from the totals.' });
          }}
          id={d.id}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <h2 className="font-display text-lg font-bold">Transaction</h2>
            <dl className="mt-3 divide-y divide-ink/[0.07]">
              <Row k="Gift" v={formatCedis(d.amount, { decimals: true })} />
              <Row k="Fees covered" v={d.fee ? formatCedis(d.fee, { decimals: true }) : 'No'} />
              <Row k="Total charged" v={formatCedis(d.total, { decimals: true })} />
              <Row k="Frequency" v={d.frequency === 'monthly' ? 'Monthly' : 'One-time'} />
              <Row k="Paid by" v={channelLabel(d.channel)} />
              <Row k="Started" v={formatDateTime(d.createdAt)} />
              <Row k="Paid" v={d.paidAt ? formatDateTime(d.paidAt) : '—'} />
              {d.campaignTitle && <Row k="Campaign" v={d.campaignTitle} />}
              {d.eventTitle && <Row k="Event" v={d.eventTitle} />}
              {d.dedication && <Row k={d.dedication.type === 'honour' ? 'In honour of' : 'In memory of'} v={d.dedication.name} />}
              <Row k="Anonymous" v={d.anonymous ? 'Yes' : 'No'} />
              <Row k="Receipt emailed" v={d.receiptSentAt ? formatDateTime(d.receiptSentAt) : 'Not yet'} />
              {d.paystackTransactionId && <Row k="Paystack ID" v={String(d.paystackTransactionId)} />}
              {d.subscriptionCode && <Row k="Subscription" v={d.subscriptionCode} />}
              {d.failureReason && <Row k="Problem" v={d.failureReason} />}
              {d.refundedAt && <Row k="Refunded" v={`${formatDateTime(d.refundedAt)} · ${d.refundReason ?? ''}`} />}
            </dl>
            <p className="mt-4 text-sm text-slate">Amounts and payment status come from Paystack and can’t be edited. To return money, refund it in the Paystack dashboard, then use “Mark refunded” here.</p>
          </Card>

          <EditForm d={d} onSaved={(next) => { setData(next); setMessage({ kind: 'success', text: 'Changes saved.' }); }} />
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-slate">The receipt the donor sees</p>
          {canReceipt ? <Receipt r={d.receipt} orgName={organisation.name} /> : <Card><p className="text-slate">No receipt: this gift wasn’t paid.</p></Card>}
        </div>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-[0.9375rem] text-slate">{k}</dt>
      <dd className="min-w-0 text-right text-[0.9375rem] font-semibold break-words">{v}</dd>
    </div>
  );
}

function EditForm({ d, onSaved }: { d: AdminDonationDetail; onSaved: (next: AdminDonationDetail) => void }) {
  const [donorName, setDonorName] = useState(d.donorName);
  const [donorEmail, setDonorEmail] = useState(d.donorEmail);
  const [adminNotes, setAdminNotes] = useState(d.adminNotes ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDonorName(d.donorName);
    setDonorEmail(d.donorEmail);
    setAdminNotes(d.adminNotes ?? '');
  }, [d]);

  const dirty = donorName !== d.donorName || donorEmail !== d.donorEmail || adminNotes !== (d.adminNotes ?? '');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setError(null);
    try {
      onSaved(await adminApi<AdminDonationDetail>(`/donations/${d.id}`, { method: 'PATCH', json: { donorName, donorEmail, adminNotes } }));
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setErrors(err.fieldErrors);
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 className="font-display text-lg font-bold">Donor details</h2>
      <form onSubmit={onSubmit} className="mt-4 space-y-4" noValidate>
        <Input label="Donor’s name" hint="Shown on their receipt." name="donorName" value={donorName} onChange={(e) => setDonorName(e.target.value)} errors={errors} />
        <Input label="Donor’s email" hint="Where receipts are sent." name="donorEmail" type="email" value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} errors={errors} />
        <div className="grid grid-cols-2 gap-3 text-[0.9375rem]">
          <p><span className="text-slate">Phone:</span> {d.donorPhone ?? '—'}</p>
          <p><span className="text-slate">Country:</span> {d.donorCountry ?? '—'}{d.donorCity ? `, ${d.donorCity}` : ''}</p>
        </div>
        <TextArea label="Staff notes" hint="Only admins can see these." name="adminNotes" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} errors={errors} />
        {error && <Notice kind="error">{error}</Notice>}
        <AdminButton type="submit" disabled={!dirty || busy} className="w-full sm:w-auto">
          {busy ? 'Saving…' : 'Save changes'}
        </AdminButton>
      </form>
    </Card>
  );
}

function RefundForm({ id, onCancel, onDone }: { id: string; onCancel: () => void; onDone: (d: AdminDonationDetail) => void }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Card className="mb-4 ring-2 ring-margin/30">
      <h2 className="font-display text-lg font-bold">Mark this gift as refunded?</h2>
      <p className="mt-1 text-slate">First refund the money in your Paystack dashboard. This records it here and takes it out of the totals.</p>
      <form
        className="mt-4 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            onDone(await adminApi<AdminDonationDetail>(`/donations/${id}/refund`, { method: 'POST', json: { reason } }));
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save.');
            setBusy(false);
          }
        }}
      >
        <Input label="Reason" name="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Donor gave twice by mistake" />
        {error && <Notice kind="error">{error}</Notice>}
        <div className="flex gap-2">
          <AdminButton type="submit" variant="danger" disabled={busy || reason.trim().length < 3}>
            {busy ? 'Saving…' : 'Mark refunded'}
          </AdminButton>
          <AdminButton variant="ghost" onClick={onCancel}>
            Cancel
          </AdminButton>
        </div>
      </form>
    </Card>
  );
}
