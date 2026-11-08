import { cn } from '../../lib/cn';

export function ProgressBar({
  value,
  max = 100,
  color = 'accent',
  label,
  className,
  goalMarker,
}: {
  value: number;
  max?: number;
  color?: string;
  label: string;
  className?: string;
  goalMarker?: number;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const marker =
    goalMarker !== undefined && max > 0
      ? Math.min(100, Math.max(0, (goalMarker / max) * 100))
      : null;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.min(max, Math.max(0, value))}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuetext={`${value} of ${max}${value > max ? ', goal exceeded' : ''}`}
      className={cn('relative h-2 rounded-full bg-surface-3', className)}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 motion-reduce:transition-none"
        style={{ width: `${pct}%`, backgroundColor: `var(--${color})` }}
      />
      {marker !== null && (
        <span
          aria-hidden="true"
          className="absolute top-[-2px] h-3 w-0.5 rounded bg-text"
          style={{ left: `${marker}%` }}
        />
      )}
    </div>
  );
}
