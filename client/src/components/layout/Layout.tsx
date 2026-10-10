import { Outlet, ScrollRestoration, matchPath, useLoaderData, useLocation } from 'react-router-dom';
import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';
import type { SiteResponse } from '@gtyf/shared/api';
import { SiteProvider, useHomeSections } from '../../lib/site';
import { Nav } from './Nav';
import { Footer } from './Footer';

/**
 * Pages that open with a full-bleed dark hero. The nav starts transparent
 * with white text over them. Matched by URL so prerendered HTML is correct.
 */
const OVERLAY_PATTERNS = ['/', '/programmes/:slug', '/events/:slug'];

function useNavOverlay() {
  const { pathname } = useLocation();
  const heroVisible = useHomeSections().find((s) => s.key === 'hero')?.isVisible ?? true;
  if (pathname === '/') return heroVisible; // staff can hide the hero; then the nav must be solid
  return OVERLAY_PATTERNS.some((pattern) => matchPath(pattern, pathname));
}

export function Layout() {
  const site = useLoaderData() as SiteResponse | null;
  return (
    <SiteProvider initial={site}>
      {/* domAnimation keeps Framer Motion's share of the bundle small. */}
      <LazyMotion features={domAnimation} strict>
        <MotionConfig reducedMotion="user">
          <Shell />
        </MotionConfig>
      </LazyMotion>
    </SiteProvider>
  );
}

function Shell() {
  const overlay = useNavOverlay();
  return (
    <>
      <a
        href="#main"
        className="sr-only z-[60] rounded-full bg-lantern px-5 py-3 font-semibold text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Nav overlay={overlay} />
      <main id="main" tabIndex={-1} className={`outline-none ${overlay ? '' : 'pt-16 md:pt-20'}`}>
        <Outlet />
      </main>
      <Footer />
      <ScrollRestoration />
    </>
  );
}
