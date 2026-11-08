import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '../components/ui';
import { useWorkspace } from '../app/workspace-context';
import { useTheme } from '../app/theme-context';
import { workspaceRequest } from '../lib/api';
import type { ActivityList } from '../lib/types';
import { primaryNav, secondaryNav } from './navigation';

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<ActivityList['items']>([]);
  const navigate = useNavigate();
  const { mode, setMode, session } = useWorkspace();
  const theme = useTheme();
  useEffect(() => {
    if (!open || term.trim().length < 2) return;
    const timer = setTimeout(() => {
      void workspaceRequest<ActivityList>(
        mode,
        `/activities?q=${encodeURIComponent(term.trim())}&limit=5`,
      )
        .then((data) => setResults(data.items))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [open, term, mode]);
  const go = (path: string) => {
    navigate(path);
    onClose();
    setTerm('');
  };
  const pages = [...primaryNav, ...secondaryNav].filter((item) =>
    item.label.toLowerCase().includes(term.toLowerCase()),
  );
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Search and jump"
      description="Find an activity or open a page"
    >
      <input
        autoFocus
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Search activities or pages"
        aria-label="Search activities or pages"
        className="mb-3 w-full rounded-control border border-border-strong bg-surface-2 px-3 py-2 text-text outline-none focus:border-accent"
      />
      <div className="max-h-72 overflow-y-auto">
        {pages.map((item) => (
          <button
            key={item.path}
            type="button"
            onClick={() => go(item.path)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2"
          >
            <item.icon size={16} />
            {item.label}
          </button>
        ))}
        {results.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => go(`/activities/${item.id}`)}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2"
          >
            {item.name}
            <span className="ml-2 text-xs text-text-3">{item.date}</span>
          </button>
        ))}
        {term && !pages.length && !results.length && (
          <p className="px-3 py-2 text-sm text-text-3">No matches yet</p>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3 text-xs text-text-2">
        <button
          type="button"
          onClick={() => {
            theme.setTheme(theme.resolved === 'dark' ? 'light' : 'dark');
            onClose();
          }}
        >
          Toggle theme
        </button>
        <span>·</span>
        <button
          type="button"
          disabled={mode === 'demo' && !session?.user}
          onClick={() => {
            setMode(mode === 'demo' ? 'live' : 'demo');
            onClose();
          }}
        >
          Switch workspace
        </button>
      </div>
    </Dialog>
  );
}
