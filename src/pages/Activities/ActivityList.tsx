import { Link } from 'react-router-dom';
import { MetricLabel } from '../../components/data/Metric';
import { Tag } from '../../components/ui/Structure';
import {
  formatDateList,
  formatDistance,
  formatDurationClock,
  formatDurationSummary,
  formatHeartRate,
  formatNumber,
  formatPace,
  formatSpeed,
} from '../../lib/format';
import type { ActivitySummary } from '../../lib/types';
import { SPORT_ICONS } from './activityConstants';
import { ActivityZoneBar } from './ActivityZoneBar';

function weekStart(date: string, start: 'monday' | 'sunday') {
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + (start === 'monday' ? 6 : 0)) % 7));
  return day.toISOString().slice(0, 10);
}

function ActivityName({ item }: { item: ActivitySummary }) {
  const Icon = SPORT_ICONS[item.sport];
  return (
    <span className="inline-flex items-center gap-3">
      <Icon size={18} />
      <span>{item.name}</span>
      {item.is_best && <Tag>Record</Tag>}
    </span>
  );
}

export function ActivityListView({
  items,
  todayDate,
  units = 'metric',
  compareMode,
  selected,
  onToggle,
  weekStartDay = 'monday',
}: {
  items: ActivitySummary[];
  todayDate: string;
  units?: 'metric' | 'imperial';
  compareMode: boolean;
  selected: string[];
  onToggle: (id: string) => void;
  weekStartDay?: 'monday' | 'sunday';
}) {
  const groups = items.reduce<Record<string, ActivitySummary[]>>((result, item) => {
    (result[weekStart(item.date, weekStartDay)] ??= []).push(item);
    return result;
  }, {});
  const currentWeek = weekStart(todayDate, weekStartDay);
  return (
    <div className="space-y-8">
      {Object.entries(groups).map(([start, group]) => (
        <section key={start} aria-label={start === currentWeek ? 'This week' : `Week of ${start}`}>
          <h2 className="mb-3 type-caption text-text-2">
            {start === currentWeek
              ? 'This week'
              : `Week of ${new Date(`${start}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}{' '}
            · {group.length} {group.length === 1 ? 'activity' : 'activities'} ·{' '}
            {formatDurationSummary(group.reduce((sum, item) => sum + (item.duration ?? 0), 0))}{' '}
            recorded
          </h2>
          <ul className="border-t border-border lg:hidden">
            {group.map((item) => (
              <li key={item.id} className="flex items-start gap-3 border-b border-border py-4">
                {compareMode && (
                  <input
                    type="checkbox"
                    aria-label={`Compare ${item.name}`}
                    checked={selected.includes(item.id)}
                    onChange={() => onToggle(item.id)}
                    className="mt-1 size-4 accent-accent"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <Link to={`/activities/${item.id}`} className="font-medium text-text">
                    <ActivityName item={item} />
                  </Link>
                  <p className="mt-1 type-caption text-text-2">
                    {formatDateList(item.date, todayDate, item.start?.slice(11, 16))} ·{' '}
                    {formatDurationClock(item.duration)}
                  </p>
                </div>
                <span className="shrink-0 type-body tabular-nums text-text-2">
                  {formatDistance(item.distance, units, true)}
                </span>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[760px] border-collapse text-left type-body">
              <caption className="sr-only">Activities for week of {start}</caption>
              <thead>
                <tr className="border-y border-border text-text-2">
                  {compareMode && (
                    <th scope="col" className="w-10 py-3">
                      <span className="sr-only">Select</span>
                    </th>
                  )}
                  <th scope="col" className="py-3 font-normal">
                    Sport / activity
                  </th>
                  <th scope="col" className="py-3 font-normal">
                    Date
                  </th>
                  <th scope="col" className="py-3 text-right font-normal">
                    Distance
                  </th>
                  <th scope="col" className="py-3 text-right font-normal">
                    Time
                  </th>
                  <th scope="col" className="py-3 text-right font-normal">
                    Pace / speed
                  </th>
                  <th scope="col" className="py-3 text-right font-normal">
                    Avg HR
                  </th>
                  <th scope="col" className="py-3 text-right font-normal">
                    <MetricLabel id="effort" label="Effort" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {group.map((item) => (
                  <tr key={item.id} className="border-b border-border hover:bg-surface-2">
                    {compareMode && (
                      <td className="py-3">
                        <input
                          type="checkbox"
                          aria-label={`Compare ${item.name}`}
                          checked={selected.includes(item.id)}
                          onChange={() => onToggle(item.id)}
                          className="size-4 accent-accent"
                        />
                      </td>
                    )}
                    <td className="py-3 pr-3">
                      <Link
                        to={`/activities/${item.id}`}
                        className="font-medium text-text hover:text-accent"
                      >
                        <ActivityName item={item} />
                      </Link>
                    </td>
                    <td className="py-3 text-text-2">
                      {formatDateList(item.date, todayDate, item.start?.slice(11, 16))}
                    </td>
                    <td className="py-3 text-right tabular-nums text-text-2">
                      {formatDistance(item.distance, units, true)}
                    </td>
                    <td className="py-3 text-right tabular-nums text-text-2">
                      {formatDurationClock(item.duration)}
                    </td>
                    <td className="py-3 text-right tabular-nums text-text-2">
                      {['running', 'walking', 'hiking'].includes(item.sport)
                        ? formatPace(item.average_speed, units)
                        : formatSpeed(item.average_speed, units)}
                    </td>
                    <td className="py-3 text-right tabular-nums text-text-2">
                      {formatHeartRate(item.average_hr)}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-2 tabular-nums text-text-2">
                        <span>{formatNumber(item.effort_points)}</span>
                        <ActivityZoneBar values={item.zone_minutes} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
