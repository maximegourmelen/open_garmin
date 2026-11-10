import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'quiet' | 'danger';
  size?: 'sm' | 'md';
  children: ReactNode;
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...props
}: Props) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-control text-sm font-medium transition-opacity duration-120 hover:opacity-85 active:opacity-85 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3' : 'h-9 px-4',
        variant === 'primary' && 'bg-primary text-on-primary',
        variant === 'secondary' &&
          'border border-border-strong bg-surface text-text hover:bg-surface-2',
        (variant === 'ghost' || variant === 'quiet') &&
          'text-text-2 hover:bg-surface-2 hover:text-text',
        variant === 'danger' && 'border border-negative text-negative hover:bg-surface-2',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconButton({
  label,
  children,
  className,
  ...props
}: Omit<Props, 'children'> & { label: string; children: ReactNode }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('size-8 p-0', className)}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </Button>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md border border-border-strong bg-surface-2 px-1.5 py-0.5 type-caption text-text-2">
      {children}
    </kbd>
  );
}
