import { cn } from '../../lib/cn';

export function ProgressBar({
  value,
  max = 100,
  color = 'accent',
  label,
  className,
}: {
  value: number;
  max?: number;
  color?: string;
  label: string;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn('h-2 overflow-hidden rounded-full bg-surface-3', className)}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 motion-reduce:transition-none"
        style={{ width: `${pct}%`, backgroundColor: `var(--${color})` }}
      />
    </div>
  );
}
