import { BarSeries } from '../../components/charts';
import { Metric } from '../../components/data/Metric';
import { Section } from '../../components/ui/Structure';
import { HealthMeaning, HealthMetrics } from './HealthShared';
import { dateLabel, latest, number, whole, type HealthData, type HealthDay } from './healthUtils';

function weekStart(date: string) {
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}
function intensity(day: HealthDay) {
  const moderate = number(day.moderate_minutes);
  const vigorous = number(day.vigorous_minutes);
  return moderate === null && vigorous === null ? null : (moderate ?? 0) + 2 * (vigorous ?? 0);
}

export function StepsPanel({ series }: { series: HealthData }) {
  const days = series.days;
  const today = latest(days, 'steps');
  const recent = days
    .slice(-7)
    .map((day) => number(day.steps))
    .filter((value): value is number => value !== null);
  const average = recent.length
    ? Math.round(recent.reduce((sum, value) => sum + value, 0) / recent.length)
    : null;
  const currentWeek = weekStart(series.to);
  const thisWeek = days
    .filter((day) => weekStart(day.date) === currentWeek)
    .reduce((sum, day) => sum + (intensity(day) ?? 0), 0);
  const weekly = Object.values(
    days.reduce<Record<string, { date: string; value: number }>>((result, day) => {
      const start = weekStart(day.date);
      (result[start] ??= { date: start, value: 0 }).value += intensity(day) ?? 0;
      return result;
    }, {}),
  );
  return (
    <div className="space-y-10">
      <HealthMetrics>
        <Metric
          id="steps"
          label="Today"
          value={number(today?.steps) === null ? null : whole(today?.steps)}
          size="lg"
          caption={`Goal ${whole(today?.goal)}`}
        />
        <Metric id="steps" label="7-day average" value={average === null ? null : whole(average)} />
        <Metric id="steps_floors" label="Floors" value={number(today?.floors_up)} />
        <Metric
          id="active_minutes"
          label="Intensity minutes this week"
          value={thisWeek}
          unit="min"
        />
      </HealthMetrics>
      <Section
        heading="Steps over time"
        description="Your daily steps compared with the current Garmin goal."
      >
        <BarSeries
          label="Daily steps"
          data={days.map((day) => ({ date: dateLabel(day.date), steps: number(day.steps) }))}
          xKey="date"
          series={[{ key: 'steps', label: 'Steps', color: 'data-1' }]}
          goal={number(today?.goal) ?? undefined}
          height={280}
        />
        {number(today?.steps) !== null && (
          <p className="type-body text-text-2">
            Your latest day recorded {whole(today?.steps)} steps against a goal of{' '}
            {whole(today?.goal)}.
          </p>
        )}
      </Section>
      <div className="grid gap-8 lg:grid-cols-2">
        <Section
          heading="Intensity minutes by week"
          description="Moderate minutes plus vigorous minutes counted twice."
        >
          <BarSeries
            label="Weekly intensity minutes"
            data={weekly.map((week) => ({ date: dateLabel(week.date), value: week.value }))}
            xKey="date"
            series={[{ key: 'value', label: 'Intensity minutes', color: 'data-1' }]}
            goal={number(today?.intensity_goal) ?? undefined}
            height={200}
          />
        </Section>
        <Section heading="Goal context">
          <p className="type-body text-text-2">
            Your step goal may adapt in Garmin Connect. Intensity minutes count time spent moving at
            moderate or vigorous effort.
          </p>
        </Section>
      </div>
      <HealthMeaning id="steps" />
    </div>
  );
}
