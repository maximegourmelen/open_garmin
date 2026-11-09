import { Activity, Bike, Dumbbell, Footprints, Mountain, Star, Waves } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RunIcon } from '../../components/icons/RunIcon';
import { formatDistance, formatDuration, formatPace, formatSpeed } from '../../lib/format';
import type { ActivitySummary, Sport } from '../../lib/types';

const SPORT_ICONS: Record<Sport, React.ComponentType<{ size?: number }>> = {
  walking: Footprints,
  running: RunIcon,
  cycling: Bike,
  swimming: Waves,
  strength: Dumbbell,
  hiking: Mountain,
  other: Activity,
};

function weekStart(date: string) {
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}

function activityDate(item: ActivitySummary, todayDate: string) {
  const yesterday = new Date(`${todayDate}T12:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const prefix =
    item.date === todayDate
      ? 'Today'
      : item.date === yesterday.toISOString().slice(0, 10)
        ? 'Yesterday'
        : new Date(`${item.date}T12:00:00`).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          });
  const time = item.start?.split('T')[1]?.slice(0, 5);
  return time ? `${prefix}, ${time}` : prefix;
}

function MiniZones({ values }: { values: (number | null)[] | null }) {
  if (!values) return null;
  const total = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  return (
    <div
      className="flex h-1.5 w-12 overflow-hidden rounded-full bg-surface-3"
      aria-label="Heart rate zone mix"
    >
      {values.map((value, i) => (
        <span
          key={i}
          style={{
            width: `${total ? ((value ?? 0) / total) * 100 : 0}%`,
            background: `var(--z${i + 1})`,
          }}
        />
      ))}
    </div>
  );
}

export function ActivityListView({
  items,
  todayDate,
  units = 'metric',
  compareMode,
  selected,
  onToggle,
}: {
  items: ActivitySummary[];
  todayDate: string;
  units?: 'metric' | 'imperial';
  compareMode: boolean;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const groups = items.reduce<Record<string, ActivitySummary[]>>((result, item) => {
    (result[weekStart(item.date)] ??= []).push(item);
    return result;
  }, {});
  const currentWeek = weekStart(todayDate);
  return (
    <div className="space-y-5">
      {Object.entries(groups).map(([start, group]) => (
        <section key={start}>
          <h2 className="mb-2 text-sm font-semibold text-text-2">
            {start === currentWeek
              ? 'This week'
              : `Week of ${new Date(`${start}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}{' '}
            · {group.length} sessions ·{' '}
            {formatDuration(group.reduce((sum, item) => sum + (item.duration ?? 0), 0))}
          </h2>
          <div className="overflow-hidden rounded-card border border-border bg-surface">
            {group.map((item) => {
              const Icon = SPORT_ICONS[item.sport];
              const pace = ['running', 'walking', 'hiking'].includes(item.sport)
                ? formatPace(item.average_speed, units)
                : formatSpeed(item.average_speed, units);
              return (
                <div
                  key={item.id}
                  className="flex items-center border-b border-border last:border-0 hover:bg-surface-2"
                >
                  {compareMode && (
                    <input
                      type="checkbox"
                      aria-label={`Compare ${item.name}`}
                      checked={selected.includes(item.id)}
                      onChange={() => onToggle(item.id)}
                      className="ml-3 size-4 accent-accent"
                    />
                  )}
                  <Link
                    to={`/activities/${item.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 md:px-4"
                  >
                    <span
                      className="flex size-10 shrink-0 items-center justify-center rounded-full"
                      style={{
                        color: `var(--sport-${item.sport})`,
                        background: 'var(--surface-3)',
                      }}
                    >
                      <Icon size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {item.name}
                        {item.is_best && (
                          <Star
                            size={13}
                            className="ml-1 inline text-celebrate"
                            aria-label="Personal best"
                          />
                        )}
                      </span>
                      <span className="block text-xs text-text-3">
                        {activityDate(item, todayDate)}
                      </span>
                    </span>
                    <span className="hidden w-20 text-right text-sm font-semibold sm:block">
                      {formatDistance(item.distance, units)}
                    </span>
                    <span className="w-16 text-right text-sm text-text-2">
                      {formatDuration(item.duration)}
                    </span>
                    <span className="hidden w-20 text-right text-xs text-text-2 md:block">
                      {pace}
                    </span>
                    <span className="hidden w-14 text-right text-xs text-text-2 lg:block">
                      {item.average_hr ? `${Math.round(item.average_hr)} bpm` : '—'}
                    </span>
                    <span className="hidden w-12 lg:block">
                      <MiniZones values={item.zone_minutes} />
                    </span>
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
