import type { ReactNode } from 'react';
import { isTodo } from '@gtyf/shared';

/**
 * Renders an editable value, unless it is still a "TODO:" placeholder.
 * In development placeholders are shown in a dashed red box so they're easy
 * to spot; in production they render nothing (or `fallback`).
 */
export function Filled({ value, children, fallback = null }: { value: string; children?: (v: string) => ReactNode; fallback?: ReactNode }) {
  if (!value) return <>{fallback}</>;
  if (isTodo(value)) {
    return import.meta.env.DEV ? <span className="todo-placeholder">{value}</span> : <>{fallback}</>;
  }
  return <>{children ? children(value) : value}</>;
}

/** True when a value is real content that should be shown publicly. */
export const hasContent = (value: string | null | undefined): value is string => !!value && !isTodo(value);
