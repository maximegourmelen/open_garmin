import { cn } from '../../lib/cn';
import { useEffect, useState } from 'react';

function CountValue({ value }: { value: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      // Reduced motion presents the final value immediately.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 700);
      setShown(value * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  const digits = String(value).split('.')[1]?.length ?? 0;
  return <>{shown.toFixed(Math.min(2, digits))}</>;
}

export function BigNumber({
  value,
  unit,
  size = 'lg',
  countUp = false,
}: {
  value: number | string | null | undefined;
  unit?: string;
  size?: 'hero' | 'xl' | 'lg' | 'md';
  countUp?: boolean;
}) {
  const missing = value === null || value === undefined || value === '';
  return (
    <span
      className={cn(
        'font-num tabular-nums',
        missing && 'text-text-3',
        size === 'hero' && 'num-hero',
        size === 'xl' && 'num-xl',
        size === 'lg' && 'num-lg',
        size === 'md' && 'text-xl font-semibold',
      )}
      data-count-up={countUp || undefined}
    >
      {missing ? '—' : countUp && typeof value === 'number' ? <CountValue value={value} /> : value}
      {!missing && unit && (
        <span className="ml-1 text-[0.45em] font-medium text-text-2">{unit}</span>
      )}
    </span>
  );
}

export function DeltaChip({
  value,
  unit = '%',
  good = 'neutral',
  label,
}: {
  value: number | null;
  unit?: string;
  good?: 'up' | 'down' | 'neutral';
  label?: string;
}) {
  if (value === null) return null;
  const direction = Math.sign(value);
  const favorable =
    good !== 'neutral' && ((good === 'up' && direction > 0) || (good === 'down' && direction < 0));
  const unfavorable = good !== 'neutral' && direction !== 0 && !favorable;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        favorable
          ? 'bg-success/10 text-success'
          : unfavorable
            ? 'bg-danger/10 text-danger'
            : 'bg-surface-3 text-text-2',
      )}
      aria-label={`${value > 0 ? 'Up' : value < 0 ? 'Down' : 'No change'} ${Math.abs(value)} ${unit.trim()}${label ? ` ${label}` : ''}`}
    >
      {value > 0 ? '▲' : value < 0 ? '▼' : '●'} {Math.abs(value)}
      {unit}
      {label && <span className="font-normal">{label}</span>}
    </span>
  );
}

export function StatTile({
  label,
  value,
  unit,
  delta,
  size = 'md',
}: {
  label: string;
  value: number | string | null | undefined;
  unit?: string;
  delta?: { value: number | null; unit?: string; good?: 'up' | 'down' | 'neutral'; label?: string };
  size?: 'md' | 'lg';
}) {
  return (
    <div className="min-w-0 rounded-tile bg-surface-2 p-4">
      <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-text-2">
        {label}
      </p>
      <BigNumber value={value} unit={unit} size={size} />
      {delta && (
        <div className="mt-2">
          <DeltaChip {...delta} />
        </div>
      )}
    </div>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{children}</div>;
}

export function MetricRow({
  label,
  value,
  unit,
  detail,
}: {
  label: string;
  value: number | string | null | undefined;
  unit?: string;
  detail?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="text-sm text-text-2">
        {label}
        {detail && <span className="block text-xs text-text-3">{detail}</span>}
      </span>
      <BigNumber value={value} unit={unit} size="md" />
    </div>
  );
}
