import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function Pill({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'success' | 'warning';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        tone === 'neutral' && 'bg-surface-3 text-text-2',
        tone === 'accent' && 'bg-accent-soft text-accent',
        tone === 'success' && 'bg-success/15 text-success',
        tone === 'warning' && 'bg-warning/15 text-warning',
        className,
      )}
    >
      {children}
    </span>
  );
}

export const Badge = Pill;

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'A';
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-bold text-accent',
        size === 'sm' ? 'size-8 text-xs' : 'size-10 text-sm',
      )}
      aria-label={name}
    >
      {initials}
    </span>
  );
}
