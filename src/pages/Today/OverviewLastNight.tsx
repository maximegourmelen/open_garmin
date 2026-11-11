import { Sparkline } from '../../components/charts/CompactCharts';
import { Metric, MetricStrip } from '../../components/data/Metric';
import { Section } from '../../components/ui/Structure';
import { formatDurationSummary, formatNumber } from '../../lib/format';
import type { OverviewResponse } from '../../lib/types';

const statusText = (status: string) =>
  status === 'within'
    ? 'Within your usual range'
    : status === 'below'
      ? 'Below your usual range'
      : status === 'above'
        ? 'Above your usual range'
        : 'More readings needed';

export function OverviewLastNight({ data }: { data: OverviewResponse['last_night'] }) {
  const { sleep, resting_hr: restingHr, hrv, body_battery: battery } = data;
  return (
    <Section heading="Last night" className="md:col-span-12">
      <div data-tour="metric-strip">
        <MetricStrip>
          <Metric
            id="sleep_duration"
            label="Sleep"
            value={sleep.value === null ? null : formatDurationSummary(sleep.value * 60)}
            status={
              sleep.value !== null && sleep.delta !== null
                ? {
                    text:
                      sleep.delta < 0
                        ? `${formatDurationSummary(Math.abs(sleep.delta) * 60)} below sleep need`
                        : 'Met sleep need',
                  }
                : undefined
            }
            sparkline={<Sparkline values={sleep.spark} label="Sleep, last 30 days" />}
          />
          <Metric
            id="resting_hr"
            label="Resting HR"
            value={restingHr.value === null ? null : formatNumber(restingHr.value)}
            unit="bpm"
            status={restingHr.value !== null ? { text: statusText(restingHr.status) } : undefined}
            sparkline={
              <Sparkline values={restingHr.spark} label="Resting heart rate, last 30 days" />
            }
          />
          <Metric
            id="hrv"
            label="HRV"
            value={hrv.value === null ? null : formatNumber(hrv.value)}
            unit="ms"
            status={hrv.value !== null ? { text: statusText(hrv.status) } : undefined}
            sparkline={<Sparkline values={hrv.spark} label="HRV, last 30 days" />}
          />
          <Metric
            id="body_battery"
            label="Body Battery"
            value={battery.value === null ? null : formatNumber(battery.value)}
            status={battery.value !== null ? { text: statusText(battery.status) } : undefined}
            caption="At wake"
            sparkline={
              <Sparkline values={battery.spark} label="Body Battery at wake, last 30 days" />
            }
          />
        </MetricStrip>
      </div>
    </Section>
  );
}
