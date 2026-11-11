import { Metric, MetricStrip } from '../../components/data/Metric';
import { formatDistance, formatDurationSummary, formatNumber } from '../../lib/format';
import type { ActivityList, Preferences } from '../../lib/types';

export function ActivityStats({
  totals,
  units,
}: {
  totals?: ActivityList['totals'];
  units?: Preferences['units'];
}) {
  return (
    <MetricStrip>
      <Metric
        id="activity_count"
        label="Activities"
        value={totals ? formatNumber(totals.sessions) : null}
      />
      <Metric
        id="activity_time"
        label="Activity time"
        value={totals ? formatDurationSummary(totals.duration) : null}
      />
      <Metric
        id="activity_distance"
        label="Distance"
        value={totals ? formatDistance(totals.distance, units) : null}
      />
      <Metric
        id="effort"
        label="Effort"
        value={totals ? formatNumber(totals.effort_points) : null}
        unit="pts"
      />
    </MetricStrip>
  );
}
