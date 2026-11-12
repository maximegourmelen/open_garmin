import type { ReactNode } from 'react';

export function SettingsRow({
  label,
  description,
  children,
  state,
}: {
  label: string;
  description?: string;
  children: ReactNode;
  state?: { kind: 'saving' | 'saved' | 'error'; message?: string };
}) {
  return (
    <div className="grid gap-3 border-b border-border py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(170px,240px)] sm:items-start sm:gap-6">
      <div>
        <p className="type-body font-medium text-text">{label}</p>
        {description && <p className="mt-1 type-caption text-text-2">{description}</p>}
      </div>
      <div className="space-y-1 sm:justify-self-end sm:text-right">
        {children}
        {state?.kind === 'saving' && (
          <p role="status" className="type-caption text-text-3">
            Saving…
          </p>
        )}
        {state?.kind === 'saved' && (
          <p role="status" className="type-caption text-text-3">
            Saved
          </p>
        )}
        {state?.kind === 'error' && (
          <p role="alert" className="type-caption text-negative">
            {state.message}
          </p>
        )}
      </div>
    </div>
  );
}
