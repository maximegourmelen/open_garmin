import { BarSeries, TrendLine } from '../../components/charts';
import { Metric } from '../../components/data/Metric';
import { Section } from '../../components/ui/Structure';
import { formatDurationSummary } from '../../lib/format';
import { HealthMeaning, HealthMetrics } from './HealthShared';
import { dateLabel, latest, number, points, type HealthData } from './healthUtils';

const levels = [
  { key: 'rest', label: 'Rest', color: 'stress-rest', id: 'stress_rest' as const },
  { key: 'low', label: 'Low', color: 'stress-low', id: 'stress_low' as const },
  { key: 'medium', label: 'Medium', color: 'stress-med', id: 'stress_medium' as const },
  { key: 'high', label: 'High', color: 'stress-high', id: 'stress_high' as const },
];
const duration = (value: unknown) =>
  number(value) === null ? null : formatDurationSummary(number(value)! * 60);

export function StressPanel({ series }: { series: HealthData }) {
  const days = series.days;
  const today = latest(days, 'average');
  const minutes = (today?.minutes ?? {}) as Record<string, unknown>;
  return (
    <div className="space-y-10">
      <HealthMetrics>
        <Metric id="stress" label="Average" value={number(today?.average)} size="lg" />
        {levels.map((level) => (
          <Metric
            key={level.key}
            id={level.id}
            label={level.label === 'Rest' ? 'Rest time' : level.label}
            value={duration(minutes[level.key])}
          />
        ))}
      </HealthMetrics>
      <Section
        heading="Time by stress level"
        description="Hours measured in each range each day. Exercise can raise measured stress."
      >
        <BarSeries
          label="Daily stress time in hours"
          data={days.map((day) => ({
            date: dateLabel(day.date),
            ...Object.fromEntries(
              levels.map(({ key }) => [
                key,
                number((day.minutes as Record<string, unknown> | undefined)?.[key]) === null
                  ? null
                  : number((day.minutes as Record<string, unknown>)[key])! / 60,
              ]),
            ),
          }))}
          xKey="date"
          series={levels.map(({ key, label, color }) => ({ key, label, color, stackId: 'stress' }))}
          height={280}
        />
        {number(today?.average) !== null && (
          <p className="type-body text-text-2">
            Your latest average stress reading was {number(today?.average)} out of 100.
          </p>
        )}
      </Section>
      <div className="grid gap-8 lg:grid-cols-2">
        <Section heading="Average stress">
          <TrendLine label="Daily average stress" data={points(days, 'average')} size="M" />
        </Section>
        <Section heading="How to interpret it">
          <p className="type-body text-text-2">
            Garmin estimates physiological stress from heart rate variability. A workout, caffeine
            or illness can raise this reading. Compare with your own pattern.
          </p>
        </Section>
      </div>
      <HealthMeaning id="stress" />
    </div>
  );
}
