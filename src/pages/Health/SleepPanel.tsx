import { BarSeries, ClockScatter, StageBar } from '../../components/charts';
import { Metric } from '../../components/data/Metric';
import { EmptyState } from '../../components/ui';
import { Section } from '../../components/ui/Structure';
import { formatDurationSummary } from '../../lib/format';
import { HealthMeaning, HealthMetrics } from './HealthShared';
import { dateLabel, latest, number, string, type HealthData } from './healthUtils';

type Stage = { minutes?: number | null; optimal_range_pct?: [number, number] | null };
const stages = [
  { key: 'deep', label: 'Deep', color: 'sleep-deep' },
  { key: 'light', label: 'Light', color: 'sleep-light' },
  { key: 'rem', label: 'REM', color: 'sleep-rem' },
  { key: 'awake', label: 'Awake', color: 'sleep-awake' },
];
function clock(value: unknown) {
  const date = string(value) ? new Date(string(value)!) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : '—';
}

export function SleepPanel({ series }: { series: HealthData }) {
  const days = series.days;
  const night = latest(days, 'minutes');
  if (!night)
    return (
      <EmptyState
        title="No sleep readings yet"
        text="Sleep data appears here after your watch records a night."
      />
    );
  const stageData = (night.stages ?? {}) as Record<string, Stage>;
  const rhythm = series.summary.bedtime_rhythm as
    | { usual_minutes_after_18?: number | null; band_minutes?: number | null; sentence?: string }
    | undefined;
  const usual =
    rhythm?.usual_minutes_after_18 != null && rhythm.band_minutes != null
      ? ([
          rhythm.usual_minutes_after_18 + 360 - rhythm.band_minutes,
          rhythm.usual_minutes_after_18 + 360 + rhythm.band_minutes,
        ] as [number, number])
      : undefined;
  const bars = days.map((day) => {
    const parts = (day.stages ?? {}) as Record<string, Stage>;
    return {
      date: dateLabel(day.date),
      ...Object.fromEntries(
        stages.map(({ key }) => [
          key,
          number(parts[key]?.minutes) === null ? null : number(parts[key]?.minutes)! / 60,
        ]),
      ),
    };
  });
  return (
    <div className="space-y-10">
      <HealthMetrics>
        <Metric
          id="sleep_duration"
          label="Duration"
          value={
            number(night.minutes) === null
              ? null
              : formatDurationSummary(number(night.minutes)! * 60)
          }
          size="lg"
          caption={`Need ${number(night.need_minutes) === null ? '—' : formatDurationSummary(number(night.need_minutes)! * 60)}`}
        />
        <Metric id="sleep_score" label="Sleep score" value={number(night.score)} caption="Garmin" />
        <Metric id="sleep_bedtime" label="Bedtime" value={clock(night.start)} />
        <Metric id="sleep_wake" label="Wake" value={clock(night.end)} />
        <Metric id="sleep_awakenings" label="Awakenings" value={number(night.awake_count)} />
      </HealthMetrics>
      <Section
        heading="Sleep duration"
        description="Hours asleep each night. The dashed line shows your latest sleep need."
        footnote="Missing nights are gaps; the stages add up to the recorded night."
      >
        <BarSeries
          label="Sleep stages in hours"
          data={bars}
          xKey="date"
          series={stages
            .filter(({ key }) => key !== 'awake')
            .map(({ key, label, color }) => ({ key, label, color, stackId: 'sleep' }))}
          goal={number(night.need_minutes) === null ? undefined : number(night.need_minutes)! / 60}
          height={280}
        />
        <p className="type-body text-text-2">{string(night.sentence)}</p>
      </Section>
      <div className="grid gap-8 lg:grid-cols-2">
        <Section heading={`Stages · ${dateLabel(night.date)}`}>
          <StageBar
            stages={stages
              .filter(({ key }) => number(stageData[key]?.minutes) !== null)
              .map(({ key, label, color }) => ({
                key,
                label,
                color,
                minutes: number(stageData[key]?.minutes)!,
              }))}
            optimal={stages
              .filter(({ key }) => stageData[key]?.optimal_range_pct)
              .map(({ key }) => ({
                key,
                low: stageData[key].optimal_range_pct![0],
                high: stageData[key].optimal_range_pct![1],
              }))}
            optimalUnit="%"
          />
          <p className="type-body text-text-2">
            {string(night.sentence) ?? 'Each stage contributes to a full night of sleep.'}
          </p>
        </Section>
        <Section
          heading="Bedtime and wake time"
          description={rhythm?.sentence ?? 'Your usual window will appear after more nights.'}
        >
          <ClockScatter
            label="Bedtime"
            data={days.map((day) => ({
              date: day.date,
              minutes_from_noon: number(day.bedtime_minutes_from_noon),
            }))}
            usual={usual}
          />
          <ClockScatter
            label="Wake time"
            data={days.map((day) => ({
              date: day.date,
              minutes_from_noon: number(day.wake_minutes_from_noon),
            }))}
          />
        </Section>
      </div>
      <HealthMeaning id="sleep_duration" />
    </div>
  );
}
