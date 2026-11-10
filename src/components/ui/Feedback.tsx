import { ChevronDown, CircleHelp, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Button } from './Button';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded-control bg-surface-2 motion-safe:animate-[pulse_1.5s_ease-in-out_infinite]',
        className,
      )}
    />
  );
}

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-card border border-border bg-surface p-8 text-center text-text">
      <CircleHelp size={24} strokeWidth={1.5} className="text-text-2" aria-hidden="true" />
      <h2 className="mt-3 type-heading">{title}</h2>
      <p className="mt-1 max-w-md type-body text-text-2">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-card border border-border bg-surface p-8 text-center text-text"
    >
      <TriangleAlert size={24} strokeWidth={1.5} className="text-text-2" aria-hidden="true" />
      <h2 className="mt-3 type-heading">Couldn't load this section</h2>
      <details className="mt-1 max-w-md type-caption text-text-3">
        <summary>Technical details</summary>
        {message}
      </details>
      <Button className="mt-4" onClick={retry}>
        Try again
      </Button>
    </div>
  );
}

function initialOpen(key: string): boolean {
  try {
    return localStorage.getItem(`og_disclosure_${key}`) === 'open';
  } catch {
    return false;
  }
}

export function Disclosure({
  id,
  title = 'Show advanced metrics',
  children,
}: {
  id: string;
  title?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(() => initialOpen(id));
  const [mounted, setMounted] = useState(open);
  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) setMounted(true);
    try {
      localStorage.setItem(`og_disclosure_${id}`, next ? 'open' : 'closed');
    } catch {
      /* Storage can be unavailable. */
    }
  }
  return (
    <section>
      <button
        type="button"
        aria-expanded={open}
        onClick={toggle}
        className="flex items-center gap-2 type-body text-text-2 hover:text-text"
      >
        {title}
        <ChevronDown size={18} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {mounted && (
        <div hidden={!open} className="mt-4">
          {children}
        </div>
      )}
    </section>
  );
}
