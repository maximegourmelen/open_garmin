import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWorkspaceQuery } from '../../lib/queries';
import { formatDuration } from '../../lib/format';
import type { ActivitySummary, HealthSeries } from '../../lib/types';
import { Button, Drawer } from '../../components/ui';
import { SPORT_ICONS } from './activityConstants';

type SleepDay = { date: string; minutes: number | null; sentence?: string };

export function ActivityCalendar({
  month,
  onMonthChange,
  activities,
  todayDate,
}: {
  month: Date;
  onMonthChange: (month: Date) => void;
  activities: ActivitySummary[];
  todayDate: string;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [focusDate, setFocusDate] = useState<string | null>(null);
  const dayRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const sleep = useWorkspaceQuery<HealthSeries<SleepDay>>(
    ['wellness', 'sleep', '1Y'],
    '/wellness/sleep?range=1Y',
  );
  const year = month.getFullYear(),
    monthIndex = month.getMonth();
  const count = new Date(year, monthIndex + 1, 0).getDate();
  const offset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const cells = [
    ...Array.from({ length: offset }, () => ''),
    ...Array.from(
      { length: count },
      (_, i) =>
        `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
    ),
  ];
  while (cells.length % 7) cells.push('');
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  const byDate = activities.reduce<Record<string, ActivitySummary[]>>((grouped, activity) => {
    (grouped[activity.date] ??= []).push(activity);
    return grouped;
  }, {});
  useEffect(() => {
    if (focusDate) dayRefs.current[focusDate]?.focus();
  }, [focusDate, month]);
  function moveFocus(day: string, offsetDays: number) {
    const next = new Date(`${day}T12:00:00`);
    next.setDate(next.getDate() + offsetDays);
    const key = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
    if (next.getMonth() !== monthIndex || next.getFullYear() !== year)
      onMonthChange(new Date(next.getFullYear(), next.getMonth(), 1));
    setFocusDate(key);
  }
  const selected = selectedDate ? (byDate[selectedDate] ?? []) : [];
  const sleepDay = sleep.data?.days.find((day) => day.date === selectedDate);
  return (
    <section
      aria-label="Activity calendar"
      className="rounded-card border border-border bg-surface p-4 md:p-5"
    >
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            aria-label="Previous month"
            onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))}
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            size="sm"
            aria-label="Next month"
            onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_3rem] gap-1 text-center text-xs text-text-3">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Week'].map((day) => (
          <span key={day} className="pb-1">
            {day}
          </span>
        ))}
        {weeks.flatMap((week, row) => [
          ...week.map((day, col) => {
            const items = byDate[day] ?? [];
            const minutes = Math.round(
              items.reduce((sum, item) => sum + (item.duration ?? 0) / 60, 0),
            );
            return day ? (
              <button
                key={day}
                ref={(node) => {
                  dayRefs.current[day] = node;
                }}
                type="button"
                aria-label={`${day}: ${items.length} activities, ${minutes} minutes`}
                onClick={() => setSelectedDate(day)}
                onKeyDown={(event) => {
                  const move = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[
                    event.key
                  ];
                  if (move) {
                    event.preventDefault();
                    moveFocus(day, move);
                  }
                }}
                className={`min-h-16 rounded-lg border p-1 text-left transition-colors hover:bg-surface-2 ${day === todayDate ? 'border-accent' : 'border-border'}`}
              >
                <span className="font-medium text-text">{Number(day.slice(-2))}</span>
                <span className="mt-1 flex flex-wrap gap-0.5 text-text-2">
                  {items.slice(0, 3).map((item) => {
                    const Icon = SPORT_ICONS[item.sport];
                    return (
                      <span key={item.id} aria-hidden="true">
                        <Icon size={12} />
                      </span>
                    );
                  })}
                </span>
                {minutes > 0 && (
                  <span className="mt-1 block text-[0.65rem] text-text-2">{minutes}m</span>
                )}
              </button>
            ) : (
              <span key={`blank-${row}-${col}`} aria-hidden="true" />
            );
          }),
          <div
            key={`total-${row}`}
            className="flex items-center justify-center rounded-lg bg-surface-2 text-xs font-medium text-text-2"
            title="Minutes this week"
          >
            {Math.round(
              week.reduce(
                (sum, day) =>
                  sum + (byDate[day] ?? []).reduce((n, item) => n + (item.duration ?? 0) / 60, 0),
                0,
              ),
            )}
            m
          </div>,
        ])}
      </div>
      <Drawer
        open={Boolean(selectedDate)}
        onOpenChange={(open) => !open && setSelectedDate(null)}
        title={selectedDate ?? 'Day'}
      >
        <div className="space-y-3">
          {selected.length ? (
            selected.map((item) => (
              <Link
                key={item.id}
                to={`/activities/${item.id}`}
                onClick={() => setSelectedDate(null)}
                className="block rounded-tile bg-surface-2 p-3 hover:bg-surface-3"
              >
                <span className="font-semibold">{item.name}</span>
                <span className="ml-2 text-sm text-text-2">{formatDuration(item.duration)}</span>
              </Link>
            ))
          ) : (
            <p className="text-sm text-text-2">No activity on this day.</p>
          )}
          <div className="border-t border-border pt-3">
            <h3 className="font-semibold">That night’s sleep</h3>
            <p className="mt-1 text-sm text-text-2">
              {sleepDay?.minutes != null
                ? `${formatDuration(sleepDay.minutes * 60)} · ${sleepDay.sentence ?? ''}`
                : 'Sleep data is not available for this day.'}
            </p>
          </div>
        </div>
      </Drawer>
    </section>
  );
}
