import { useQueries } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../../app/workspace-context';
import { MetricLabel } from '../../components/data/Metric';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui';
import { PageHeader } from '../../layout/PageHeader';
import { workspaceRequest } from '../../lib/api';
import {
  formatDateTitle,
  formatDistance,
  formatDurationClock,
  formatHeartRate,
  formatNumber,
  formatPace,
  formatSpeed,
} from '../../lib/format';
import { usePreferences } from '../../lib/queries';
import type { ActivityDetail } from '../../lib/types';
import { ComparisonCharts } from './ComparisonCharts';

export default function CompareActivitiesPage() {
  const [params] = useSearchParams();
  const { mode } = useWorkspace();
  const prefs = usePreferences();
  const ids = [...new Set((params.get('ids') ?? '').split(',').filter(Boolean))].slice(0, 5);
  const valid = ids.length >= 2 && ids.length <= 4;
  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: [mode, 'activity', id],
      queryFn: () =>
        workspaceRequest<ActivityDetail>(mode, `/activities/${encodeURIComponent(id)}`),
      enabled: valid,
    })),
  });
  const loading = valid && queries.some((query) => query.isPending);
  const error = queries.find((query) => query.isError)?.error;
  const activities = queries
    .map((query) => query.data)
    .filter((item): item is ActivityDetail => Boolean(item));
  const units = prefs.data?.units ?? 'metric';
  const rows = [
    {
      label: 'Distance',
      value: (activity: ActivityDetail) => formatDistance(activity.distance, units),
    },
    {
      label: 'Activity time',
      id: 'activity_time' as const,
      value: (activity: ActivityDetail) => formatDurationClock(activity.duration),
    },
    {
      label: 'Pace / speed',
      value: (activity: ActivityDetail) =>
        ['running', 'walking', 'hiking'].includes(activity.sport)
          ? formatPace(activity.average_speed, units)
          : formatSpeed(activity.average_speed, units),
    },
    { label: 'Avg HR', value: (activity: ActivityDetail) => formatHeartRate(activity.average_hr) },
    {
      label: 'Effort',
      id: 'effort' as const,
      value: (activity: ActivityDetail) =>
        activity.effort_points === null ? '—' : `${formatNumber(activity.effort_points)} pts`,
    },
  ];
  return (
    <div className="space-y-8">
      <PageHeader
        title="Compare activities"
        description="See how two to four activities differ in time, distance, effort, heart rate and pace."
        back={{ href: '/activities', label: 'Activities' }}
      />
      {!valid ? (
        <EmptyState
          title="Choose two to four activities"
          text="Return to Activities, select Compare, then choose the activities you want to inspect."
        />
      ) : loading ? (
        <div role="status" aria-label="Loading comparison">
          <Skeleton className="h-60" />
        </div>
      ) : error ? (
        <ErrorState
          message={error.message}
          retry={() => queries.forEach((query) => void query.refetch())}
        />
      ) : (
        <>
          <p className="type-caption text-text-2 md:hidden">
            Swipe the table to see every activity.
          </p>
          <section aria-label="Side-by-side activity comparison" className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left type-body">
              <caption className="sr-only">Activity metrics side by side</caption>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="w-40 py-4 font-normal text-text-2">
                    Metric
                  </th>
                  {activities.map((activity) => (
                    <th key={activity.id} scope="col" className="min-w-36 px-3 py-4">
                      <Link
                        to={`/activities/${activity.id}`}
                        className="font-medium text-text hover:text-accent"
                      >
                        {activity.name}
                      </Link>
                      <span className="mt-1 block type-caption font-normal text-text-2">
                        {formatDateTitle(activity.date)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-b border-border">
                    <th scope="row" className="py-4 font-normal text-text-2">
                      {'id' in row && row.id ? (
                        <MetricLabel id={row.id} label={row.label} />
                      ) : (
                        row.label
                      )}
                    </th>
                    {activities.map((activity) => (
                      <td key={activity.id} className="px-3 py-4 tabular-nums text-text">
                        {row.value(activity)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <ComparisonCharts activities={activities} units={units} />
        </>
      )}
    </div>
  );
}
