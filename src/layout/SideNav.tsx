import { Search } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../app/workspace-context';
import { useStatus } from '../lib/queries';
import { cn } from '../lib/cn';
import { AccountMenu } from './AccountMenu';
import { primaryNav, secondaryNav } from './navigation';

function timeSince(value: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} h ago`;
}

export function SideNav({
  onSearch,
  onShortcuts,
}: {
  onSearch: () => void;
  onShortcuts: () => void;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { mode } = useWorkspace();
  const { data: status } = useStatus();
  const running = status?.jobs.find((job) => ['running', 'queued'].includes(job.state));
  const syncText = running
    ? `Syncing ${running.progress}%`
    : mode === 'demo'
      ? 'Sample workspace'
      : status?.connection.connected
        ? status.connection.last_success
          ? `Synced ${timeSince(status.connection.last_success)}`
          : 'Connected'
        : 'Not connected';
  const links = (items: typeof primaryNav | typeof secondaryNav) =>
    items.map(({ path, label, icon: Icon }) => {
      const active =
        label === 'Health'
          ? pathname.startsWith('/health')
          : path === '/'
            ? pathname === '/'
            : pathname === path || pathname.startsWith(`${path}/`);
      return (
        <Link
          key={path}
          to={path}
          aria-current={active ? 'page' : undefined}
          title={label}
          className={cn(
            'flex h-9 items-center gap-3 rounded-control border-l-2 px-3 type-body',
            active
              ? 'border-accent bg-accent-soft text-text'
              : 'border-transparent text-text-2 hover:bg-surface-2 hover:text-text',
          )}
        >
          <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
          <span className="hidden lg:block">{label}</span>
          <span className="sr-only lg:hidden">{label}</span>
        </Link>
      );
    });
  return (
    <aside className="sticky top-0 hidden h-screen w-16 shrink-0 flex-col border-r border-border bg-bg px-2 py-6 md:flex lg:w-56 lg:px-3">
      <Link to="/" className="mb-12 px-3 type-heading text-text" aria-label="Open Garmin home">
        <span className="lg:hidden">O</span>
        <span className="hidden lg:inline">Open Garmin</span>
      </Link>
      <nav aria-label="Primary navigation" className="space-y-1">
        {links(primaryNav)}
      </nav>
      <button
        type="button"
        onClick={onSearch}
        title="Search"
        className="mt-5 flex h-9 items-center gap-3 rounded-control px-3 type-body text-text-2 hover:bg-surface-2 hover:text-text"
      >
        <Search size={16} strokeWidth={1.5} aria-hidden="true" />
        <span className="hidden flex-1 text-left lg:block">Search</span>
        <span className="hidden type-caption lg:block">⌘K</span>
      </button>
      <div className="mt-auto space-y-3">
        <button
          type="button"
          onClick={() => navigate('/settings?section=connection')}
          title={syncText}
          className="flex w-full items-center gap-2 px-3 type-caption text-text-2 hover:text-text"
        >
          <span
            aria-hidden="true"
            className={cn(
              'size-1.5 shrink-0 rounded-full',
              running
                ? 'animate-pulse bg-accent'
                : status?.connection.connected
                  ? 'bg-positive'
                  : 'bg-text-3',
            )}
          />
          <span className="hidden lg:block">{syncText}</span>
          <span className="sr-only lg:hidden">{syncText}</span>
        </button>
        <nav aria-label="Secondary navigation" className="space-y-1">
          {links(secondaryNav)}
        </nav>
        <div className="border-t border-border pt-3">
          <AccountMenu onShortcuts={onShortcuts} />
        </div>
      </div>
    </aside>
  );
}
