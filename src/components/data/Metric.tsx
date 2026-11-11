import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Panel } from '../ui/Structure';
import type { MetricId } from '../../content/glossary';
import { useMetricDrawer } from '../../features/metric-drawer/metric-drawer-context';

export function MetricLabel({
  id,
  label,
  onAbout,
}: {
  id: MetricId;
  label: string;
  onAbout?: () => void;
}) {
  const openMetric = useMetricDrawer();
  const action = openMetric ? () => openMetric(id) : onAbout;
  return action ? (
    <button
      type="button"
      onClick={action}
      aria-label={`About ${label}`}
      data-metric-id={id}
      className="inline-flex items-center gap-1 type-label text-text-2 hover:text-text"
    >
      <span>{label}</span>
      <span aria-hidden="true" className="type-caption text-text-3">
        ⓘ
      </span>
    </button>
  ) : (
    <span data-metric-id={id} className="type-label text-text-2">
      {label}
    </span>
  );
}

export function Delta({
  value,
  unit = '',
  good = 'neutral',
  label = 'vs usual',
}: {
  value: number | null;
  unit?: string;
  good?: 'up' | 'down' | 'neutral';
  label?: string;
}) {
  if (value === null) return null;
  const favorable = (good === 'up' && value > 0) || (good === 'down' && value < 0);
  const caution = good !== 'neutral' && value !== 0 && !favorable;
  const arrow = value > 0 ? '▲' : value < 0 ? '▼' : '—';
  return (
    <span
      className={cn(
        'type-caption',
        favorable ? 'text-positive' : caution ? 'text-caution' : 'text-text-2',
      )}
      aria-label={`${value > 0 ? 'Up' : value < 0 ? 'Down' : 'No change'} ${Math.abs(value)} ${unit} ${label}`.trim()}
    >
      {arrow} {Math.abs(value)}
      {unit ? ` ${unit}` : ''} {label}
    </span>
  );
}

export function StatusDot({
  text,
  tone = 'neutral',
}: {
  text: string;
  tone?: 'neutral' | 'caution' | 'positive';
}) {
  return (
    <span className="inline-flex items-center gap-2 type-caption text-text-2">
      <span
        aria-hidden="true"
        className={cn(
          'size-1.5 rounded-full',
          tone === 'positive' ? 'bg-positive' : tone === 'caution' ? 'bg-caution' : 'bg-text-3',
        )}
      />
      {text}
    </span>
  );
}

export function Metric({
  id,
  label,
  value,
  unit,
  delta,
  status,
  sparkline,
  caption,
  size = 'md',
  onAbout,
}: {
  id: MetricId;
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  delta?: { value: number | null; unit?: string; good?: 'up' | 'down' | 'neutral'; label?: string };
  status?: { text: string; tone?: 'neutral' | 'caution' | 'positive' };
  sparkline?: ReactNode;
  caption?: string;
  size?: 'lg' | 'md';
  onAbout?: () => void;
}) {
  const missing = value === null || value === undefined || value === '';
  return (
    <div className="min-w-0 space-y-2">
      <MetricLabel id={id} label={label} onAbout={onAbout} />
      <div className="flex items-end gap-2">
        <div
          className={cn(
            'tabular-nums',
            size === 'lg' ? 'num-xl' : 'num-lg',
            missing && 'text-text-3',
          )}
        >
          {missing ? '—' : value}
          {!missing && unit && (
            <span className="ml-1 align-baseline text-[0.55em] font-normal text-text-2">
              {unit}
            </span>
          )}
        </div>
        {sparkline && <div className="mb-1 ml-auto">{sparkline}</div>}
      </div>
      {missing ? (
        <p className="type-caption text-text-3">No reading</p>
      ) : (
        <>
          {delta && <Delta {...delta} />}
          {status && <StatusDot {...status} />}
          {caption && <p className="type-caption text-text-3">{caption}</p>}
        </>
      )}
    </div>
  );
}

export function MetricStrip({ children }: { children: ReactNode }) {
  return (
    <div role="group" aria-label="Key metrics">
      <Panel className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-0 [&>*]:min-w-0 [&>*]:border-border md:[&>*+*]:border-l md:[&>*+*]:pl-6">
        {children}
      </Panel>
    </div>
  );
}
