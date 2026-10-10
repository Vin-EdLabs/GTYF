import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useSite } from '../../lib/site';
import { ButtonLink } from '../ui/Button';
import { Logo } from './Logo';
import { MobileMenu } from './MobileMenu';

/**
 * Fixed top navigation. On pages that open with a full-bleed dark hero
 * (`overlay`), it starts transparent with white text, then turns solid white
 * with a blur once the visitor scrolls.
 */
export function Nav({ overlay }: { overlay: boolean }) {
  const { navigation } = useSite();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  const solid = scrolled || !overlay;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-500 ease-guide ${
          solid ? 'bg-white/80 shadow-[0_1px_0_rgb(11_20_34/0.06)] backdrop-blur-xl backdrop-saturate-150' : 'bg-transparent'
        }`}
      >
        <nav
          aria-label="Main"
          className="container-page grid h-16 grid-cols-[1fr_auto] items-center gap-6 md:h-20 lg:grid-cols-[1fr_auto_1fr]"
        >
          <div className="justify-self-start">
            <Logo tone={solid ? 'dark' : 'light'} />
          </div>

          <ul className="hidden items-center gap-1 lg:flex">
            {navigation.links.map((link) => (
              <li key={link.href}>
                <NavLink
                  to={link.href}
                  className={({ isActive }) =>
                    `relative block rounded-full px-4 py-2 text-[0.9375rem] font-medium transition-colors duration-300 ${
                      solid
                        ? isActive
                          ? 'text-ink'
                          : 'text-ink/65 hover:text-ink'
                        : isActive
                          ? 'text-white'
                          : 'text-white/80 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {link.label}
                      {isActive && (
                        <span aria-hidden="true" className="absolute inset-x-4 -bottom-0.5 h-0.5 rounded-full bg-lantern" />
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 justify-self-end">
            <ButtonLink to="/donate" className="h-10 px-5 md:h-11">
              {navigation.donateLabel}
            </ButtonLink>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              className={`grid size-10 place-items-center rounded-full transition-colors lg:hidden ${
                solid ? 'text-ink hover:bg-ink/5' : 'text-white hover:bg-white/10'
              }`}
            >
              <span className="sr-only">Open menu</span>
              <svg
                viewBox="0 0 24 24"
                className="size-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M4 8h16M4 16h16" />
              </svg>
            </button>
          </div>
        </nav>
      </header>

      <AnimatePresence>{menuOpen && <MobileMenu onClose={() => setMenuOpen(false)} />}</AnimatePresence>
    </>
  );
}
