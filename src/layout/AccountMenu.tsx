import { ChevronDown } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../app/theme-context';
import { useWorkspace } from '../app/workspace-context';
import { request } from '../lib/api';

export function AccountMenu({ onShortcuts }: { onShortcuts: () => void }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const { mode, setMode, session } = useWorkspace();
  const name = mode === 'demo' ? 'Alex' : (session?.user?.name ?? 'Athlete');
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className="flex h-9 w-full items-center gap-2 rounded-control px-2 type-body text-text hover:bg-surface-2"
        aria-label="Account menu"
      >
        <span
          aria-hidden="true"
          className="flex size-6 items-center justify-center rounded-full bg-surface-2 type-caption"
        >
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="hidden min-w-0 flex-1 truncate text-left lg:block">{name}</span>
        <ChevronDown size={14} className="hidden text-text-3 lg:block" aria-hidden="true" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-52 rounded-control border border-border bg-surface p-1 type-body text-text shadow-lg dark:shadow-none"
        >
          <DropdownMenu.Label className="px-3 py-2 type-caption text-text-3">
            {mode === 'demo' ? 'Sample workspace' : name}
          </DropdownMenu.Label>
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger className="cursor-pointer rounded-md px-3 py-2 outline-none focus:bg-surface-2">
              Theme
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent className="z-50 min-w-36 rounded-control border border-border bg-surface p-1 shadow-lg dark:shadow-none">
                {(['light', 'dark', 'system'] as const).map((choice) => (
                  <DropdownMenu.Item
                    key={choice}
                    onSelect={() => theme.setTheme(choice)}
                    className="cursor-pointer rounded-md px-3 py-2 type-body outline-none focus:bg-surface-2"
                  >
                    {choice === 'system' ? 'Match system' : choice === 'light' ? 'Light' : 'Dark'}
                    {theme.theme === choice ? ' ✓' : ''}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>
          <DropdownMenu.Item
            onSelect={() => navigate('/?tour=1')}
            className="cursor-pointer rounded-md px-3 py-2 outline-none focus:bg-surface-2"
          >
            Take the tour
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={onShortcuts}
            className="cursor-pointer rounded-md px-3 py-2 outline-none focus:bg-surface-2"
          >
            Keyboard shortcuts
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            onSelect={() => setMode(mode === 'demo' ? 'live' : 'demo')}
            disabled={mode === 'demo' && !session?.user}
            className="cursor-pointer rounded-md px-3 py-2 outline-none focus:bg-surface-2 data-[disabled]:text-text-3"
          >
            {mode === 'demo' ? 'Switch to my data' : 'Switch to sample data'}
          </DropdownMenu.Item>
          {!session?.local_mode && session?.user && (
            <DropdownMenu.Item
              onSelect={() => {
                void request('/auth/logout', { method: 'POST' }).then(() =>
                  window.location.reload(),
                );
              }}
              className="cursor-pointer rounded-md px-3 py-2 outline-none focus:bg-surface-2"
            >
              Sign out
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
