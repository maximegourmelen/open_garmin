import { Link } from 'react-router-dom';
import { Sparkline } from '../../components/charts';
import { MetricLabel } from '../../components/data/Metric';
import { DataTable } from '../../components/ui';
import { Section } from '../../components/ui/Structure';
import type { TrendsResponse } from '../../lib/types';
import { signalDelta, signalNames, signalValue, statusText } from './trendFormat';

type Signal = TrendsResponse['signals'][number];
export function SignalsSection({ signals }: { signals: Signal[] }) {
  return (
    <Section heading="Fitness signals" description="Recent readings compared with earlier weeks.">
      <div className="divide-y divide-border border-y border-border md:hidden">
        {signals.map((row) => (
          <div key={row.id} className="space-y-2 py-4">
            <div className="flex items-start justify-between gap-3">
              <MetricLabel
                id={signalNames[row.id]?.metric ?? 'usual_range'}
                label={signalNames[row.id]?.label ?? row.id}
              />
              <span className="type-caption text-text-2">{statusText[row.status]}</span>
            </div>
            <div className="flex items-center justify-between gap-3 type-body tabular-nums">
              <span>
                {signalValue(row, row.before)} → {signalValue(row, row.after)}
              </span>
              <Sparkline values={row.spark} label={`${signalNames[row.id]?.label} trend`} />
            </div>
            <p className="type-caption text-text-2">{signalDelta(row)}</p>
          </div>
        ))}
      </div>
      <div className="hidden md:block">
        <DataTable
          caption="Fitness signals"
          keyFor={(row) => row.id}
          rows={signals}
          columns={[
            {
              key: 'signal',
              label: 'Signal',
              value: (row) => (
                <MetricLabel
                  id={signalNames[row.id]?.metric ?? 'usual_range'}
                  label={signalNames[row.id]?.label ?? row.id}
                />
              ),
            },
            {
              key: 'change',
              label: 'Then → now',
              value: (row) => (
                <span className="whitespace-nowrap tabular-nums">
                  {signalValue(row, row.before)} → {signalValue(row, row.after)}
                </span>
              ),
            },
            { key: 'delta', label: 'Change', value: (row) => signalDelta(row) },
            { key: 'status', label: 'Status', value: (row) => statusText[row.status] },
            {
              key: 'spark',
              label: 'Trend',
              value: (row) => (
                <Sparkline values={row.spark} label={`${signalNames[row.id]?.label} trend`} />
              ),
            },
            {
              key: 'details',
              label: '',
              value: (row) => (
                <Link
                  to="/guide"
                  aria-label={`Read about ${signalNames[row.id]?.label}`}
                  className="text-accent"
                >
                  →
                </Link>
              ),
            },
          ]}
        />
      </div>
    </Section>
  );
}
