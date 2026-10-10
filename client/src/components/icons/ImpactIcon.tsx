import type { ImpactIcon as IconKey } from '@gtyf/shared';

/**
 * Line illustrations, drawn on a 48px grid with a 1.5px stroke. Used on the
 * donation card, programme cards and photo placeholders.
 */
export type IconName = IconKey | 'lantern' | 'voices';

const PATHS: Record<IconName, JSX.Element> = {
  book: (
    <>
      <rect x="10" y="6" width="28" height="36" rx="2.5" />
      <path d="M16.5 6v36" stroke="var(--color-margin)" />
      <path d="M21 15h12M21 21h12M21 27h12M21 33h8" stroke="var(--color-ruling)" />
    </>
  ),
  pen: (
    <>
      <path d="M31.5 8.5l8 8L18 38l-9.5 1.5L10 30z" />
      <path d="M27.5 12.5l8 8M10 30l8 8" />
    </>
  ),
  uniform: (
    <>
      <path d="M18 8l-10 5 3.5 8.5 5-2V41h15V19.5l5 2L40 13 30 8c-1.2 3.2-3.4 5-6 5s-4.8-1.8-6-5z" />
      <path d="M24 13v28" />
    </>
  ),
  shoe: (
    <>
      <path d="M6 33.5c0-6 1.3-14 3.4-16.5h7.6c1.5 4.5 5.4 6.8 10.6 7.8l10.4 2.2c3.2.7 4.9 2.8 4.9 5.6V35H6z" />
      <path d="M6 35h36.9M19.5 20.5l2-2M23 22.8l2-2M26.8 24.2l1.6-1.8" />
    </>
  ),
  mentor: (
    <>
      <circle cx="17" cy="15" r="5" />
      <circle cx="32.5" cy="18.5" r="4" />
      <path d="M7.5 39c0-6.4 4.3-11.5 9.5-11.5s9.5 5.1 9.5 11.5M27 39c0-5 2.5-8.8 5.5-8.8S38 34 38 39" />
    </>
  ),
  voices: (
    <>
      <path d="M9 18h7l10-7v26l-10-7H9z" />
      <path d="M31 17.5c1.8 1.8 2.8 4 2.8 6.5s-1 4.7-2.8 6.5M35.5 13c3 3 4.7 6.8 4.7 11s-1.7 8-4.7 11" />
    </>
  ),
  lantern: (
    <>
      <path d="M20 7h8M24 7v4" />
      <path d="M18 11h12l2.5 4.5v17L30 37H18l-2.5-4.5v-17z" />
      <path d="M24 19.5c-2.4 3-2.4 6.2 0 8.5 2.4-2.3 2.4-5.5 0-8.5z" fill="var(--color-lantern)" stroke="var(--color-lantern)" />
      <path d="M19 41h10" />
    </>
  ),
};

export function ImpactIcon({ name, className = 'size-10' }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}

/** The illustration that stands for each programme. */
export const PROGRAMME_ICON: Record<string, IconName> = {
  'learning-materials': 'book',
  'uniforms-footwear': 'uniform',
  'life-after-school': 'mentor',
  'the-youth-must-know': 'voices',
};

export const programmeIcon = (slug: string | null | undefined): IconName =>
  (slug && PROGRAMME_ICON[slug]) || 'lantern';
