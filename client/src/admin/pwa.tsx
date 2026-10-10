import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface Pwa {
  /** Android / desktop Chrome can show its own install dialog. */
  canPrompt: boolean;
  /** iPhone / iPad: installed through Safari's Share menu. */
  isIos: boolean;
  installed: boolean;
  install: () => Promise<void>;
}

const Ctx = createContext<Pwa>({ canPrompt: false, isIos: false, installed: false, install: async () => undefined });
export const usePwa = () => useContext(Ctx);

const setMeta = (name: string, content: string) => {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
};

/**
 * Makes /admin an installable app: its own name and icon (separate from the public
 * website), a small service worker, and the install button logic.
 * Wrap the admin shell in it.
 */
export function PwaProvider({ children }: { children: ReactNode }) {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // The public site's manifest names the website; swap in the admin one while in /admin.
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const previous = link?.getAttribute('href') ?? null;
    link?.setAttribute('href', '/admin.webmanifest');
    const touch = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    const previousTouch = touch?.getAttribute('href') ?? null;
    touch?.setAttribute('href', '/brand/admin-apple-touch.png');
    setMeta('apple-mobile-web-app-capable', 'yes');
    setMeta('mobile-web-app-capable', 'yes');
    setMeta('apple-mobile-web-app-title', 'GTYF Admin');
    setMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');

    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone);

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/admin-sw.js', { scope: '/admin' }).catch(() => undefined);
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setEvent(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      if (previous) link?.setAttribute('href', previous);
      if (previousTouch) touch?.setAttribute('href', previousTouch);
    };
  }, []);

  const install = async () => {
    if (!event) return;
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    setEvent(null);
  };

  return <Ctx.Provider value={{ canPrompt: !!event, isIos, installed, install }}>{children}</Ctx.Provider>;
}

/** "Install the admin app" card. Shows only when installing is possible; remembers if dismissed. */
export function InstallCard({ dismissible = true }: { dismissible?: boolean }) {
  const { canPrompt, isIos, installed, install } = usePwa();
  const [hidden, setHidden] = useState(() => {
    try {
      return dismissible && localStorage.getItem('gtyf:install-dismissed') === '1';
    } catch {
      return false;
    }
  });
  if (installed || hidden || (!canPrompt && !isIos)) return null;
  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem('gtyf:install-dismissed', '1');
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="mb-5 flex items-center gap-4 rounded-3xl bg-ink p-4 text-white sm:p-5">
      <img src="/brand/admin-192.png" alt="" width={48} height={48} className="size-12 shrink-0 rounded-2xl" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Install the GTYF Admin app</p>
        <p className="text-sm text-white/65">
          {isIos ? (
            <>
              Tap <strong className="text-white">Share</strong> then <strong className="text-white">Add to Home Screen</strong>. It opens like an app and keeps you signed in.
            </>
          ) : (
            'Opens like an app from your home screen and keeps you signed in.'
          )}
        </p>
      </div>
      {canPrompt && (
        <button type="button" onClick={install} className="h-11 shrink-0 rounded-full bg-lantern px-5 font-bold text-ink">
          Install
        </button>
      )}
      {dismissible && (
        <button type="button" onClick={dismiss} aria-label="Hide" className="grid size-9 shrink-0 place-items-center rounded-full text-white/60 hover:bg-white/10">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
    </div>
  );
}
