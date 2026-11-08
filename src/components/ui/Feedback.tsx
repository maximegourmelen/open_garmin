import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Button } from './Button';
import { Pip } from '../companion/Pip';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('animate-pulse rounded-tile bg-surface-3', className)} />
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
    <div className="flex flex-col items-center rounded-card border border-dashed border-border-strong bg-surface p-8 text-center text-text">
      <Pip pose="thinking" size={72} />
      <h2 className="mt-3 text-lg font-semibold">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-text-2">{text}</p>
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
      <Pip pose="oops" size={72} />
      <h2 className="mt-3 text-lg font-semibold">Something went wrong loading this</h2>
      <p className="mt-1 max-w-md text-sm text-text-2">{message}</p>
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
  title = 'Go deeper',
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
    <section className="rounded-card border border-border bg-surface">
      <button
        type="button"
        aria-expanded={open}
        onClick={toggle}
        className="flex w-full items-center justify-between p-4 text-left font-semibold text-text"
      >
        {title}
        <ChevronDown size={18} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {mounted && (
        <div hidden={!open} className="border-t border-border p-4">
          {children}
        </div>
      )}
    </section>
  );
}
