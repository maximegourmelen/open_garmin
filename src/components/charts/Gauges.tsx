import { chartColor } from './chartTheme';

export function RingGauge({
  value,
  max,
  color = 'accent',
  size = 96,
  thickness = 8,
  label,
  sublabel,
  segments,
  goalTick,
}: {
  value: number | null;
  max: number;
  color?: string;
  size?: 64 | 96 | 160;
  thickness?: number;
  label: string;
  sublabel?: string;
  segments?: { value: number; color: string }[];
  goalTick?: number;
}) {
  const radius = (size - thickness) / 2;
  const length = 2 * Math.PI * radius;
  const fraction = value === null || max <= 0 ? 0 : Math.min(1, Math.max(0, value / max));
  let offset = 0;
  return (
    <div className="inline-flex flex-col items-center gap-1">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${label}: ${value === null ? 'unavailable' : `${value} of ${max}`}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={chartColor('surface-3')}
          strokeWidth={thickness}
        />
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {segments ? (
            segments.map((part, index) => {
              const portion = Math.max(0, Math.min(1 - offset, part.value / max));
              const at = offset;
              offset += portion;
              return (
                <circle
                  key={index}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={chartColor(part.color)}
                  strokeWidth={thickness}
                  strokeLinecap="round"
                  strokeDasharray={`${portion * length} ${length}`}
                  strokeDashoffset={-at * length}
                />
              );
            })
          ) : (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={chartColor(color)}
              strokeWidth={thickness}
              strokeLinecap="round"
              strokeDasharray={`${fraction * length} ${length}`}
            />
          )}
          {value !== null && value > max && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius - thickness - 2}
              fill="none"
              stroke={chartColor('celebrate')}
              opacity={0.4}
              strokeWidth={thickness / 2}
              strokeDasharray={`${Math.min(1, (value - max) / max) * 2 * Math.PI * (radius - thickness - 2)} ${length}`}
            />
          )}
          {goalTick !== undefined && max > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={chartColor('text')}
              strokeWidth={thickness + 3}
              strokeDasharray={`2 ${length}`}
              strokeDashoffset={-(goalTick / max) * length}
            />
          )}
        </g>
        <text
          x="50%"
          y="52%"
          textAnchor="middle"
          dominantBaseline="middle"
          fill={chartColor('text')}
          fontSize={size / 4}
          fontFamily="var(--font-num)"
          fontWeight="700"
        >
          {value ?? '—'}
        </text>
      </svg>
      {sublabel && <span className="text-xs text-text-2">{sublabel}</span>}
    </div>
  );
}

export function SegmentGauge({
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
            className="absolute top-0 h-full rounded bg-accent/10"
            style={{
              left: `${(usualRange[0] / max) * 100}%`,
              width: `${((usualRange[1] - usualRange[0]) / max) * 100}%`,
            }}
          />
        )}
        {position !== null && (
          <span
            className="absolute top-0 z-10 -translate-x-1/2 text-xs text-text"
            style={{ left: `${position}%` }}
          >
            ▼
          </span>
        )}
        <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
          {segments.map((segment) => (
            <div
              key={segment.label}
              className="flex-1"
              style={{ background: chartColor(segment.color) }}
            />
          ))}
        </div>
      </div>
      <div className="mt-1 flex justify-between text-[0.65rem] text-text-3">
        {segments.map((segment) => (
          <span key={segment.label}>{segment.label}</span>
        ))}
      </div>
    </div>
  );
}

export function WeekDots({
  days,
  weekStart = 'monday',
}: {
  days: {
    date: string;
    sports: string[];
    isToday?: boolean;
    isFuture?: boolean;
    isRest?: boolean;
  }[];
  weekStart?: 'monday' | 'sunday';
}) {
  const ordered = weekStart === 'sunday' ? [...days.slice(-1), ...days.slice(0, -1)] : days;
  return (
    <div className="flex justify-between gap-2" role="group" aria-label="Activity this week">
      {ordered.map((day) => (
        <div key={day.date} className="flex flex-col items-center gap-1" title={day.date}>
          <span
            role="img"
            className={`flex size-7 items-center justify-center rounded-full ${day.isToday ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''}`}
            style={{
              background:
                day.sports.length > 1
                  ? `conic-gradient(${day.sports.map((sport, index) => `${chartColor(`sport-${sport}`)} ${(index / day.sports.length) * 100}% ${((index + 1) / day.sports.length) * 100}%`).join(', ')})`
                  : day.sports.length
                    ? chartColor(`sport-${day.sports[0]}`)
                    : 'transparent',
              border: day.sports.length ? undefined : `1px solid ${chartColor('border-strong')}`,
            }}
            aria-label={`${day.date}: ${day.sports.length ? day.sports.join(', ') : day.isRest ? 'planned rest' : day.isFuture ? 'future' : 'no activity'}`}
          />
          <span className="text-[0.65rem] text-text-3">
            {new Date(`${day.date}T12:00:00`).toLocaleDateString('en', { weekday: 'narrow' })}
          </span>
        </div>
      ))}
    </div>
  );
}
