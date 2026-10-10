import type { ComponentProps, ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'secondary-light';
type Size = 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap select-none ' +
  'transition-[background-color,color,border-color,transform,box-shadow] duration-300 ease-guide active:scale-[0.97] ' +
  'disabled:pointer-events-none disabled:opacity-50';

const variants: Record<Variant, string> = {
  primary: 'bg-lantern text-ink hover:bg-[#ffb81f] shadow-[0_6px_20px_-8px_rgb(242_169_0/0.7)]',
  secondary: 'border-[1.5px] border-ink/20 text-ink hover:border-ink hover:bg-ink hover:text-white',
  'secondary-light': 'border-[1.5px] border-white/40 text-white hover:border-white hover:bg-white hover:text-ink',
};

const sizes: Record<Size, string> = {
  md: 'h-11 px-5 text-[0.9375rem]',
  lg: 'h-14 px-7 text-base',
};

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', extra = '') =>
  `${base} ${variants[variant]} ${sizes[size]} ${extra}`;

interface Common {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
}

/** A button that navigates. Internal paths use the router; anything else is a plain link. */
export function ButtonLink({ to, variant, size, className, children, ...rest }: Common & { to: string } & Omit<ComponentProps<'a'>, 'href'>) {
  const cls = buttonClass(variant, size, className);
  if (to.startsWith('/') && !to.startsWith('//')) {
    return (
      <Link to={to} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a href={to} className={cls} {...rest}>
      {children}
    </a>
  );
}

export function Button({ variant, size, className, children, type = 'button', ...rest }: Common & ComponentProps<'button'>) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}
