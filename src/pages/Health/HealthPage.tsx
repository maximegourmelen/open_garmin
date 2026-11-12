import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui';
import { RangeControl } from '../../components/ui/RangeControl';
import type { PageId } from '../../content/pageIntros';
import { PageHeader } from '../../layout/PageHeader';
import { useWorkspaceQuery } from '../../lib/queries';
import type { Range } from '../../lib/types';
import { BodyBatteryPanel } from './BodyBatteryPanel';
import { HeartPanel } from './HeartPanel';
import { SleepPanel } from './SleepPanel';
import { StepsPanel } from './StepsPanel';
import { StressPanel } from './StressPanel';
import type { HealthData } from './healthUtils';

type Tab = 'sleep' | 'heart' | 'body-battery' | 'stress' | 'steps';
const tabs: { id: Tab; label: string }[] = [
  { id: 'sleep', label: 'Sleep' },
  { id: 'heart', label: 'Heart' },
  { id: 'body-battery', label: 'Body Battery' },
  { id: 'stress', label: 'Stress' },
  { id: 'steps', label: 'Steps' },
];
const readingFields: Record<Tab, string[]> = {
  sleep: ['minutes'],
  heart: ['resting_hr', 'hrv'],
  'body-battery': ['at_wake', 'latest'],
  stress: ['average'],
  steps: ['steps'],
};

export default function HealthPage() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const segment = location.pathname.split('/')[2];
  const active: Tab = tabs.some((tab) => tab.id === segment) ? (segment as Tab) : 'sleep';
  const rawRange = params.get('range');
  const range = (['7D', '30D', '90D', '1Y'].includes(rawRange ?? '') ? rawRange : '30D') as Range;
  const kind = active === 'body-battery' ? 'energy' : active;
  const query = useWorkspaceQuery<HealthData>(
    ['wellness', kind, range],
    `/wellness/${kind}?range=${range}`,
  );
  const hasReadings = query.data?.days.some((day) =>
    readingFields[active].some((field) => day[field] !== null && day[field] !== undefined),
  );
  function setRange(value: string) {
    setParams((old) => {
      const next = new URLSearchParams(old);
      next.set('range', value);
      return next;
    });
  }
  return (
    <div className="space-y-9">
      <PageHeader
        title="Health"
        pageId={`health-${active}` as PageId}
        action={<RangeControl value={range} onChange={setRange} />}
      />
      <nav
        aria-label="Health sections"
        className="flex gap-6 overflow-x-auto border-b border-border"
      >
        {tabs.map(({ id, label }) => (
          <Link
            key={id}
            to={`/health/${id}?range=${range}`}
            aria-current={active === id ? 'page' : undefined}
            className={`shrink-0 border-b-2 py-3 type-body ${active === id ? 'border-accent font-medium text-text' : 'border-transparent text-text-2 hover:text-text'}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {query.isPending ? (
        <div role="status" aria-label="Loading Health" className="space-y-5">
          <Skeleton className="h-28" />
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
      ) : query.isError ? (
        <ErrorState message={query.error.message} retry={() => void query.refetch()} />
      ) : !query.data || !hasReadings ? (
        <EmptyState
          title={`No ${tabs.find((tab) => tab.id === active)?.label.toLowerCase()} readings yet`}
          text="Sync your watch or explore sample data to see your health trends."
        />
      ) : active === 'sleep' ? (
        <SleepPanel series={query.data} />
      ) : active === 'heart' ? (
        <HeartPanel series={query.data} />
      ) : active === 'body-battery' ? (
        <BodyBatteryPanel series={query.data} />
      ) : active === 'stress' ? (
        <StressPanel series={query.data} />
      ) : (
        <StepsPanel series={query.data} />
      )}
    </div>
  );
}
