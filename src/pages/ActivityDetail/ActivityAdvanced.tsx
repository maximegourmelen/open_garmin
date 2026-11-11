import { MetricRow } from '../../components/data';
import { Disclosure } from '../../components/ui';
import { formatDuration } from '../../lib/format';
import type { ActivityDetail } from '../../lib/types';

export function DeeperSection({ activity }: { activity: ActivityDetail }) {
  return (
    <Disclosure id={`activity-${activity.id}`}>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="mb-2 font-semibold">Efficiency</h3>
          <MetricRow label="Efficiency factor" value={activity.efficiency?.ef} />
          <MetricRow
            label="Pace / HR decoupling"
            value={activity.efficiency?.decoupling_pct}
            unit="%"
          />
          <h3 className="mb-2 mt-4 font-semibold">Running form</h3>
          {activity.running_form ? (
            Object.entries(activity.running_form).map(([key, value]) => (
              <MetricRow key={key} label={key.replaceAll('_', ' ')} value={value} />
            ))
          ) : (
            <p className="text-sm text-text-2">No running form samples.</p>
          )}
        </div>
        <div>
          <h3 className="mb-2 font-semibold">Best efforts</h3>
          {activity.best_efforts.length ? (
            activity.best_efforts.map((effort) => (
              <MetricRow
                key={effort.kind}
                label={effort.label}
                value={formatDuration(effort.time_s)}
              />
            ))
          ) : (
            <p className="text-sm text-text-2">No best efforts calculated.</p>
          )}
          <h3 className="mb-2 mt-4 font-semibold">Watch metrics</h3>
          {activity.session_metrics.map((metric) => (
            <MetricRow
              key={metric.name}
              label={metric.name}
              value={metric.value}
              unit={metric.unit}
            />
          ))}
        </div>
      </div>
    </Disclosure>
  );
}
