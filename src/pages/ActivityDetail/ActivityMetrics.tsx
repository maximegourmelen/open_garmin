import { Metric } from '../../components/data/Metric';
import { Panel } from '../../components/ui/Structure';
import {
  formatDistance,
  formatDurationClock,
  formatElevation,
  formatHeartRate,
  formatPace,
  formatSpeed,
} from '../../lib/format';
import type { ActivityDetail, Preferences } from '../../lib/types';

export function ActivityMetrics({
  activity,
  prefs,
}: {
  activity: ActivityDetail;
  prefs?: Preferences;
}) {
  const units = prefs?.units ?? 'metric';
  const usesPace = ['running', 'walking', 'hiking'].includes(activity.sport);
  const swimming = activity.sport === 'swimming';
  const swimSeconds =
    activity.average_speed && activity.average_speed > 0
      ? (units === 'imperial' ? 91.44 : 100) / activity.average_speed
      : null;
  return (
    <div role="group" aria-label="Key metrics">
      <Panel className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-6">
        <Metric
          id="activity_distance"
          label="Distance"
          value={activity.distance == null ? null : formatDistance(activity.distance, units)}
        />
        <Metric
          id="activity_time"
          label="Time"
          value={activity.duration == null ? null : formatDurationClock(activity.duration)}
        />
        <Metric
          id={
            swimming ? 'activity_swim_pace' : usesPace ? 'activity_avg_pace' : 'activity_avg_speed'
          }
          label={swimming || usesPace ? 'Avg pace' : 'Avg speed'}
          value={
            activity.average_speed == null
              ? null
              : swimming && swimSeconds != null
                ? `${formatDurationClock(swimSeconds)} /100${units === 'imperial' ? 'yd' : 'm'}`
                : usesPace
                  ? formatPace(activity.average_speed, units)
                  : formatSpeed(activity.average_speed, units)
          }
        />
        <Metric
          id="activity_avg_hr"
          label="Avg HR"
          value={activity.average_hr == null ? null : formatHeartRate(activity.average_hr)}
        />
        <Metric
          id="activity_elevation"
          label="Elevation gain"
          value={activity.elevation == null ? null : formatElevation(activity.elevation, units)}
        />
        <Metric id="effort" label="Effort" value={activity.effort_points} unit="pts" />
      </Panel>
    </div>
  );
}
