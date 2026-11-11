import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../../app/workspace-context';
import { Button, EmptyState, ErrorState, Skeleton } from '../../components/ui';
import { PageHeader } from '../../layout/PageHeader';
import { workspaceRequest } from '../../lib/api';
import { usePreferences } from '../../lib/queries';
import type { ActivityList, Sport } from '../../lib/types';
import { ActivityCalendar } from './ActivityCalendar';
import { ActivityFilters, ActivityViewControls } from './ActivityFilters';
import { ActivityListView } from './ActivityList';
import { ActivityStats } from './ActivityStats';
import { SPORTS } from './activityConstants';
import { localDate, rangeDays } from './activityDates';

type DateRange = '7D' | '30D' | '90D' | '1Y' | 'All';

export default function ActivitiesPage() {
  const { mode } = useWorkspace();
  const prefs = usePreferences();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [now] = useState(() => new Date());
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [search, setSearch] = useState(() => params.get('q') ?? '');
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const sentinel = useRef<HTMLDivElement | null>(null);
  const range = (
    ['7D', '30D', '90D', '1Y', 'All'].includes(params.get('range') ?? '')
      ? params.get('range')
      : '30D'
  ) as DateRange;
  const view = params.get('view') === 'calendar' ? 'calendar' : 'list';
  const sports = (params.get('sport') ?? '')
    .split(',')
    .filter((sport): sport is Sport => SPORTS.includes(sport as Sport));
  const query = params.get('q') ?? '';
  const dateFrom = new Date(now);
  if (view === 'calendar') dateFrom.setFullYear(month.getFullYear(), month.getMonth(), 1);
  else if (range !== 'All') dateFrom.setDate(dateFrom.getDate() - rangeDays[range] + 1);
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
    <div className="space-y-8">
      <PageHeader
        title="Activities"
        pageId="activities"
        action={
          <ActivityViewControls
            range={range}
            view={view}
            onRange={(value) => setParam('range', value)}
            onView={(value) => {
              setParam('view', value === 'calendar' ? value : null);
              setSelected([]);
              setCompareMode(false);
            }}
          />
        }
      />
      {activities.isPending ? (
        <div aria-label="Loading activities" className="space-y-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-20" />
          <Skeleton className="h-52" />
        </div>
      ) : activities.isError ? (
        <ErrorState message={activities.error.message} retry={() => void activities.refetch()} />
      ) : (
        <>
          <ActivityStats totals={totals} units={prefs.data?.units} />
          <ActivityFilters
            view={view}
            search={search}
            onSearch={setSearch}
            sports={sports}
            onSport={toggleSport}
            compareMode={compareMode}
            onCompare={() => {
              setCompareMode((old) => !old);
              setSelected([]);
            }}
          />
          {!items.length ? (
            <EmptyState
              title="Your activities will appear here"
              text="Try a different filter, or sync your watch to bring in recent activities."
            />
          ) : view === 'calendar' ? (
            <ActivityCalendar
              month={month}
              onMonthChange={setMonth}
              activities={items}
              todayDate={localDate(now)}
            />
          ) : (
            <ActivityListView
              items={items}
              todayDate={localDate(now)}
              units={prefs.data?.units}
              weekStartDay={prefs.data?.week_start}
              compareMode={compareMode}
              selected={selected}
              onToggle={toggleSelected}
            />
          )}
          {activities.hasNextPage && (
            <div ref={sentinel} className="flex justify-center">
              <Button
                disabled={activities.isFetchingNextPage}
                onClick={() => void activities.fetchNextPage()}
              >
                {activities.isFetchingNextPage ? 'Loading more…' : 'Load more'}
              </Button>
            </div>
          )}
          {compareMode && selected.length > 0 && (
            <div className="fixed inset-x-4 bottom-20 z-30 mx-auto flex max-w-xl items-center gap-3 rounded-card border border-border-strong bg-surface p-3 shadow-xl md:bottom-4">
              <span className="flex-1 type-body">{selected.length} selected · choose 2–4</span>
              <Button
                disabled={selected.length < 2}
                onClick={() =>
                  navigate(`/activities/compare?ids=${selected.map(encodeURIComponent).join(',')}`)
                }
              >
                Compare selected
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
