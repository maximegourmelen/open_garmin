import { ArrowLeft, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Tag } from '../components/ui/Structure';
import { PageHint } from '../features/guidance/PageHint';
import { pageIntros, type PageId } from '../content/pageIntros';

export function PageHeader({
  title,
  description,
  action,
  onAbout,
  back,
  sample = false,
  pageId,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  onAbout?: () => void;
  back?: { href: string; label: string };
  sample?: boolean;
  pageId?: PageId;
}) {
  return (
    <div className="space-y-4">
      <header className="border-b border-border pb-6">
        {back && (
          <Link
            to={back.href}
            className="mb-4 inline-flex items-center gap-2 type-body text-text-2 hover:text-text"
          >
            <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
            {back.label}
          </Link>
        )}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="type-title text-text">{title}</h1>
              {sample && <Tag>Sample data</Tag>}
            </div>
            {(description ?? (pageId ? pageIntros[pageId].description : null)) && (
              <p className="mt-2 max-w-[72ch] type-body text-text-2">
                {description ?? pageIntros[pageId!].description}
              </p>
            )}
          </div>
          {action}
        </div>
        {onAbout && (
          <button
            type="button"
            onClick={onAbout}
            className="mt-3 inline-flex items-center gap-1 type-caption text-text-2 hover:text-text"
          >
            <Info size={14} strokeWidth={1.5} aria-hidden="true" />
            About this page
          </button>
        )}
      </header>
      {pageId && <PageHint id={pageId} />}
    </div>
  );
}
