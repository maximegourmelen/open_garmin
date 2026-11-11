import { Link } from 'react-router-dom';
import { TrendLine } from '../../components/charts';
import { Drawer } from '../../components/ui/Overlays';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui';
import { glossary } from '../../content/glossary';
import type { MetricId } from '../../content/glossary';
import { useWorkspaceQuery } from '../../lib/queries';
import type { MetricSummary } from '../../lib/types';
import { formatMetricRange, formatMetricValue } from './metricFormat';

const related: Partial<Record<MetricId, MetricId[]>> = {
  sleep_duration: ['sleep_need', 'hrv', 'body_battery'],
  resting_hr: ['hrv', 'sleep_duration', 'stress'],
  hrv: ['resting_hr', 'sleep_duration', 'stress'],
  body_battery: ['sleep_duration', 'stress', 'hrv'],
  stress: ['hrv', 'body_battery', 'sleep_duration'],
  active_minutes: ['activity_time', 'effort', 'load'],
  effort: ['hr_zones', 'load', 'training_effect'],
};

function dateLabel(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function MetricDrawer({
  id,
  onClose,
  onSelect,
}: {
  id: MetricId;
  onClose: () => void;
  onSelect: (id: MetricId) => void;
}) {
  const entry = glossary[id];
  const query = useWorkspaceQuery<MetricSummary>(
    ['metric', id, 30],
    `/metrics/${id}/summary?days=30`,
  );
  const data = query.data;
  const hasReadings = data?.series.some((point) => point.value !== null);
  return (
    <Drawer open onOpenChange={(open) => !open && onClose()} title={entry.title}>
      <div className="space-y-8">
        <p className="type-body text-text-2">{entry.what}</p>
        {query.isPending ? (
          <div role="status" aria-label={`Loading ${entry.title}`} className="space-y-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-32" />
          </div>
        ) : query.isError ? (
          <ErrorState message={query.error.message} retry={() => void query.refetch()} />
        ) : data ? (
          <>
            <dl className="grid gap-5 border-y border-border py-5">
              <div>
                <dt className="type-caption text-text-2">Your number</dt>
                <dd className="mt-1 num-lg tabular-nums text-text">
                  {data.latest ? formatMetricValue(id, data.latest.value, data.unit) : '—'}
                </dd>
                <dd className="type-caption text-text-3">
                  {data.value_label ? `${data.value_label} · ` : ''}
                  {data.latest ? dateLabel(data.latest.date) : 'No reading yet'}
                </dd>
              </div>
              <div>
                <dt className="type-caption text-text-2">Your usual range</dt>
                <dd className="mt-1 type-heading tabular-nums text-text">
                  {data.usual_range
                    ? formatMetricRange(id, data.usual_range.low, data.usual_range.high, data.unit)
                    : 'Not enough readings yet'}
                </dd>
                <dd className="type-caption text-text-3">
                  {data.usual_range
                    ? `Median of ${data.usual_range.n} readings ± typical variation`
                    : 'Needs at least 14 readings in the last 30 days'}
                </dd>
              </div>
            </dl>
            {hasReadings ? (
              <TrendLine
                label={entry.title}
                data={data.series.map((point) => ({
                  date: dateLabel(point.date),
                  value: point.value,
                }))}
                band={data.usual_range ? [data.usual_range.low, data.usual_range.high] : undefined}
                size="S"
                unit={data.unit}
              />
            ) : (
              <EmptyState
                title="No readings yet"
                text="This trend will appear after your watch records and syncs this metric."
              />
            )}
          </>
        ) : null}
        <section>
          <h3 className="type-heading">How to read it</h3>
          <p className="mt-2 type-body text-text-2">{entry.howToRead}</p>
        </section>
        <section>
          <h3 className="type-heading">Where it comes from</h3>
          <p className="mt-2 type-body text-text-2">
            {entry.source === 'Garmin'
              ? 'Garmin · Reported by your watch.'
              : entry.source === 'Calculated'
                ? 'Calculated by Open Garmin from your imported readings.'
                : 'Garmin when available; otherwise calculated from your imported readings.'}
          </p>
          {'methodId' in entry && entry.methodId && (
            <Link
              to={`/guide/methods#${entry.methodId}`}
              onClick={onClose}
              className="mt-2 inline-block type-body text-accent hover:underline"
            >
              How we use it
            </Link>
          )}
        </section>
        {related[id]?.length ? (
          <section>
            <h3 className="type-heading">Related</h3>
            <div className="mt-2 flex flex-wrap gap-3">
              {related[id]?.map((relatedId) => (
                <button
                  key={relatedId}
                  type="button"
                  onClick={() => onSelect(relatedId)}
                  className="type-body text-accent hover:underline"
                >
                  {glossary[relatedId].title}
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </Drawer>
  );
}
