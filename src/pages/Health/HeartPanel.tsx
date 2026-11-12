import { RangeBars, TrendLine } from '../../components/charts';
import { Metric } from '../../components/data/Metric';
import { Section } from '../../components/ui/Structure';
import { useWorkspaceQuery } from '../../lib/queries';
import type { MetricSummary } from '../../lib/types';
import { HealthMeaning, HealthMetrics } from './HealthShared';
import { dateLabel, latest, number, points, string, type HealthData } from './healthUtils';

export function HeartPanel({ series }: { series: HealthData }) {
  const days = series.days;
  const resting = latest(days, 'resting_hr');
  const hrv = latest(days, 'hrv');
  const restingSummary = useWorkspaceQuery<MetricSummary>(
    ['metric', 'resting_hr', 30],
    '/metrics/resting_hr/summary?days=30',
  );
  const band =
    number(hrv?.balanced_low) !== null && number(hrv?.balanced_high) !== null
      ? ([number(hrv?.balanced_low)!, number(hrv?.balanced_high)!] as [number, number])
      : undefined;
  const usual = restingSummary.data?.usual_range;
  return (
    <div className="space-y-10">
      <HealthMetrics>
        <Metric
          id="resting_hr"
          label="Resting HR"
          value={number(resting?.resting_hr)}
          unit="bpm"
          size="lg"
          caption={resting ? dateLabel(resting.date) : undefined}
        />
        <Metric id="hrv" label="HRV last night" value={number(hrv?.hrv)} unit="ms" />
        <Metric id="hrv_status" label="HRV 7-day avg" value={number(hrv?.hrv_weekly)} unit="ms" />
        <Metric
          id="hrv_status"
          label="HRV status"
          value={string(hrv?.hrv_status) ?? '—'}
          caption="Garmin"
        />
      </HealthMetrics>
      <Section
        heading="Resting heart rate"
        description="Compare with your own usual range over time."
      >
        <TrendLine
          label="Resting heart rate"
          data={points(days, 'resting_hr')}
          band={usual ? [usual.low, usual.high] : undefined}
          size="L"
          unit="bpm"
        />
        {number(resting?.resting_hr) !== null && (
          <p className="type-body text-text-2">
            Latest resting heart rate: {number(resting?.resting_hr)} bpm
            {usual
              ? `; your usual range is ${Math.round(usual.low)}–${Math.round(usual.high)} bpm.`
              : '.'}
          </p>
        )}
      </Section>
      <div className="grid gap-8 lg:grid-cols-2">
        <Section
          heading="Heart rate variability"
          description="Nightly HRV with Garmin's balanced band."
        >
          <TrendLine label="HRV" data={points(days, 'hrv')} band={band} size="M" unit="ms" />
          <TrendLine
            label="HRV 7-day average"
            data={points(days, 'hrv_weekly')}
            size="S"
            unit="ms"
          />
        </Section>
        <Section heading="Daily heart rate range">
          <RangeBars
            label="Minimum and maximum heart rate"
            data={days.slice(-14).map((day) => ({
              date: day.date,
              low: number(day.hr_min),
              high: number(day.hr_max),
            }))}
          />
        </Section>
      </div>
      <HealthMeaning id="resting_hr" />
    </div>
  );
}
