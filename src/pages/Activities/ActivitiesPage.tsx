import { useInfiniteQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../../app/workspace-context';
import { StatGrid, StatTile } from '../../components/data';
import { Button, EmptyState, ErrorState, SegmentedControl, Skeleton } from '../../components/ui';
import { workspaceRequest } from '../../lib/api';
import { formatDistance, formatDuration } from '../../lib/format';
import { usePreferences } from '../../lib/queries';
import type { ActivityList, Sport } from '../../lib/types';
import { ActivityCalendar } from './ActivityCalendar';
import { ActivityListView } from './ActivityList';
import { CompareActivities } from './CompareActivities';

const SPORTS: Sport[] = [
  'walking',
  'running',
  'cycling',
  'swimming',
  'strength',
  'hiking',
  'other',
];
type DateRange = '4W' | '3M' | '1Y' | 'All';

function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function ActivitiesPage() {
  const { mode } = useWorkspace();
  const prefs = usePreferences();
  const [params, setParams] = useSearchParams();
  const [now] = useState(() => new Date());
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [search, setSearch] = useState(() => params.get('q') ?? '');
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const sentinel = useRef<HTMLDivElement | null>(null);
  const range = (
    ['4W', '3M', '1Y', 'All'].includes(params.get('range') ?? '') ? params.get('range') : '4W'
  ) as DateRange;
  const view = params.get('view') === 'calendar' ? 'calendar' : 'list';
  const sports = (params.get('sport') ?? '')
    .split(',')
    .filter((sport): sport is Sport => SPORTS.includes(sport as Sport));
  const query = params.get('q') ?? '';
  const dateFrom = new Date(now);
  if (view === 'calendar') dateFrom.setFullYear(month.getFullYear(), month.getMonth(), 1);
  else if (range !== 'All')
    dateFrom.setDate(dateFrom.getDate() - { '4W': 28, '3M': 90, '1Y': 365 }[range]);
  const dateTo = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const filter = new URLSearchParams();
  if (view === 'calendar' || range !== 'All') filter.set('from', localDate(dateFrom));
  if (view === 'calendar') filter.set('to', localDate(dateTo));
  if (sports.length) filter.set('sport', sports.join(','));
  if (query) filter.set('q', query);
  filter.set('limit', '50');
  const filterString = filter.toString();
  const activities = useInfiniteQuery({
    queryKey: [mode, 'activities', filterString],
    initialPageParam: '0',
    queryFn: ({ pageParam }) =>
      workspaceRequest<ActivityList>(mode, `/activities?${filterString}&cursor=${pageParam}`),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });
  const { hasNextPage, fetchNextPage } = activities;
  const items = activities.data?.pages.flatMap((page) => page.items) ?? [];
  const totals = activities.data?.pages[0]?.totals;
  const todayDate = localDate(now);
  useEffect(() => {
    if (search === query) return;
    const timer = setTimeout(
      () =>
        setParams(
          (old) => {
            const next = new URLSearchParams(old);
            if (search.trim()) next.set('q', search.trim());
            else next.delete('q');
            return next;
          },
          { replace: true },
        ),
      250,
    );
    return () => clearTimeout(timer);
  }, [search, query, setParams]);
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasNextPage || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void fetchNextPage();
      },
      { rootMargin: '300px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage]);
  function setParam(key: string, value: string | null) {
    setParams((old) => {
      const next = new URLSearchParams(old);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  }
  function toggleSport(sport: Sport) {
    const next = sports.includes(sport)
      ? sports.filter((item) => item !== sport)
      : [...sports, sport];
    setParam('sport', next.length ? next.join(',') : null);
  }
  function toggleSelected(id: string) {
    setSelected((old) =>
      old.includes(id) ? old.filter((value) => value !== id) : old.length < 4 ? [...old, id] : old,
    );
  }
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-text-2">
            See what you’ve done and how your routine is growing.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setCompareMode((old) => !old);
            setSelected([]);
          }}
        >
          <SlidersHorizontal size={16} />
          {compareMode ? 'Done comparing' : 'Compare'}
        </Button>
      </header>
      <StatGrid>
        <StatTile label="Sessions" value={totals?.sessions} />
        <StatTile label="Time" value={totals ? formatDuration(totals.duration) : null} />
        <StatTile
          label="Distance"
          value={totals ? formatDistance(totals.distance, prefs.data?.units) : null}
        />
        <StatTile label="Effort points" value={totals?.effort_points} />
      </StatGrid>
      <section
        className="space-y-3 rounded-card border border-border bg-surface p-4"
        aria-label="Activity filters"
      >
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-w-48 flex-1 items-center gap-2 rounded-control border border-border bg-surface-2 px-3">
            <Search size={17} className="text-text-3" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search activities"
              aria-label="Search activities"
              className="min-h-10 w-full bg-transparent text-sm text-text outline-none"
            />
          </label>
          <SegmentedControl
            label="Date range"
            value={range}
            onChange={(value) => setParam('range', value)}
            options={(['4W', '3M', '1Y', 'All'] as DateRange[]).map((value) => ({
              value,
              label: value,
            }))}
          />
          <SegmentedControl
            label="View"
            value={view}
            onChange={(value) => setParam('view', value === 'calendar' ? value : null)}
            options={[
              { value: 'list', label: 'List' },
              { value: 'calendar', label: 'Calendar' },
            ]}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SPORTS.map((sport) => (
            <button
              key={sport}
              type="button"
              aria-pressed={sports.includes(sport)}
              onClick={() => toggleSport(sport)}
              className={`rounded-full border px-3 py-1 text-xs capitalize ${sports.includes(sport) ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-surface-2 text-text-2'}`}
            >
              {sport}
            </button>
          ))}
        </div>
      </section>
      {activities.isPending && (
        <div className="space-y-3" aria-label="Loading activities">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      )}
      {activities.isError && (
        <ErrorState
          message={activities.error.message}
          retry={() => {
            void activities.refetch();
          }}
        />
      )}
      {activities.isSuccess && !items.length && (
        <EmptyState
          title="Your activities will appear here"
          text="Try a different filter, or sync your watch to bring in recent sessions."
        />
      )}
      {activities.isSuccess &&
        items.length > 0 &&
        (view === 'calendar' ? (
          <ActivityCalendar
            month={month}
            onMonthChange={setMonth}
            activities={items}
            todayDate={todayDate}
          />
        ) : (
          <ActivityListView
            items={items}
            todayDate={todayDate}
            units={prefs.data?.units}
            compareMode={compareMode}
            selected={selected}
            onToggle={toggleSelected}
          />
        ))}
      {activities.hasNextPage && (
        <div ref={sentinel} className="flex justify-center">
          <Button
            disabled={activities.isFetchingNextPage}
            onClick={() => {
              void activities.fetchNextPage();
            }}
          >
            {activities.isFetchingNextPage ? 'Loading more…' : 'Load more'}
          </Button>
        </div>
      )}
      {compareMode && selected.length > 0 && (
        <div className="fixed inset-x-4 bottom-20 z-30 mx-auto flex max-w-xl items-center gap-3 rounded-card border border-border-strong bg-surface p-3 shadow-xl md:bottom-4">
          <span className="flex-1 text-sm">{selected.length} selected · choose 2–4</span>
          <Button size="sm" disabled={selected.length < 2} onClick={() => setCompareOpen(true)}>
            Compare selected
          </Button>
        </div>
      )}
      {compareOpen && (
        <CompareActivities
          ids={selected}
          open
          onClose={() => setCompareOpen(false)}
          prefs={prefs.data}
        />
      )}
    </div>
  );
}
