import { MetricLabel } from '../../components/data/Metric';
import { DataTable } from '../../components/ui';
import { Section } from '../../components/ui/Structure';
import type { WeeklyReport } from '../../lib/types';
import { timeText } from './trendFormat';

const healthRows = [
  { key: 'sleep', label: 'Sleep', metric: 'sleep_duration', unit: 'min' },
  { key: 'resting_hr', label: 'Resting heart rate', metric: 'resting_hr', unit: 'bpm' },
  { key: 'hrv', label: 'HRV', metric: 'hrv', unit: 'ms' },
] as const;

export function ReportHealth({ health }: { health: WeeklyReport['health'] }) {
  return (
    <Section
      heading="Health readings"
      description="Weekly averages compared with the previous week."
    >
      <DataTable
        caption="Health averages this week and last week"
        rows={[...healthRows]}
        keyFor={(row) => row.key}
        columns={[
          {
            key: 'reading',
            label: 'Reading',
            value: (row) => <MetricLabel id={row.metric} label={row.label} />,
          },
          {
            key: 'this',
            label: 'This week',
            value: (row) => healthText(row.key, health[row.key].current),
          },
          {
            key: 'previous',
            label: 'Previous week',
            value: (row) => healthText(row.key, health[row.key].previous),
          },
          {
            key: 'change',
            label: 'Change',
            value: (row) =>
              healthDelta(health[row.key].current, health[row.key].previous, row.unit),
          },
        ]}
      />
    </Section>
  );
}

function healthText(key: 'sleep' | 'resting_hr' | 'hrv', value: number | null) {
  if (value === null) return '—';
  if (key === 'sleep') return timeText(value);
  return `${Math.round(value)} ${key === 'resting_hr' ? 'bpm' : 'ms'}`;
}
function healthDelta(current: number | null, previous: number | null, unit: string) {
  if (current === null || previous === null) return '—';
  const change = current - previous;
  return `${change > 0 ? '▲' : change < 0 ? '▼' : '—'} ${Math.abs(Math.round(change))} ${unit}`;
}
