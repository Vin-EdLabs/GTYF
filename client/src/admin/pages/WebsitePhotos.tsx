import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { AdminMedia } from '@gtyf/shared/admin-content';
import { adminApi, useAdminData } from '../auth';
import { MediaPicker, rememberMedia, useMedia } from '../content/kit';
import { Card, Notice, PageHeader, Spinner } from '../ui';

interface Slot {
  key: string;
  label: string;
  sublabel?: string;
  mediaId: string | null;
  aspect: 'wide' | 'landscape' | 'portrait' | 'square';
  editHref?: string;
}
interface Group {
  title: string;
  help: string;
  slots: Slot[];
}

const ASPECT: Record<Slot['aspect'], string> = {
  wide: 'aspect-[16/9]',
  landscape: 'aspect-[4/3]',
  portrait: 'aspect-[4/5]',
  square: 'aspect-square',
};

/**
 * Every place a photo appears on the website, shown in its real shape.
 * Tap an empty box to add a photo; tap a photo to change it.
 */
export default function WebsitePhotos() {
  const { data, setData, loading } = useAdminData<Group[]>('/content/photo-slots');
  const [picking, setPicking] = useState<Slot | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  if (loading && !data) return <Spinner />;
  const empty = data?.reduce((n, g) => n + g.slots.filter((s) => !s.mediaId).length, 0) ?? 0;

  const setSlot = async (slot: Slot, media: AdminMedia | null) => {
    await adminApi('/content/photo-slots', { method: 'PUT', json: { key: slot.key, mediaId: media?.id ?? null } });
    if (media) rememberMedia(media);
    setData((groups) => groups?.map((g) => ({ ...g, slots: g.slots.map((s) => (s.key === slot.key ? { ...s, mediaId: media?.id ?? null } : s)) })) ?? null);
    setFlash(media ? `Photo added to “${slot.sublabel ?? slot.label}”. It’s live on the website.` : 'Photo removed.');
  };

  return (
    <>
      <PageHeader
        title="Website photos"
        subtitle={empty ? `${empty} spot${empty === 1 ? '' : 's'} still need a photo. Tap a box to add one.` : 'Every photo spot on the site has a photo. Tap one to change it.'}
        actions={
          <Link to="/admin/photos" className="inline-flex h-12 items-center rounded-full bg-white px-5 font-semibold ring-1 ring-ink/15">
            All photos (library)
          </Link>
        }
      />
      {flash && (
        <div className="mb-4">
          <Notice kind="success">{flash}</Notice>
        </div>
      )}
      <div className="space-y-6">
        {data?.map((g) => (
          <Card key={g.title}>
            <h2 className="font-display text-lg font-bold">{g.title}</h2>
            <p className="mt-0.5 text-sm text-slate">{g.help}</p>
            <ul className={`mt-4 grid gap-3 ${g.slots[0]?.aspect === 'portrait' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
              {g.slots.map((slot) => (
                <li key={slot.key}>
                  <SlotBox slot={slot} onPick={() => setPicking(slot)} onRemove={() => setSlot(slot, null)} />
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <MediaPicker
        open={!!picking}
        onClose={() => setPicking(null)}
        onPick={async (m) => {
          const slot = picking!;
          setPicking(null);
          await setSlot(slot, m);
        }}
      />
    </>
  );
}

function SlotBox({ slot, onPick, onRemove }: { slot: Slot; onPick: () => void; onRemove: () => void }) {
  const m = useMedia(slot.mediaId);
  return (
    <div>
      <button
        type="button"
        onClick={onPick}
        className={`group relative block w-full overflow-hidden rounded-2xl ${ASPECT[slot.aspect]} ${m ? 'bg-mist' : 'border-2 border-dashed border-ink/20 bg-mist/60 hover:border-ink/50 hover:bg-mist'}`}
        aria-label={m ? `Change photo: ${slot.label}` : `Add photo: ${slot.label}`}
      >
        {m ? (
          <>
            <img src={m.thumb} alt="" className="size-full object-cover" style={{ objectPosition: `${m.focalX * 100}% ${m.focalY * 100}%` }} />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent p-3 text-left text-sm font-semibold text-white opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
              Tap to change
            </span>
            {m.hiddenReason && <span className="absolute top-2 left-2 rounded-full bg-[#FFF4D6] px-2 py-0.5 text-xs font-bold text-[#7A4F00]">Hidden: {m.hiddenReason.toLowerCase()}</span>}
          </>
        ) : (
          <span className="absolute inset-0 grid place-items-center text-slate">
            <span className="flex flex-col items-center gap-1">
              <span className="grid size-12 place-items-center rounded-full bg-white text-2xl leading-none text-ink shadow-soft">+</span>
              <span className="text-sm font-semibold">Tap to add a photo</span>
            </span>
          </span>
        )}
      </button>
      <div className="mt-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{slot.label}</p>
          {slot.sublabel && <p className="truncate text-sm text-slate">{slot.sublabel}</p>}
        </div>
        <div className="flex shrink-0 gap-3 text-sm font-semibold">
          {slot.editHref && (
            <Link to={slot.editHref} className="text-slate hover:text-ink">
              Edit text
            </Link>
          )}
          {m && (
            <button type="button" onClick={onRemove} className="text-slate hover:text-margin">
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
