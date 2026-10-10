/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public origin, e.g. https://guidetheyouth.org (no trailing slash). Used for canonical and OG URLs. */
  readonly VITE_SITE_URL?: string;
}
