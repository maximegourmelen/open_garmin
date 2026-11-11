import { Search, SlidersHorizontal } from 'lucide-react';
import { Popover } from '../../components/ui/Overlays';
import { RangeControl } from '../../components/ui/RangeControl';
import { SegmentedControl } from '../../components/ui/Controls';
import { Button } from '../../components/ui';
import type { Sport } from '../../lib/types';
import { SPORTS } from './activityConstants';

export function ActivityViewControls({
  range,
  view,
  onRange,
  onView,
}: {
  range: string;
  view: 'list' | 'calendar';
  onRange: (value: string) => void;
  onView: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <RangeControl value={range} onChange={onRange} includeAll />
      <SegmentedControl
        label="Activity view"
        value={view}
        onChange={onView}
        options={[
          { value: 'list', label: 'List' },
          { value: 'calendar', label: 'Calendar' },
        ]}
      />
    </div>
  );
}

export function ActivityFilters({
  view,
  search,
  onSearch,
  sports,
  onSport,
  compareMode,
  onCompare,
}: {
  view: 'list' | 'calendar';
  search: string;
  onSearch: (value: string) => void;
  sports: Sport[];
  onSport: (value: Sport) => void;
  compareMode: boolean;
  onCompare: () => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-w-52 flex-1 items-center gap-2 rounded-control border border-border-strong bg-surface px-3">
          <Search size={16} strokeWidth={1.5} aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search activities"
            aria-label="Search activities"
            className="min-h-10 w-full bg-transparent type-body text-text outline-none"
          />
        </label>
        <Popover
          trigger={
            <button
              type="button"
              className="min-h-10 rounded-control border border-border-strong bg-surface px-3 type-body text-text"
            >
              Sport{sports.length ? ` (${sports.length})` : ''} ▾
            </button>
          }
        >
          <div role="group" aria-label="Sports" className="space-y-1">
            {SPORTS.map((sport) => (
              <label key={sport} className="flex min-h-9 items-center gap-2 capitalize">
                <input
                  type="checkbox"
                  checked={sports.includes(sport)}
                  onChange={() => onSport(sport)}
                  className="size-4 accent-accent"
                />
                {sport}
              </label>
            ))}
          </div>
        </Popover>
        {view === 'list' && (
          <Button onClick={onCompare}>
            <SlidersHorizontal size={16} strokeWidth={1.5} aria-hidden="true" />
            {compareMode ? 'Done comparing' : 'Compare'}
          </Button>
        )}
      </div>
    </div>
  );
}
