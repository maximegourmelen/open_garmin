import { CircleHelp, Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { IconButton } from '../components/ui/Button';
import { destination } from './navigation';

export function MobileTopBar({
  onSearch,
  onHelp,
  sample = false,
}: {
  onSearch: () => void;
  onHelp: () => void;
  sample?: boolean;
}) {
  const { pathname } = useLocation();
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-bg px-4 md:hidden">
      <div className="flex min-w-0 items-center gap-2">
        <span className="type-heading text-text">{destination(pathname)}</span>
        {sample && <span className="type-caption text-text-3">Sample data</span>}
      </div>
      <div className="flex items-center gap-1">
        <IconButton data-tour="search" label="Search" onClick={onSearch}>
          <Search size={16} strokeWidth={1.5} />
        </IconButton>
        <IconButton label="Help" onClick={onHelp}>
          <CircleHelp size={16} strokeWidth={1.5} />
        </IconButton>
      </div>
    </header>
  );
}
