import { ZoneBars } from '../../components/charts';
import { MetricLabel } from '../../components/data/Metric';
import type { ActivityDetail } from '../../lib/types';

const benefits: Record<string, string> = {
  RECOVERY: 'Recovery',
  AEROBIC_BASE: 'Base',
  TEMPO: 'Tempo',
  LACTATE_THRESHOLD: 'Threshold',
  VO2MAX: 'VO2 max',
  ANAEROBIC_CAPACITY: 'Anaerobic',
  SPRINT: 'Sprint',
};

function effect(value: number | null) {
  if (value == null) return 'No reading';
  if (value < 1) return 'No effect';
  if (value < 2) return 'Minor';
  if (value < 3) return 'Maintaining';
  if (value < 4) return 'Improving';
  return 'Highly improving';
}

export function ActivityEffort({ activity }: { activity: ActivityDetail }) {
  return (
    <section
      aria-label="Effort"
      className="space-y-5 rounded-card border border-border bg-surface p-5"
    >
      <h2 className="type-heading">
        <MetricLabel id="effort" label="Effort" />
      </h2>
      {activity.zone_details?.minutes ? (
        <ZoneBars minutes={activity.zone_details.minutes} />
      ) : (
        <p className="type-body text-text-2">
          Heart rate zones were not available for this activity.
        </p>
      )}
      <div className="space-y-2 border-t border-border pt-4 type-body text-text-2">
        <p>
          <MetricLabel id="training_effect" label="Aerobic training effect" />:{' '}
          {activity.aerobic_te ?? '—'} · {effect(activity.aerobic_te)}
        </p>
        <p>
          <MetricLabel id="training_effect" label="Anaerobic training effect" />:{' '}
          {activity.anaerobic_te ?? '—'} · {effect(activity.anaerobic_te)}
        </p>
        {activity.te_label && (
          <p>
            Primary benefit:{' '}
            <strong className="text-text">
              {benefits[activity.te_label] ?? activity.te_label.toLowerCase().replaceAll('_', ' ')}
            </strong>
          </p>
        )}
        {activity.body_battery_impact != null && (
          <p>
            Body Battery: {activity.body_battery_impact > 0 ? '+' : ''}
            {activity.body_battery_impact}
          </p>
        )}
      </div>
    </section>
  );
}
