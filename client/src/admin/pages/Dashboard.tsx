import { Link, Navigate } from 'react-router-dom';
import { formatCedis } from '@gtyf/shared';
import type { DashboardStats } from '@gtyf/shared/admin';
import { useAdminAuth, useAdminData } from '../auth';
import { IncomeByCause, IncomeByMonth } from '../charts';
import { InstallCard } from '../pwa';
import { Card, Notice, PageHeader, Spinner } from '../ui';
import { DonationList } from './Donations';

export default function Dashboard() {
  const { admin } = useAdminAuth();
  const canSeeMoney = admin?.role === 'super_admin' || admin?.role === 'finance';
  const { data, error, loading } = useAdminData<DashboardStats>(canSeeMoney ? '/dashboard' : null);
  const firstName = admin?.name.split(' ')[0];

  // Editors don't see money; they start on the Website hub.
  if (!canSeeMoney) return <Navigate to="/admin/content" replace />;
  if (loading && !data) return <Spinner />;
  if (error || !data) return <Notice kind="error">{error ?? 'Could not load the dashboard.'}</Notice>;

  const month = new Date().toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' });

  return (
    <>
      <InstallCard />
      <PageHeader title={`Hello, ${firstName}`} subtitle="Here’s how giving is going." />

      {/* Total income: the headline */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl bg-ink p-6 text-white lg:col-span-1">
          <p className="text-[0.9375rem] font-medium text-white/65">Total raised, all time</p>
          <p className="mt-2 font-display text-[2.75rem] leading-none font-extrabold tracking-display">{formatCedis(data.raised.allTime)}</p>
          <p className="mt-3 text-sm text-white/65">
            From {data.successfulGifts} gift{data.successfulGifts === 1 ? '' : 's'} by {data.donors} donor{data.donors === 1 ? '' : 's'}
            {data.feesCovered > 0 && <> · plus {formatCedis(data.feesCovered, { decimals: true })} in fees covered</>}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <Tile label={`This month (${month})`} value={formatCedis(data.raised.thisMonth)} />
          <Tile label="This year" value={formatCedis(data.raised.thisYear)} />
          <Tile label="Monthly donors" value={String(data.activeMonthlyDonors)} />
          <Tile label="Monthly giving" value={`${formatCedis(data.monthlyRecurringTotal)}`} sub="expected each month" />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <h2 className="font-display text-lg font-bold">Raised each month</h2>
          <div className="mt-4">
            <IncomeByMonth data={data.byMonth} />
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="mb-5 font-display text-lg font-bold">By cause</h2>
          <IncomeByCause data={data.byCause} />
        </Card>
      </div>

      <Card className="mt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Latest gifts</h2>
          <Link to="/admin/donations" className="text-[0.9375rem] font-semibold text-slate hover:text-ink">
            See all →
          </Link>
        </div>
        {data.latest.length ? <DonationList rows={data.latest} /> : <p className="py-6 text-slate">No gifts yet. They’ll appear here as soon as someone gives.</p>}
      </Card>
    </>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-ink/[0.05]">
      <p className="text-sm font-medium text-slate">{label}</p>
      <p className="mt-2 font-display text-[1.625rem] leading-tight font-bold tracking-display sm:text-[1.875rem]">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate">{sub}</p>}
    </div>
  );
}
