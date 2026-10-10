import { useState, type CSSProperties } from 'react';
import type { PublicImage } from '@gtyf/shared/api';
import { ImpactIcon, type IconName } from '../icons/ImpactIcon';

interface Props {
  image: PublicImage | null | undefined;
  /** Responsive `sizes`, e.g. "(min-width: 768px) 50vw, 100vw". */
  sizes: string;
  /** Hero / above-the-fold image: load eagerly with high priority (the LCP element). */
  priority?: boolean;
  className?: string;
  /** Shown when there's no publishable photo yet. */
  placeholderIcon?: IconName;
  placeholderTone?: 'dark' | 'light';
  /** Object-fit; defaults to cover. */
  fit?: 'cover' | 'contain';
  style?: CSSProperties;
}

/**
 * Responsive photo: AVIF then WebP at 640/1280/2048, lazy-loaded behind a blur
 * placeholder, cropped around the admin-set focal point so faces stay in frame
 * on every screen. Fills its (relatively positioned) parent.
 */
export function Picture({
  image,
  sizes,
  priority,
  className = '',
  placeholderIcon = 'lantern',
  placeholderTone = 'dark',
  fit = 'cover',
  style,
}: Props) {
  const [loaded, setLoaded] = useState(false);

  if (!image) return <PhotoPlaceholder icon={placeholderIcon} tone={placeholderTone} className={className} />;

  return (
    <picture className={`absolute inset-0 block ${className}`}>
      {image.srcSetAvif && <source type="image/avif" srcSet={image.srcSetAvif} sizes={sizes} />}
      {image.srcSetWebp && <source type="image/webp" srcSet={image.srcSetWebp} sizes={sizes} />}
      <img
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        // React 18 doesn't know fetchPriority yet; pass it as a lowercase attribute.
        {...{ fetchpriority: priority ? 'high' : 'auto' }}
        onLoad={() => setLoaded(true)}
        className={`size-full transition-opacity duration-700 ease-guide ${fit === 'cover' ? 'object-cover' : 'object-contain'} ${
          loaded || priority ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ objectPosition: `${image.focalX * 100}% ${image.focalY * 100}%`, ...style }}
      />
      {image.blurDataUrl && !loaded && !priority && (
        <span
          aria-hidden="true"
          className="absolute inset-0 -z-10 scale-110 bg-cover blur-xl"
          style={{ backgroundImage: `url(${image.blurDataUrl})`, backgroundPosition: `${image.focalX * 100}% ${image.focalY * 100}%` }}
        />
      )}
    </picture>
  );
}

/**
 * Stands in for photography until GTYF uploads real, consented photos.
 * A calm lantern glow and the programme's line illustration. Never stock photos of children.
 */
export function PhotoPlaceholder({
  icon = 'lantern',
  tone = 'dark',
  className = '',
}: {
  icon?: IconName;
  tone?: 'dark' | 'light';
  className?: string;
}) {
  const dark = tone === 'dark';
  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 grid place-items-center overflow-hidden ${dark ? 'bg-ink text-white/25' : 'bg-mist text-ink/20'} ${className}`}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(55% 45% at 70% 35%, rgb(242 169 0 / ${dark ? 0.2 : 0.16}), transparent 70%)`,
        }}
      />
      <ImpactIcon name={icon} className="relative size-[min(28%,9rem)]" />
      {import.meta.env.DEV && (
        <span className={`label absolute bottom-4 left-4 ${dark ? 'text-white/40' : 'text-ink/40'}`}>Photo to upload</span>
      )}
    </div>
  );
}
