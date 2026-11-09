import { useQueries } from '@tanstack/react-query';
import { useWorkspace } from '../../app/workspace-context';
import { Dialog, Skeleton } from '../../components/ui';
import { workspaceRequest } from '../../lib/api';
import { formatDistance, formatDuration, formatPace } from '../../lib/format';
import type { ActivityDetail, Preferences } from '../../lib/types';

function HrOverlay({ activities }: { activities: ActivityDetail[] }) {
  const colors = ['accent', 'success', 'warning', 'celebrate'];
  const paths = activities.map((activity) => {
    const values = activity.streams?.hr ?? [];
    const valid = values
      .map((value, index) => ({ value, index }))
      .filter((item): item is { value: number; index: number } => item.value !== null);
    if (valid.length < 2) return '';
    return valid
      .map(
        (item, i) =>
          `${i ? 'L' : 'M'}${((item.index / Math.max(1, values.length - 1)) * 300).toFixed(1)},${(80 - ((item.value - 70) / 130) * 70).toFixed(1)}`,
      )
      .join(' ');
  });
  if (!paths.some(Boolean))
    return (
      <p className="text-sm text-text-2">
        Heart rate streams are not available for these activities.
      </p>
    );
  return (
    <div>
      <svg
        viewBox="0 0 300 90"
        className="w-full"
        role="img"
        aria-label="Heart rate comparison by relative activity time"
      >
        {paths.map(
          (path, i) =>
            path && (
              <path
                key={activities[i].id}
                d={path}
                fill="none"
                stroke={`var(--${colors[i]})`}
                strokeWidth="2"
              />
            ),
        )}
      </svg>
      <div className="flex flex-wrap gap-3 text-xs">
        {activities.map((activity, i) => (
          <span key={activity.id} style={{ color: `var(--${colors[i]})` }}>
            {activity.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function CompareActivities({
  ids,
  open,
  onClose,
  prefs,
}: {
  ids: string[];
  open: boolean;
  onClose: () => void;
  prefs?: Preferences;
}) {
  const { mode } = useWorkspace();
  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: [mode, 'activity', id],
      queryFn: () =>
        workspaceRequest<ActivityDetail>(mode, `/activities/${encodeURIComponent(id)}`),
      enabled: open,
    })),
  });
  const loading = queries.some((query) => query.isPending);
  const error = queries.find((query) => query.isError)?.error;
  const activities = queries
    .map((query) => query.data)
    .filter((item): item is ActivityDetail => Boolean(item));
  const metrics = [
    {
      label: 'Distance',
      value: (item: ActivityDetail) => formatDistance(item.distance, prefs?.units),
    },
    { label: 'Duration', value: (item: ActivityDetail) => formatDuration(item.duration) },
    {
      label: 'Pace',
      value: (item: ActivityDetail) => formatPace(item.average_speed, prefs?.units),
    },
    {
      label: 'Average HR',
      value: (item: ActivityDetail) =>
        item.average_hr == null ? '—' : `${Math.round(item.average_hr)} bpm`,
    },
    {
      label: 'Effort points',
      value: (item: ActivityDetail) =>
        item.effort_points == null ? '—' : `${Math.round(item.effort_points)}`,
    },
  ];
  const distanceDelta =
    activities.length >= 2 && activities[0].distance != null && activities[1].distance != null
      ? Math.abs(activities[0].distance - activities[1].distance)
      : null;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Compare activities"
      description="See how these sessions differ"
      className="sm:w-[min(95vw,900px)]"
    >
      {loading && <Skeleton className="h-52" />}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error.message}
        </p>
      )}
      {!loading && !error && (
        <div className="space-y-5 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr>
                <th className="pb-3 text-text-2">Metric</th>
                {activities.map((item) => (
                  <th key={item.id} className="pb-3 font-semibold">
                    {item.name}
                    <span className="block text-xs font-normal text-text-3">{item.date}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr key={metric.label} className="border-t border-border">
                  <th className="py-2 font-medium text-text-2">{metric.label}</th>
                  {activities.map((item) => (
                    <td key={item.id} className="py-2 font-num">
                      {metric.value(item)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div>
            <h3 className="mb-2 font-semibold">Heart rate</h3>
            <HrOverlay activities={activities} />
          </div>
          {distanceDelta !== null && (
            <p className="rounded-tile bg-surface-2 p-3 text-sm text-text-2">
              The first two sessions differ by {formatDistance(distanceDelta, prefs?.units)} in
              distance. Compare effort and heart rate to see how they felt.
            </p>
          )}
        </div>
      )}
    </Dialog>
  );
}
