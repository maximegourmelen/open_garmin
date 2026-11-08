import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
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
        'inline-flex items-center justify-center gap-2 rounded-control font-semibold transition duration-150 active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'min-h-9 px-3 text-sm' : 'min-h-11 px-4 text-sm',
        variant === 'primary' && 'bg-accent text-on-accent hover:bg-accent-strong',
        variant === 'secondary' &&
          'border border-border-strong bg-surface-2 text-text hover:bg-surface-3',
        variant === 'quiet' && 'text-text-2 hover:bg-surface-2 hover:text-text',
        variant === 'danger' && 'border border-danger text-danger hover:bg-danger/10',
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
      variant="quiet"
      size="sm"
      className={cn('size-10 p-0', className)}
      aria-label={label}
      {...props}
    >
      {children}
    </Button>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md border border-border-strong bg-surface-2 px-1.5 py-0.5 text-xs text-text-2">
      {children}
    </kbd>
  );
}
