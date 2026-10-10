import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { defaultSiteSettings, homeSections as defaultHomeSections, impactItems, programmes, selectionSteps } from '@gtyf/shared/content';
import type { DonationConfig } from '@gtyf/shared/donations';
import type { HomeSection, SiteResponse } from '@gtyf/shared/api';
import type { SiteSettings } from '@gtyf/shared/content';
import { fetchContent } from './content';

/**
 * Site-wide editable settings (contact details, nav labels, page copy) and the
 * home page's section order. Comes from the root route's loader, so it's in
 * the prerendered HTML; refreshed once in the browser to pick up admin edits.
 */
const FALLBACK: SiteResponse = {
  settings: defaultSiteSettings,
  homeSections: defaultHomeSections.map(
    (s, i): HomeSection => ({ ...s, items: s.key === 'selection' ? selectionSteps : [], isVisible: true, sortOrder: i }),
  ),
  defaultShareImage: null,
  // Offline fallback only: payments need the real public key from the API.
  donation: {
    publicKey: '',
    currency: 'GHS',
    feePercent: 1.95,
    min: 500,
    max: 5_000_000,
    impactItems: impactItems.map(({ programme, needsConfirmation: _n, ...i }) => ({ ...i, programmeSlug: programme })),
    causes: programmes.map(({ slug, title, shortTitle }) => ({ slug, title, shortTitle, heroImage: null })),
  },
};

const SiteContext = createContext<SiteResponse>(FALLBACK);

export function SiteProvider({ initial, children }: { initial: SiteResponse | null | undefined; children: ReactNode }) {
  // Layer over the fallback so a missing group (e.g. an older API) never crashes a page.
  const [site, setSite] = useState<SiteResponse>({ ...FALLBACK, ...initial });

  useEffect(() => {
    let cancelled = false;
    fetchContent<SiteResponse>('/site')
      .then((res) => res && !cancelled && setSite({ ...FALLBACK, ...res }))
      .catch(() => {
        /* Offline or API down: keep what we have. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <SiteContext.Provider value={site}>{children}</SiteContext.Provider>;
}

export const useSite = (): SiteSettings => useContext(SiteContext).settings;
export const useHomeSections = () => useContext(SiteContext).homeSections;
export const useHomeSection = (key: HomeSection['key']) =>
  useContext(SiteContext).homeSections.find((s) => s.key === key);
export const useDonationConfig = (): DonationConfig => useContext(SiteContext).donation;
export const useDefaultShareImage = () => useContext(SiteContext).defaultShareImage;
