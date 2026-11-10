import { chartColor } from './chartTheme';

export function SegmentScale({
  value,
  max = 5,
  segments,
  usualRange,
  label,
}: {
  value: number | null;
  max?: number;
  segments: { label: string; color: string }[];
  usualRange?: [number, number];
  label: string;
}) {
  const position = value === null ? null : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      role="img"
      aria-label={`${label}: ${value === null ? 'unavailable' : `${value} of ${max}`}`}
    >
      <div className="relative pt-4">
        {usualRange && (
          <div
            className="absolute top-0 h-full bg-data-muted/40"
            style={{
              left: `${(usualRange[0] / max) * 100}%`,
              width: `${((usualRange[1] - usualRange[0]) / max) * 100}%`,
            }}
          />
        )}
        {position !== null && (
          <span
            className="absolute top-0 z-10 -translate-x-1/2 type-caption text-text"
            style={{ left: `${position}%` }}
          >
            ▼
          </span>
        )}
        <div className="flex h-2 gap-0.5 overflow-hidden rounded-sm">
          {segments.map((segment) => (
            <div
              key={segment.label}
              className="flex-1"
              style={{ background: chartColor(segment.color) }}
            />
          ))}
        </div>
      </div>
      <div className="mt-1 flex justify-between type-caption text-text-3">
        {segments.map((segment) => (
          <span key={segment.label}>{segment.label}</span>
        ))}
      </div>
    </div>
  );
}

export const SegmentGauge = SegmentScale;
