import { Sparkline } from '../../components/charts';
import { Card } from '../../components/ui';
import type { DeeperResponse } from '../../lib/types';

const measures = [
  { key: 'cadence_spm', label: 'Cadence', unit: 'spm' },
  { key: 'stride_length_m', label: 'Stride length', unit: 'm' },
  { key: 'ground_contact_ms', label: 'Ground contact', unit: 'ms' },
  { key: 'vertical_oscillation_cm', label: 'Vertical oscillation', unit: 'cm' },
  { key: 'vertical_ratio_pct', label: 'Vertical ratio', unit: '%' },
] as const;

export function RunningFormTrends({ rows }: { rows: DeeperResponse['running_form'] }) {
  if (!rows.some((row) => Object.values(row).some((value) => typeof value === 'number')))
    return null;
  return (
    <Card title="Running form trends">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {measures.map(({ key, label, unit }) => (
          <div key={key} className="rounded-tile bg-surface-2 p-3">
            <p className="text-sm text-text-2">{label}</p>
            <p className="font-display text-xl font-bold">
              {[...rows].reverse().find((row) => row[key] !== null)?.[key] ?? '—'} {unit}
            </p>
            <Sparkline label={`${label} trend`} values={rows.map((row) => row[key])} />
          </div>
        ))}
      </div>
    </Card>
  );
}
