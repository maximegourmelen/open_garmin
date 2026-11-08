import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';
import type { Source } from '../../lib/types';
import { Explainer } from './Explainer';
import { SourceBadge } from './SourceBadge';

type Props = {
  title: string;
  icon?: LucideIcon;
  href?: string;
  source?: Source;
  explainer?: { what: string; why: string; source: string; method?: string };
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function Card({
  title,
  icon: Icon,
  href,
  source,
  explainer,
  children,
  footer,
  className,
}: Props) {
  return (
    <section
      className={cn(
        'rounded-card border border-border bg-surface p-4 text-text shadow-sm transition-transform duration-150 hover:border-border-strong md:p-5',
        className,
      )}
      aria-label={title}
    >
      <header className="mb-4 flex min-h-8 items-center gap-2.5">
        {Icon && (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Icon size={18} aria-hidden="true" />
          </span>
        )}
        {href ? (
          <Link
            to={href}
            className="flex min-w-0 flex-1 items-center gap-1 font-semibold hover:text-accent"
          >
            <span className="truncate">{title}</span>
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        ) : (
          <h2 className="min-w-0 flex-1 truncate font-semibold">{title}</h2>
        )}
        {source && <SourceBadge source={source} />}
        {explainer && <Explainer title={title} {...explainer} />}
      </header>
      {children}
      {footer && (
        <footer className="mt-4 border-t border-border pt-3 text-sm text-text-2">{footer}</footer>
      )}
    </section>
  );
}
