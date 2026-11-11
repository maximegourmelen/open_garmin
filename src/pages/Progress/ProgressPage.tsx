import { Activity, CalendarDays, Gauge, Trophy } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarSeries, CalendarHeatmap, RingGauge } from '../../components/charts';
import {
  Card,
  Disclosure,
  EmptyState,
  ErrorState,
  Pill,
  SegmentedControl,
  Skeleton,
} from '../../components/ui';
import { formatDistance, formatDuration } from '../../lib/format';
import { usePreferences, useProgress } from '../../lib/queries';
import type { ProgressResponse } from '../../lib/types';
import DeeperPanel from './DeeperPanel';

const shortDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
function Bests({
  bests,
  units,
}: {
  bests: ProgressResponse['bests'];
  units: 'metric' | 'imperial';
}) {
  const names: Record<string, string> = {
    'distance:1000': 'Fastest 1 km',
    'distance:1609': 'Fastest 1 mi',
    'distance:5000': 'Fastest 5 km',
    'distance:10000': 'Fastest 10 km',
    'longest:distance:running': 'Longest run',
    'longest:distance:walking': 'Longest walk',
    'longest:distance:cycling': 'Longest ride',
    'longest:duration': 'Longest session',
    most_active_week: 'Most active week',
  };
  const shown = bests.filter((item) => names[item.kind]);
  if (!shown.length)
    return (
      <p className="text-sm text-text-2">
        Your personal bests will appear here as you record activities.
      </p>
    );
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {shown.map((item) => {
        const best = item.all_time;
        const value =
          item.kind.startsWith('distance:') || item.kind === 'longest:duration'
            ? formatDuration(best.value)
            : item.kind.startsWith('longest:distance')
              ? formatDistance(best.value, units)
              : `${Math.round(best.value)} min`;
        return (
          <div key={item.kind} className="rounded-tile border border-border bg-surface-2 p-3">
            <div className="flex items-center gap-2">
              <p className="text-sm text-text-2">{names[item.kind]}</p>
              {best.is_new && <Pill tone="success">New</Pill>}
            </div>
            <p className="mt-1 font-display text-2xl font-bold">{value}</p>
            <p className="text-xs text-text-3">{shortDate(best.date)}</p>
            {!best.activity_id.startsWith('week:') && (
              <Link
                className="mt-2 inline-block text-xs text-accent underline"
                to={`/activities/${best.activity_id}`}
              >
                See activity
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
export default function ProgressPage() {
  const progress = useProgress();
  const prefs = usePreferences();
  const [metric, setMetric] = useState<'minutes' | 'distance'>('minutes');
  if (progress.isPending)
    return (
      <div className="mx-auto max-w-6xl space-y-4" aria-label="Loading Progress">
        <Skeleton className="h-44" />
        <Skeleton className="h-64" />
        <Skeleton className="h-44" />
      </div>
    );
  if (progress.isError)
    return <ErrorState message={progress.error.message} retry={() => void progress.refetch()} />;
  if (!progress.data)
    return (
      <EmptyState
        title="Your progress starts here"
        text="Connect your watch or explore sample data to see your story."
      />
    );
  const data = progress.data;
  const sports = [...new Set(data.volume.flatMap((week) => Object.keys(week.by_sport)))];
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Growing in your own way
        </p>
        <h1 className="font-display text-3xl font-bold md:text-4xl">Progress</h1>
        <p className="mt-1 text-text-2">Notice the changes that matter to you.</p>
      </header>
      <Card title="Signs you’re getting fitter" icon={Activity}>
        <div className="grid gap-3 md:grid-cols-2">
          {data.signals.slice(0, 4).map((signal) => (
            <div key={signal.id} className="flex gap-3 rounded-tile bg-surface-2 p-4">
              <div className="shrink-0">
                {signal.status === 'insufficient' ? (
                  <span className="flex size-9 items-center justify-center rounded-full bg-surface-3 text-text-3">
                    —
                  </span>
                ) : (
                  <span
                    className={`flex size-9 items-center justify-center rounded-full text-xl ${signal.status === 'improving' ? 'bg-success/15 text-success' : 'bg-accent-soft text-accent'}`}
                  >
                    {signal.status === 'improving' ? '✓' : '–'}
                  </span>
                )}
              </div>
              <div>
                <p className="font-medium">{signal.sentence}</p>
                {signal.before !== null && signal.after !== null && (
                  <p className="mt-2 text-xs text-text-2">
                    {Math.round(signal.before)} → {Math.round(signal.after)} {signal.unit} ·{' '}
                    {signal.n_before} and {signal.n_after} readings
                  </p>
                )}
              </div>
            </div>
          ))}
          {!data.signals.length && (
            <p className="text-sm text-text-2">A few weeks of readings will reveal your trends.</p>
          )}
        </div>
      </Card>
      <Card title="Your bests" icon={Trophy}>
        <Bests bests={data.bests} units={prefs.data?.units ?? 'metric'} />
      </Card>
      <Card title="Your volume" icon={Activity}>
        <SegmentedControl
          label="Volume measure"
          value={metric}
          onChange={setMetric}
          options={[
            { value: 'minutes', label: 'Active minutes' },
            { value: 'distance', label: 'Distance' },
          ]}
        />
        <BarSeries
          label={`Weekly ${metric}`}
          data={data.volume.map((week) => ({
            week: shortDate(week.start),
            minutes: week.minutes,
            distance: week.distance / (prefs.data?.units === 'imperial' ? 1609.344 : 1000),
            partial: week.partial,
            ...week.by_sport,
          }))}
          xKey="week"
          series={[
            {
              key: metric,
              label:
                metric === 'distance'
                  ? prefs.data?.units === 'imperial'
                    ? 'Miles'
                    : 'Kilometres'
                  : 'Minutes',
              color: 'accent',
            },
          ]}
          goal={metric === 'minutes' ? data.volume.at(-1)?.goal : undefined}
          partialKey="partial"
        />
        <p className="mt-2 text-xs text-text-3">
          The current week is still in progress. Active minutes follow Garmin intensity minutes when
          available.
        </p>
        {metric === 'minutes' && sports.length > 0 && (
          <div className="mt-5 border-t border-border pt-4">
            <h3 className="mb-2 text-sm font-semibold">Recorded duration by sport</h3>
            <BarSeries
              label="Weekly activity duration by sport"
              data={data.volume.map((week) => ({
                week: shortDate(week.start),
                partial: week.partial,
                ...week.by_sport,
              }))}
              xKey="week"
              series={sports.map((sport) => ({
                key: sport,
                label: sport,
                color: `sport-${sport}`,
                stackId: 'sport',
              }))}
              partialKey="partial"
            />
          </div>
        )}
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Consistency" icon={CalendarDays}>
          <p className="mb-3 font-display text-2xl font-bold">
            Active on {data.consistency.active_days_28} of the last 28 days
          </p>
          <CalendarHeatmap days={data.consistency.days} />
        </Card>
        <Card title="Ramp check" icon={Gauge}>
          <div className="flex items-center gap-5">
            <RingGauge
              label="This week compared with usual effort"
              value={data.ramp.ratio === null ? null : Math.round(data.ramp.ratio * 100)}
              max={160}
              size={96}
            />
            <div>
              <p className="font-display text-2xl font-bold">
                {data.ramp.this_week}{' '}
                <span className="text-sm font-normal text-text-2">effort points this week</span>
              </p>
              <p className="text-sm text-text-2">
                4-week average: {data.ramp.average_four_weeks ?? '—'}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm">{data.ramp.sentence}</p>
        </Card>
      </div>
      <Disclosure id="progress-deeper" title="Go deeper">
        <DeeperPanel />
      </Disclosure>
    </div>
  );
}
