import { ChevronLeft, ChevronRight } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import { cn } from '../lib/cn';
import { primaryNav, secondaryNav } from './navigation';

function initialCollapsed() {
  try {
    return localStorage.getItem('og_nav_collapsed') === '1';
  } catch {
    return false;
  }
}

export function SideNav() {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem('og_nav_collapsed', next ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
  };
  const links = (items: typeof primaryNav | typeof secondaryNav) =>
    items.map(({ path, label, icon: Icon }) => (
      <NavLink
        key={path}
        to={path}
        end={path === '/'}
        title={collapsed ? label : undefined}
        className={({ isActive }) =>
          cn(
            'flex min-h-11 items-center gap-3 rounded-control px-3 text-sm font-medium transition-colors',
            isActive
              ? 'bg-accent-soft text-accent'
              : 'text-text-2 hover:bg-surface-2 hover:text-text',
          )
        }
      >
        <Icon size={20} aria-hidden="true" />
        <span className={collapsed ? 'sr-only' : ''}>{label}</span>
      </NavLink>
    ));
  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-surface p-3 md:flex',
        collapsed ? 'w-20' : 'w-56',
      )}
    >
      <NavLink
        to="/"
        className="mb-8 flex items-center gap-2 px-2 pt-3 text-lg font-bold text-text"
      >
        <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-on-accent">
          O
        </span>
        <span className={collapsed ? 'sr-only' : ''}>Open Garmin</span>
      </NavLink>
      <nav aria-label="Primary navigation" className="flex flex-col gap-1">
        {links(primaryNav)}
      </nav>
      <div className="mt-auto border-t border-border pt-3">
        <nav aria-label="Secondary navigation" className="flex flex-col gap-1">
          {links(secondaryNav)}
        </nav>
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          className="mt-2 flex min-h-10 w-full items-center justify-center rounded-control text-text-3 hover:bg-surface-2"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
}
