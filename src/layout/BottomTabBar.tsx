import { NavLink } from 'react-router-dom';
import { cn } from '../lib/cn';
import { primaryNav } from './navigation';

export function BottomTabBar() {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {primaryNav.map(({ path, label, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          end={path === '/'}
          className={({ isActive }) =>
            cn(
              'flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[0.65rem] font-medium',
              isActive ? 'text-accent' : 'text-text-3',
            )
          }
        >
          <Icon size={21} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
