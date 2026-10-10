import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { m, useReducedMotion } from 'framer-motion';
import { useSite } from '../../lib/site';
import { EASE } from '../../lib/motion';
import { ButtonLink } from '../ui/Button';
import { Logo } from './Logo';

/** Full-screen menu for phones and tablets, with large type. */
export function MobileMenu({ onClose }: { onClose: () => void }) {
  const { navigation, footer } = useSite();
  const panel = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    closeBtn.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      // Keep keyboard focus inside the open menu.
      if (e.key === 'Tab' && panel.current) {
        const items = panel.current.querySelectorAll<HTMLElement>('a[href], button');
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // Main links first, then the rest of the site (gallery, team...) so phones can reach everything.
  const links = [
    ...navigation.links,
    ...footer.exploreLinks.filter((l) => !navigation.links.some((n) => n.href === l.href)),
  ];

  return (
    <m.div
      ref={panel}
      id="mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="fixed inset-0 z-50 flex flex-col bg-paper lg:hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      <div className="container-page flex h-16 shrink-0 items-center justify-between md:h-20">
        <Logo onClick={onClose} />
        <button
          ref={closeBtn}
          type="button"
          onClick={onClose}
          className="grid size-10 place-items-center rounded-full text-ink hover:bg-ink/5"
        >
          <span className="sr-only">Close menu</span>
          <svg
            viewBox="0 0 24 24"
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <nav aria-label="Mobile" className="container-page flex flex-1 flex-col overflow-y-auto pt-4 pb-8">
        <ul className="flex flex-col">
          {links.map((link, i) => (
            <m.li
              key={link.href}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.05 + i * 0.04 }}
            >
              <NavLink
                to={link.href}
                onClick={onClose}
                className={({ isActive }) =>
                  `block py-1.5 font-display text-[2.25rem] leading-tight font-bold tracking-display transition-colors sm:text-[2.75rem] ${
                    isActive ? 'text-ink' : 'text-ink/40 hover:text-ink'
                  }`
                }
              >
                {link.label}
              </NavLink>
            </m.li>
          ))}
        </ul>
        <div className="mt-auto pt-8">
          <ButtonLink to="/donate" size="lg" className="w-full" onClick={onClose}>
            {navigation.donateLabel}
          </ButtonLink>
        </div>
      </nav>
    </m.div>
  );
}
