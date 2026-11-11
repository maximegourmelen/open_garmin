import { useState } from 'react';
import { SegmentedControl } from '../../components/ui/Controls';
import type { Units } from '../../lib/format';
import type { ActivityDetail } from '../../lib/types';

const colors = ['var(--z1)', 'var(--z2)', 'var(--z3)', 'var(--z4)'];

export function ComparisonCharts({
  activities,
  units,
}: {
  activities: ActivityDetail[];
  units: Units;
}) {
  const [metric, setMetric] = useState<'hr' | 'pace'>('hr');
  const series = activities.map((activity) =>
    metric === 'hr'
      ? (activity.streams?.hr ?? [])
      : (activity.streams?.speed ?? []).map((speed) =>
          speed && speed > 0 ? (units === 'metric' ? 1000 : 1609.344) / speed : null,
        ),
  );
  const observed = series
    .flatMap((values) => values)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const low = Math.min(...observed);
  const high = Math.max(...observed);
  const span = Math.max(1, high - low);
  const points = series.map((values) => {
    const paths: string[] = [];
    let path = '';
    values.forEach((value, index) => {
      if (value === null || !Number.isFinite(value)) {
        if (path) paths.push(path);
        path = '';
      } else {
        const x = 28 + (index / Math.max(1, values.length - 1)) * 450;
        const y = 105 - ((value - low) / span) * 86;
        path += `${path ? ' L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
      }
    });
    if (path) paths.push(path);
    return paths;
  });
  return (
    <section className="space-y-4" aria-label="Comparison charts">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="type-heading">Over the activity</h2>
        <SegmentedControl
          label="Comparison metric"
          value={metric}
          onChange={(value) => setMetric(value as 'hr' | 'pace')}
          options={[
            { value: 'hr', label: 'Heart rate' },
            { value: 'pace', label: 'Pace' },
          ]}
        />
      </div>
      {observed.length < 2 ? (
        <p className="type-body text-text-2">
          {metric === 'hr' ? 'Heart rate' : 'Pace'} samples are not available for these activities.
        </p>
      ) : (
        <div className="rounded-card border border-border bg-surface p-4">
          <svg
            viewBox="0 0 500 125"
            className="w-full"
            role="img"
            aria-label={`${metric === 'hr' ? 'Heart rate' : 'Pace'} over relative activity time`}
          >
            <line x1="28" x2="478" y1="105" y2="105" stroke="var(--border)" />
            {points.map((paths, index) =>
              paths.map((path, segment) => (
                <path
                  key={`${activities[index].id}-${segment}`}
                  d={path}
                  fill="none"
                  stroke={colors[index]}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )),
            )}
            <text x="4" y="24" fill="var(--text-2)" fontSize="10">
              {Math.round(high)}
            </text>
            <text x="4" y="105" fill="var(--text-2)" fontSize="10">
              {Math.round(low)}
            </text>
          </svg>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 type-caption text-text-2">
            {activities.map((activity, index) => (
              <span key={activity.id} className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: colors[index] }} />
                {activity.name}
              </span>
            ))}
          </div>
          <p className="mt-2 type-caption text-text-3">
            Each line spans its full activity.{' '}
            {metric === 'pace'
              ? `Pace is shown in seconds per ${units === 'metric' ? 'km' : 'mi'}; lower is faster.`
              : 'Heart rate is shown in bpm.'}
          </p>
        </div>
      )}
    </section>
  );
}
