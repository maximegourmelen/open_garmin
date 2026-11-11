import { Menu } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../app/theme-context';
import { useWorkspace } from '../app/workspace-context';
import { Button } from '../components/ui/Button';
import { Drawer } from '../components/ui/Overlays';
import { cn } from '../lib/cn';
import { primaryNav } from './navigation';

export function BottomTabBar({ onShortcuts }: { onShortcuts: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const { mode, setMode, session } = useWorkspace();
  const [more, setMore] = useState(false);
  const go = (path: string) => {
    setMore(false);
    navigate(path);
  };
  return (
    <>
      <nav
        data-tour="sidebar"
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-30 flex h-[calc(56px+env(safe-area-inset-bottom))] border-t border-border bg-bg pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {primaryNav.map(({ path, label, icon: Icon }) => {
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
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 text-[11px]',
                active ? 'text-text' : 'text-text-3',
              )}
            >
              <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMore(true)}
          aria-label="More"
          className="flex flex-1 flex-col items-center justify-center gap-1 text-[11px] text-text-3"
        >
          <Menu size={16} strokeWidth={1.5} />
          <span>More</span>
        </button>
      </nav>
      <Drawer title="More" open={more} onOpenChange={setMore}>
        <div className="grid gap-2">
          <Button variant="ghost" className="justify-start" onClick={() => go('/guide')}>
            Guide
          </Button>
          <Button variant="ghost" className="justify-start" onClick={() => go('/settings')}>
            Settings
          </Button>
          <Button variant="ghost" className="justify-start" onClick={() => go('/?tour=1')}>
            Take the tour
          </Button>
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => {
              setMore(false);
              onShortcuts();
            }}
          >
            Keyboard shortcuts
          </Button>
          <div className="my-2 border-t border-border" />
          <p className="type-caption text-text-3">Theme</p>
          <div className="flex flex-wrap gap-2">
            {(['light', 'dark', 'system'] as const).map((choice) => (
              <Button
                key={choice}
                size="sm"
                variant={theme.theme === choice ? 'primary' : 'secondary'}
                onClick={() => theme.setTheme(choice)}
              >
                {choice === 'system' ? 'System' : choice === 'light' ? 'Light' : 'Dark'}
              </Button>
            ))}
          </div>
          <Button
            variant="ghost"
            className="mt-3 justify-start"
            disabled={mode === 'demo' && !session?.user}
            onClick={() => {
              setMode(mode === 'demo' ? 'live' : 'demo');
              setMore(false);
            }}
          >
            {mode === 'demo' ? 'Switch to my data' : 'Switch to sample data'}
          </Button>
        </div>
      </Drawer>
    </>
  );
}
