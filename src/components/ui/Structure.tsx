import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function Panel({
  children,
  title,
  action,
  className,
}: {
  children: ReactNode;
  title?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn('rounded-card border border-border bg-surface p-4 md:p-6', className)}
      aria-label={title}
    >
      {title && (
        <header className="mb-4 flex items-center justify-between gap-4">
          <h3 className="type-heading text-text">{title}</h3>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Section({
  heading,
  description,
  action,
  footnote,
  children,
  className,
}: {
  heading: string;
  description?: string;
  action?: ReactNode;
  footnote?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-4', className)} aria-label={heading}>
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="type-heading text-text">{heading}</h2>
          {description && <p className="mt-1 type-body text-text-2">{description}</p>}
        </div>
        {action}
      </header>
      {children}
      {footnote && <p className="type-caption text-text-3">{footnote}</p>}
    </section>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-md bg-surface-2 px-2 py-1 type-caption text-text-2">
      {children}
    </span>
  );
}

export function Banner({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div
      role="status"
      className="flex items-center justify-between gap-4 border-b border-border bg-surface-2 px-4 py-2 type-body text-text"
    >
      <span>{children}</span>
      {action}
    </div>
  );
}

export function Callout({ children, onDismiss }: { children: ReactNode; onDismiss?: () => void }) {
  return (
    <aside className="flex items-start justify-between gap-4 rounded-control bg-surface-2 p-4 type-body text-text-2">
      <span>{children}</span>
      {onDismiss && (
        <button
          type="button"
          className="shrink-0 text-text"
          onClick={onDismiss}
          aria-label="Dismiss hint"
        >
          Dismiss
        </button>
      )}
    </aside>
  );
}
