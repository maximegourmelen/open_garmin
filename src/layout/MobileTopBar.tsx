import { CircleHelp, Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { IconButton } from '../components/ui/Button';
import { destination } from './navigation';

export function MobileTopBar({ onSearch, onHelp }: { onSearch: () => void; onHelp: () => void }) {
  const { pathname } = useLocation();
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-bg px-4 md:hidden">
      <span className="type-heading text-text">{destination(pathname)}</span>
      <div className="flex items-center gap-1">
        <IconButton label="Search" onClick={onSearch}>
          <Search size={16} strokeWidth={1.5} />
        </IconButton>
        <IconButton label="Help" onClick={onHelp}>
          <CircleHelp size={16} strokeWidth={1.5} />
        </IconButton>
      </div>
    </header>
  );
}
