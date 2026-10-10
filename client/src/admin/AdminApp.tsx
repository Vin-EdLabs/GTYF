import { useEffect, useRef, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Head } from 'vite-react-ssg';
import { ROLE_LABELS } from '@gtyf/shared/admin';
import { SiteProvider } from '../lib/site';
import { AdminAuthProvider, adminApi, useAdminAuth } from './auth';
import { PwaProvider } from './pwa';
import { Spinner } from './ui';

/**
 * /admin: its own app shell (no public nav/footer), never indexed.
 * Desktop: sidebar. Phones: top bar + bottom tab bar within thumb reach.
 */
export default function AdminApp() {
  return (
    <SiteProvider initial={null}>
    <AdminAuthProvider>
      <Head>
        <title>Admin · Guide The Youth Foundation</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <PwaProvider>
        <Shell />
      </PwaProvider>
    </AdminAuthProvider>
    </SiteProvider>
  );
}

type Tab = { to: string; label: string; icon: JSX.Element; roles?: ('super_admin' | 'finance' | 'editor')[]; desktopOnly?: boolean; badge?: 'inbox' };

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const TABS: Tab[] = [
  { to: '/admin', label: 'Dashboard', icon: icon('M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z'), roles: ['finance'] },
  { to: '/admin/donations', label: 'Donations', icon: icon('M3 7h18v10H3zM3 11h18M7 15h3'), roles: ['finance'] },
  { to: '/admin/inbox', label: 'Inbox', icon: icon('M3 13h5l2 3h4l2-3h5M5 5h14l2 8v6H3v-6z'), roles: ['editor'], badge: 'inbox' },
  { to: '/admin/content', label: 'Website', icon: icon('M3 5h18v14H3zM3 9h18M7 13h6M7 16h4'), roles: ['editor'] },
  { to: '/admin/website-photos', label: 'Photos', icon: icon('M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z'), roles: ['editor'] },
  // On phones, Admins is reached from the Account page (bottom bar keeps 5 tabs).
  { to: '/admin/admins', label: 'Admins', icon: icon('M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 21a5 5 0 0 0-4-4.9'), roles: ['super_admin'], desktopOnly: true },
];

/** Count of new Inbox items, refreshed every minute, for the tab badge. */
function useInboxCount(enabled: boolean) {
  const [n, setN] = useState(0);
  const { pathname } = useLocation();
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = () => adminApi<{ newTotal: number }>('/inbox/summary').then((s) => !cancelled && setN(s.newTotal)).catch(() => undefined);
    void load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled, pathname]);
  return n;
}

function Badge({ n }: { n: number }) {
  if (!n) return null;
  return <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-lantern px-1.5 text-[0.6875rem] leading-5 font-bold text-ink">{n > 99 ? '99+' : n}</span>;
}

function Shell() {
  const { admin, loading, signOut } = useAdminAuth();
  const { pathname } = useLocation();
  const inboxCount = useInboxCount(!!admin && admin.role !== 'finance');
  const scroller = useRef<HTMLDivElement>(null);
  // A new page starts at the top (the window no longer scrolls, so do it here).
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [pathname]);

  if (loading) return <Spinner />;
  if (!admin && pathname !== '/admin/login') return <Navigate to={`/admin/login?next=${encodeURIComponent(pathname)}`} replace />;
  if (!admin) return <Outlet />;
  if (pathname === '/admin/login') return <Navigate to="/admin" replace />;

  const tabs = TABS.filter((t) => !t.roles || admin.role === 'super_admin' || t.roles.includes(admin.role));
  const phoneTabs = tabs.filter((t) => !t.desktopOnly);
  const tabClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'text-ink' : 'text-slate hover:text-ink');

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-mist text-ink lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden h-dvh flex-col border-r border-ink/[0.06] bg-white p-5 lg:flex">
        <Brand />
        <nav aria-label="Admin" className="mt-8 flex flex-col gap-1">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === '/admin'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-3 py-2.5 font-semibold transition-colors ${isActive ? 'bg-ink text-white' : 'text-slate hover:bg-ink/5 hover:text-ink'}`
              }
            >
              {t.icon}
              {t.label}
              {t.badge && <Badge n={inboxCount} />}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-mist p-4">
          <NavLink to="/admin/account" className="block truncate font-semibold hover:underline">
            {admin.name}
          </NavLink>
          <p className="truncate text-sm text-slate">{ROLE_LABELS[admin.role].label}</p>
          <div className="mt-3 flex gap-2">
            <a href="/" className="text-sm font-semibold text-slate hover:text-ink">
              View site
            </a>
            <span className="text-slate">·</span>
            <button type="button" onClick={signOut} className="text-sm font-semibold text-slate hover:text-ink">
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Phone top bar */}
      <header className="z-20 shrink-0 border-b border-ink/[0.06] bg-white pt-[env(safe-area-inset-top)] lg:hidden">
        <div className="flex h-16 items-center justify-between px-4">
        <Brand compact />
        <NavLink to="/admin/account" aria-label="Your account" className="grid size-10 place-items-center rounded-full bg-ink font-display text-sm font-bold text-white">
          {admin.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
        </NavLink>
        </div>
      </header>

      {/* The page scrolls inside this box, not the whole window, so the top bar and tab bar never move. */}
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-10 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">
          <Outlet />
        </main>
      </div>

      {/* Phone bottom tabs */}
      <nav aria-label="Admin" className="z-20 grid shrink-0 border-t border-ink/[0.08] bg-white pb-safe lg:hidden" style={{ gridTemplateColumns: `repeat(${phoneTabs.length}, 1fr)` }}>
        {phoneTabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.to === '/admin'} className={(s) => `relative flex flex-col items-center gap-0.5 pt-2.5 pb-1 text-xs font-semibold ${tabClass(s)}`}>
            {t.icon}
            {t.label}
            {t.badge && inboxCount > 0 && (
              <span className="absolute top-1.5 left-1/2 ml-2 grid min-w-5 place-items-center rounded-full bg-lantern px-1 text-[0.625rem] leading-5 font-bold text-ink">{inboxCount > 99 ? '99+' : inboxCount}</span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <a href="/admin" className="flex items-center gap-2.5">
      <img src="/brand/logo-mark.png" alt="" width={40} height={40} className="size-10 rounded-full ring-1 ring-ink/10" />
      <span className="leading-tight">
        <span className="block font-display font-bold">{compact ? 'GTYF Admin' : 'Guide The Youth'}</span>
        {!compact && <span className="block text-sm text-slate">Admin</span>}
      </span>
    </a>
  );
}
