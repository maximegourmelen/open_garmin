import { chartColor } from './chartTheme';

export function Sparkline({
  values,
  label = 'Trend',
  color = 'data-1',
}: {
  values: (number | null)[];
  label?: string;
  color?: string;
}) {
  const valid = values.filter((v): v is number => v !== null && Number.isFinite(v));
  const low = valid.length ? Math.min(...valid) : 0;
  const span = valid.length ? Math.max(1, Math.max(...valid) - low) : 1;
  const x = (i: number) => (values.length <= 1 ? 30 : (i / (values.length - 1)) * 56 + 2);
  const y = (v: number) => 18 - ((v - low) / span) * 16;
  const paths: string[] = [];
  let path = '';
  values.forEach((v, i) => {
    if (v === null || !Number.isFinite(v)) {
      if (path) paths.push(path);
      path = '';
    } else path += `${path ? ' L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
  });
  if (path) paths.push(path);
  let lastIndex = -1;
  values.forEach((v, i) => {
    if (v !== null && Number.isFinite(v)) lastIndex = i;
  });
  return (
    <svg viewBox="0 0 60 20" width="60" height="20" role="img" aria-label={label}>
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={chartColor(color)}
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      ))}
      {lastIndex >= 0 && (
        <circle cx={x(lastIndex)} cy={y(values[lastIndex]!)} r="2" fill={chartColor(color)} />
      )}
    </svg>
  );
}

const ZONE_NAMES = ['Warm-up', 'Easy', 'Aerobic', 'Threshold', 'Maximum'];
export function ZoneBars({ minutes, total }: { minutes: (number | null)[]; total?: number }) {
  const sum = total ?? minutes.reduce<number>((n, v) => n + (v ?? 0), 0);
  return (
    <div className="space-y-2" aria-label="Heart rate zones">
      {[4, 3, 2, 1, 0].map((zone) => {
        const value = minutes[zone] ?? 0;
        const pct = sum > 0 ? (value / sum) * 100 : 0;
        return (
          <div
            key={zone}
            className="grid grid-cols-[2.5rem_5.5rem_1fr_3rem_2.5rem] items-center gap-2 text-xs"
          >
            <span className="font-medium text-text-2">Z{zone + 1}</span>
            <span className="text-text-2">{ZONE_NAMES[zone]}</span>
            <div className="h-2 overflow-hidden rounded-sm bg-surface-2">
              <div
                className="h-full rounded-sm"
                style={{ width: `${pct}%`, background: chartColor(`z${zone + 1}`) }}
              />
            </div>
            <span className="text-right font-num text-text">{Math.round(value)}m</span>
            <span className="text-right text-text-3">{Math.round(pct)}%</span>
          </div>
        );
      })}
    </div>
  );
}

export function StackedBars({
  rows,
  series,
  label,
}: {
  rows: { label: string; values: Record<string, number | null> }[];
  series: { key: string; label: string; color: string }[];
  label: string;
}) {
  return (
    <div aria-label={label} className="space-y-3">
      {rows.map((row) => {
        const total = series.reduce((n, s) => n + (row.values[s.key] ?? 0), 0);
        return (
          <div key={row.label} className="flex items-center gap-3 text-xs">
            <span className="w-16 shrink-0 text-text-2">{row.label}</span>
            <div className="flex h-4 flex-1 overflow-hidden rounded-sm bg-surface-2">
              {series.map((s) => (
                <div
                  key={s.key}
                  title={`${s.label}: ${row.values[s.key] ?? 0}`}
                  style={{
                    width: `${total ? ((row.values[s.key] ?? 0) / total) * 100 : 0}%`,
                    background: chartColor(s.color),
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-3 text-xs text-text-2">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1">
            <span className="size-2 rounded-full" style={{ background: chartColor(s.color) }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function StageBar({
  stages,
  optimal,
  optimalUnit = 'min',
}: {
  stages: { key: string; label: string; minutes: number; color: string }[];
  optimal?: { key: string; low: number; high: number }[];
  optimalUnit?: 'min' | '%';
}) {
  const total = stages.reduce((sum, stage) => sum + stage.minutes, 0);
  return (
    <div aria-label="Sleep stages">
      <div className="flex h-5 overflow-hidden rounded-sm bg-surface-2">
        {stages.map((stage) => (
          <div
            key={stage.key}
            style={{
              width: `${total ? (stage.minutes / total) * 100 : 0}%`,
              background: chartColor(stage.color),
            }}
            title={`${stage.label}: ${stage.minutes} minutes`}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-2">
        {stages.map((stage) => (
          <span key={stage.key} className="flex items-center gap-1">
            <span className="size-2 rounded-full" style={{ background: chartColor(stage.color) }} />
            {stage.label} {Math.round(stage.minutes)}m
            {optimal?.find((range) => range.key === stage.key) && (
              <span className="text-text-3">
                ({optimal.find((range) => range.key === stage.key)!.low}–
                {optimal.find((range) => range.key === stage.key)!.high}
                {optimalUnit} usual)
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

export function CalendarHeatmap({
  days,
  onSelect,
}: {
  days: { date: string; minutes: number }[];
  onSelect?: (date: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const max = Math.max(1, ...days.map((day) => day.minutes));
  return (
    <div
      className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto"
      role="group"
      aria-label="Activity calendar"
    >
      {days.map((day) => (
        <button
          key={day.date}
          type="button"
          onClick={() => onSelect?.(day.date)}
          aria-label={`${day.date}: ${day.minutes} active minutes`}
          className="size-3 rounded-sm focus-visible:outline-2"
          style={{
            background: day.minutes ? chartColor('data-1') : chartColor('surface-2'),
            opacity: day.minutes ? 0.25 + (0.75 * day.minutes) / max : 1,
            outline: day.date === today ? `1px solid ${chartColor('data-1')}` : undefined,
          }}
        />
      ))}
    </div>
  );
}
