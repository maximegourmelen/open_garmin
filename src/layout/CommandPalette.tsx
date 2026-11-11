import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '../components/ui/Controls';
import { useToast } from '../components/ui/toast-context';
import { useWorkspace } from '../app/workspace-context';
import { useTheme } from '../app/theme-context';
import { request, workspaceRequest } from '../lib/api';
import type { ActivityList } from '../lib/types';
import { primaryNav, secondaryNav } from './navigation';

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<ActivityList['items']>([]);
  const navigate = useNavigate();
  const client = useQueryClient();
  const toast = useToast();
  const { mode, session } = useWorkspace();
  const theme = useTheme();
  useEffect(() => {
    if (!open || term.trim().length < 2) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void workspaceRequest<ActivityList>(
        mode,
        `/activities?q=${encodeURIComponent(term.trim())}&limit=5`,
      )
        .then((data) => {
          if (!cancelled) setResults(data.items);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, term, mode]);
  const close = () => {
    onClose();
    setTerm('');
    setResults([]);
  };
  const go = (path: string) => {
    navigate(path);
    close();
  };
  const pages = [...primaryNav, ...secondaryNav].filter((item) =>
    item.label.toLowerCase().includes(term.toLowerCase()),
  );
  const actions = [
    {
      label: 'Connect Garmin',
      run: () => go('/settings?section=connection'),
    },
    ...(mode === 'live' && session?.user
      ? [
          {
            label: 'Sync now',
            run: () => {
              close();
              void request('/sync?days=90', { method: 'POST' })
                .then(() => {
                  toast({ message: 'Sync started' });
                  void client.invalidateQueries({ queryKey: [mode, 'status'] });
                })
                .catch((error: Error) => toast({ message: error.message }));
            },
          },
        ]
      : []),
    {
      label: 'Toggle theme',
      run: () => {
        theme.setTheme(theme.resolved === 'dark' ? 'light' : 'dark');
        close();
      },
    },
    { label: 'Take the tour', run: () => go('/?tour=1') },
  ].filter((item) => item.label.toLowerCase().includes(term.toLowerCase()));
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && close()}
      title="Search and jump"
      description="Find an activity, page or action"
    >
      <input
        autoFocus
        value={term}
        onChange={(event) => {
          setTerm(event.target.value);
          if (event.target.value.trim().length < 2) setResults([]);
        }}
        placeholder="Search activities or pages"
        aria-label="Search activities or pages"
        className="mb-4 w-full rounded-control border border-border-strong bg-surface-2 px-3 py-2 text-text outline-none focus:border-accent"
      />
      <div className="max-h-[min(55vh,420px)] space-y-4 overflow-y-auto">
        {pages.length > 0 && (
          <div role="group" aria-label="Pages">
            <p className="mb-1 px-3 type-caption text-text-3">Pages</p>
            {pages.map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => go(item.path)}
                className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-left type-body hover:bg-surface-2"
              >
                <item.icon size={16} strokeWidth={1.5} aria-hidden="true" />
                {item.label}
              </button>
            ))}
          </div>
        )}
        {results.length > 0 && (
          <div role="group" aria-label="Activities">
            <p className="mb-1 px-3 type-caption text-text-3">Activities</p>
            {results.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => go(`/activities/${item.id}`)}
                className="flex w-full items-center justify-between gap-2 rounded-control px-3 py-2 text-left type-body hover:bg-surface-2"
              >
                <span>{item.name}</span>
                <span className="type-caption text-text-3">{item.date}</span>
              </button>
            ))}
          </div>
        )}
        {actions.length > 0 && (
          <div role="group" aria-label="Actions">
            <p className="mb-1 px-3 type-caption text-text-3">Actions</p>
            {actions.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.run}
                className="block w-full rounded-control px-3 py-2 text-left type-body hover:bg-surface-2"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
        {term && !pages.length && !results.length && !actions.length && (
          <p className="px-3 py-2 type-body text-text-3">No matches yet</p>
        )}
      </div>
    </Dialog>
  );
}
