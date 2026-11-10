import { chartColor } from './chartTheme';

/** Compatibility while old pages are replaced. The visual is now a simple bar. */
export function RingGauge({
  value,
  max,
  label,
  sublabel,
  color = 'data-1',
  size = 96,
}: {
  value: number | null;
  max: number;
  label: string;
  sublabel?: string;
  color?: string;
  size?: 64 | 96 | 160;
  thickness?: number;
  segments?: { value: number; color: string }[];
  goalTick?: number;
}) {
  const pct = value === null || max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      role="img"
      aria-label={`${label}: ${value === null ? 'unavailable' : `${value} of ${max}`}`}
      className="space-y-2"
      style={{ width: size }}
    >
      <span className="num-lg text-text">{value ?? '—'}</span>
      <div className="h-1 rounded-sm bg-surface-2">
        <div
          className="h-full rounded-sm"
          style={{ width: `${pct}%`, background: chartColor(color) }}
        />
      </div>
      {sublabel && <span className="type-caption text-text-2">{sublabel}</span>}
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
            aria-label={`${day.date}: ${day.sports.length ? day.sports.join(', ') : day.isRest ? 'planned rest' : day.isFuture ? 'future' : 'no activity'}`}
            className={`size-3 rounded-full ${day.isToday ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg' : ''}`}
            style={{
              background: day.sports.length ? chartColor('data-1') : chartColor('surface-2'),
            }}
          />
          <span className="type-caption text-text-3">
            {new Date(`${day.date}T12:00:00`).toLocaleDateString('en', { weekday: 'narrow' })}
          </span>
        </div>
      ))}
    </div>
  );
}
