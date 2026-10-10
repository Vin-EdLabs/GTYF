import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { PublicImage } from '@gtyf/shared/api';
import { Picture } from './ui/Picture';

/**
 * Full-screen photo viewer on a native <dialog>, which gives us the focus trap,
 * Esc to close and focus restore for free. Arrow keys and swipe move between photos.
 */
export function Lightbox({
  images,
  index,
  onChange,
  onClose,
}: {
  images: PublicImage[];
  index: number | null;
  onChange: (i: number) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const startX = useRef<number | null>(null);
  const open = index !== null;
  const count = images.length;

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const step = (dir: 1 | -1) => index !== null && onChange((index + dir + count) % count);

  const onPointerDown = (e: PointerEvent) => {
    startX.current = e.clientX;
  };
  const onPointerUp = (e: PointerEvent) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
  };

  const image = index !== null ? images[index] : undefined;

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') step(1);
        if (e.key === 'ArrowLeft') step(-1);
      }}
      aria-label="Photo viewer"
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-ink/97 p-0 text-white backdrop:bg-ink/80"
    >
      {image && (
        <div className="flex h-full flex-col" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
          <div className="flex items-center justify-between px-4 py-3 md:px-6">
            <p className="label text-white/60 tabular-nums" aria-live="polite">
              {index! + 1} / {count}
            </p>
            <button
              type="button"
              onClick={onClose}
              autoFocus
              className="grid size-11 place-items-center rounded-full text-white hover:bg-white/10"
            >
              <span className="sr-only">Close</span>
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <figure className="relative flex min-h-0 flex-1 flex-col px-4 pb-6 md:px-20">
            <div className="relative min-h-0 flex-1">
              <Picture key={image.id} image={image} sizes="100vw" fit="contain" priority />
            </div>
            {image.caption && <figcaption className="mx-auto mt-4 max-w-2xl text-center text-white/75">{image.caption}</figcaption>}
          </figure>
          {count > 1 && (
            <>
              <NavButton side="left" onClick={() => step(-1)} />
              <NavButton side="right" onClick={() => step(1)} />
            </>
          )}
        </div>
      )}
    </dialog>
  );
}

function NavButton({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute top-1/2 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white hover:text-ink md:grid ${
        side === 'left' ? 'left-5' : 'right-5'
      }`}
    >
      <span className="sr-only">{side === 'left' ? 'Previous photo' : 'Next photo'}</span>
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={side === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
      </svg>
    </button>
  );
}

/** Photo grid (masonry via CSS columns) that opens the lightbox. */
export function GalleryGrid({ images, columns = 'md:columns-3' }: { images: PublicImage[]; columns?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <ul className={`columns-2 gap-3 md:gap-4 ${columns}`}>
        {images.map((img, i) => (
          <li key={img.id} className="mb-3 break-inside-avoid md:mb-4">
            <button
              type="button"
              onClick={() => setOpen(i)}
              className="group relative block w-full overflow-hidden rounded-2xl bg-mist"
              style={{ aspectRatio: `${img.width} / ${img.height}` }}
            >
              <span className="sr-only">Open photo: {img.alt}</span>
              <span className="absolute inset-0 transition-transform duration-700 ease-guide group-hover:scale-[1.03]">
                <Picture image={img} sizes="(min-width: 768px) 33vw, 50vw" />
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Lightbox images={images} index={open} onChange={setOpen} onClose={() => setOpen(null)} />
    </>
  );
}
