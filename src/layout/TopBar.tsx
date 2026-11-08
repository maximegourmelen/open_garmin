import { ChevronDown, CloudOff, RefreshCw, Search, SunMoon } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../app/theme-context';
import { useWorkspace } from '../app/workspace-context';
import { useStatus } from '../lib/queries';
import { request } from '../lib/api';
import { Avatar, Pill } from '../components/ui';
import { primaryNav, secondaryNav } from './navigation';

function pageTitle(path: string) {
  return (
    [...primaryNav, ...secondaryNav].find(
      (item) => path === item.path || (item.path !== '/' && path.startsWith(`${item.path}/`)),
    )?.label ?? 'Today'
  );
}

export function TopBar({ onSearch }: { onSearch: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { mode, setMode, session } = useWorkspace();
  const { data: status } = useStatus();
  const theme = useTheme();
  const running = status?.jobs.find((job) => ['running', 'queued'].includes(job.state));
  const syncLabel =
    mode === 'demo'
      ? 'Sample data'
      : running
        ? `Syncing… ${running.progress}%`
        : status?.connection.connected
          ? status.connection.last_success
            ? `Synced ${new Date(status.connection.last_success).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
            : 'Connected'
          : 'Not connected';
  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-border bg-bg/95 px-4 backdrop-blur md:px-8">
      <div className="mr-auto min-w-0">
        <p className="hidden text-xs text-text-3 md:block">Workspace / {pageTitle(pathname)}</p>
        <h1 className="truncate text-lg font-semibold text-text md:text-base">
          {pageTitle(pathname)}
        </h1>
      </div>
      <button
        type="button"
        aria-label="Search activities"
        onClick={onSearch}
        className="flex size-10 items-center justify-center rounded-control text-text-2 hover:bg-surface-2"
      >
        <Search size={19} />
      </button>
      <Pill tone={mode === 'demo' ? 'accent' : 'neutral'}>
        <span className="inline-flex items-center gap-1">
          {running ? (
            <RefreshCw size={13} className="animate-spin" />
          ) : mode === 'live' && !status?.connection.connected ? (
            <CloudOff size={13} />
          ) : null}
          {syncLabel}
        </span>
      </Pill>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          className="flex items-center gap-1 rounded-full"
          aria-label="Account menu"
        >
          <Avatar name={mode === 'demo' ? 'Alex' : (session?.user?.name ?? 'Athlete')} size="sm" />
          <ChevronDown size={14} className="text-text-2" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={8}
            className="z-50 min-w-48 rounded-tile border border-border-strong bg-surface p-1 text-sm text-text shadow-xl"
          >
            <DropdownMenu.Label className="px-3 py-2 text-xs text-text-3">
              {mode === 'demo' ? 'Sample workspace' : session?.user?.name}
            </DropdownMenu.Label>
            <DropdownMenu.Item
              onSelect={() => navigate('/settings')}
              className="cursor-pointer rounded-lg px-3 py-2 outline-none focus:bg-surface-2"
            >
              Settings
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={() => navigate('/methods')}
              className="cursor-pointer rounded-lg px-3 py-2 outline-none focus:bg-surface-2"
            >
              How it works
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={() => theme.setTheme(theme.resolved === 'dark' ? 'light' : 'dark')}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 outline-none focus:bg-surface-2"
            >
              <SunMoon size={15} />
              Switch theme
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            {!session?.user && (
              <DropdownMenu.Item
                onSelect={() => navigate('/settings')}
                className="cursor-pointer rounded-lg px-3 py-2 font-medium text-accent outline-none focus:bg-surface-2"
              >
                Sign in / Connect
              </DropdownMenu.Item>
            )}
            <DropdownMenu.Item
              onSelect={() => setMode(mode === 'demo' ? 'live' : 'demo')}
              disabled={mode === 'demo' && !session?.user}
              className="cursor-pointer rounded-lg px-3 py-2 outline-none focus:bg-surface-2 disabled:cursor-not-allowed disabled:text-text-3"
            >
              {mode === 'demo' ? 'Use my data' : 'Explore sample data'}
            </DropdownMenu.Item>
            {!session?.local_mode && session?.user && (
              <DropdownMenu.Item
                onSelect={() => {
                  void (async () => {
                    await request('/auth/logout', { method: 'POST' });
                    window.location.reload();
                  })();
                }}
                className="cursor-pointer rounded-lg px-3 py-2 outline-none focus:bg-surface-2"
              >
                Sign out
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </header>
  );
}
