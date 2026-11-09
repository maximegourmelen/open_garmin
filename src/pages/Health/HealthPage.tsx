import { Activity, BatteryCharging, Footprints, HeartPulse, Moon, Waves } from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  BandLineChart,
  BarSeries,
  RingGauge,
  SegmentGauge,
  Sparkline,
  StageBar,
  StackedBars,
} from '../../components/charts';
import { Card, EmptyState, ErrorState, SegmentedControl, Skeleton } from '../../components/ui';
import { useWorkspaceQuery } from '../../lib/queries';
import type { HealthSeries, Range } from '../../lib/types';

type Kind = 'sleep' | 'heart' | 'energy' | 'stress' | 'steps';
type Tab = 'overview' | Kind;
type Day = Record<string, unknown> & { date: string };
type Overview = {
  range: Range;
  tabs: Record<Kind, { latest: Day | null; sentences: string[]; spark: Day[] }>;
};
const tabs: { id: Tab; label: string; icon: typeof Moon }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'sleep', label: 'Sleep', icon: Moon },
  { id: 'heart', label: 'Heart', icon: HeartPulse },
  { id: 'energy', label: 'Energy', icon: BatteryCharging },
  { id: 'stress', label: 'Stress', icon: Waves },
  { id: 'steps', label: 'Steps', icon: Footprints },
];
const ranges: { value: Range; label: string }[] = [
  { value: '7D', label: '7D' },
  { value: '4W', label: '4W' },
  { value: '3M', label: '3M' },
  { value: '1Y', label: '1Y' },
];
const number = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;
const str = (value: unknown) => (typeof value === 'string' ? value : null);
const metric = (value: unknown, unit = '') =>
  number(value) === null ? '—' : `${Math.round(number(value)!)}${unit}`;
const hours = (value: unknown) =>
  number(value) === null
    ? '—'
    : `${Math.floor(number(value)! / 60)}h ${String(Math.round(number(value)! % 60)).padStart(2, '0')}m`;
const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const chartRows = (days: Day[], keys: string[]) =>
  days.map((day) => ({
    date: dateLabel(day.date),
    ...Object.fromEntries(keys.map((key) => [key, number(day[key])])),
  }));
const latestWith = (days: Day[], key: string) =>
  [...days].reverse().find((day) => number(day[key]) !== null) ?? null;
const tile = (label: string, value: string, detail?: string) => (
  <div className="rounded-tile bg-surface-2 p-4">
    <p className="text-xs text-text-2">{label}</p>
    <p className="mt-1 font-display text-2xl font-bold">{value}</p>
    {detail && <p className="text-xs text-text-3">{detail}</p>}
  </div>
);

function OverviewPanel({ data }: { data: Overview }) {
  const primary: Record<Kind, { key: string; value: (day: Day | null) => string; unit: string }> = {
    sleep: { key: 'minutes', value: (day) => hours(day?.minutes), unit: 'minutes' },
    heart: { key: 'resting_hr', value: (day) => metric(day?.resting_hr, ' bpm'), unit: 'bpm' },
    energy: { key: 'latest', value: (day) => metric(day?.latest), unit: 'points' },
    stress: { key: 'average', value: (day) => metric(day?.average), unit: 'score' },
    steps: { key: 'steps', value: (day) => metric(day?.steps), unit: 'steps' },
  };
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {tabs.slice(1).map(({ id, label, icon }) => {
        const kind = id as Kind;
        const series = data.tabs[kind];
        const config = primary[kind];
        const latest = latestWith(series.spark, config.key);
        return (
          <Card key={kind} title={label} icon={icon} href={`/health/${kind}?range=${data.range}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-display text-3xl font-bold">{config.value(latest)}</p>
                <p className="text-xs text-text-3">
                  {latest ? dateLabel(latest.date) : 'No readings yet'} · {config.unit}
                </p>
              </div>
              <Sparkline
                values={series.spark.map((day) => number(day[config.key]))}
                label={`${label} trend`}
              />
            </div>
            <p className="mt-3 text-sm text-text-2">
              {series.sentences[0] ?? 'Your readings will appear here when available.'}
            </p>
          </Card>
        );
      })}
    </div>
  );
}

function SleepPanel({ series }: { series: HealthSeries<Day> }) {
  const days = series.days;
  const night = latestWith(days, 'minutes');
  if (!night)
    return (
      <EmptyState
        title="No sleep readings yet"
        text="Sleep data appears here after your watch records a night."
      />
    );
  const stages = (night.stages ?? {}) as Record<
    string,
    { minutes?: number | null; optimal_start?: number | null; optimal_end?: number | null }
  >;
  const stageList = [
    { key: 'deep', label: 'Deep', color: 'sleep-deep' },
    { key: 'light', label: 'Light', color: 'sleep-light' },
    { key: 'rem', label: 'REM', color: 'sleep-rem' },
    { key: 'awake', label: 'Awake', color: 'sleep-awake' },
  ];
  const bedtime = days.map((day) => {
    const start = str(day.start);
    const epoch = number(day.start);
    const time = start
      ? new Date(start)
      : epoch === null
        ? null
        : new Date(epoch > 10 ** 11 ? epoch : epoch * 1000);
    return {
      date: dateLabel(day.date),
      bedtime:
        time && !Number.isNaN(time.getTime())
          ? ((time.getHours() + 6) % 24) * 60 + time.getMinutes()
          : null,
    };
  });
  const rhythm = series.summary.bedtime_rhythm as
    | { usual_minutes_after_18?: number | null; band_minutes?: number | null; sentence?: string }
    | undefined;
  const rhythmBand: [number, number] | undefined =
    rhythm?.usual_minutes_after_18 != null && rhythm.band_minutes != null
      ? [
          rhythm.usual_minutes_after_18 - rhythm.band_minutes,
          rhythm.usual_minutes_after_18 + rhythm.band_minutes,
        ]
      : undefined;
  return (
    <div className="space-y-4">
      <Card title={`Last recorded night · ${dateLabel(night.date)}`} icon={Moon}>
        <div className="flex flex-wrap items-center gap-6">
          <RingGauge
            value={number(night.score) ?? number(night.minutes)}
            max={number(night.score) === null ? (number(night.need_minutes) ?? 420) : 100}
            label={
              number(night.score) === null ? 'Sleep duration versus need' : 'Garmin sleep score'
            }
            size={160}
            sublabel={number(night.score) === null ? 'Duration vs need' : 'Garmin sleep score'}
          />
          <div>
            <p className="font-display text-3xl font-bold">{hours(night.minutes)}</p>
            <p className="text-sm text-text-2">Needed {hours(night.need_minutes)}</p>
            <p className="mt-2 text-sm">{str(night.sentence)}</p>
          </div>
        </div>
        <div className="mt-5">
          <StageBar
            stages={stageList
              .filter((stage) => number(stages[stage.key]?.minutes) !== null)
              .map((stage) => ({ ...stage, minutes: number(stages[stage.key]?.minutes)! }))}
            optimal={stageList
              .filter(
                (stage) =>
                  number(stages[stage.key]?.optimal_start) !== null &&
                  number(stages[stage.key]?.optimal_end) !== null,
              )
              .map((stage) => ({
                key: stage.key,
                low: number(stages[stage.key]?.optimal_start)!,
                high: number(stages[stage.key]?.optimal_end)!,
              }))}
          />
        </div>
        {str(night.feedback) && (
          <p className="mt-4 text-sm text-text-2">Garmin says: {str(night.feedback)}</p>
        )}
      </Card>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tile('Bedtime', str(night.start)?.slice(11, 16) ?? '—')}
        {tile('Wake time', str(night.end)?.slice(11, 16) ?? '—')}
        {tile('Awakenings', metric(night.awake_count))}
        {tile('Sleep HR', metric(night.avg_hr, ' bpm'))}
        {tile('Respiration', metric(night.respiration, '/min'))}
        {tile('SpO₂', metric(night.spo2, '%'))}
      </div>
      <Card title="Your sleep over time">
        <BarSeries
          label="Sleep stages by night with need line"
          data={days.map((day) => {
            const parts = (day.stages ?? {}) as typeof stages;
            return {
              date: dateLabel(day.date),
              deep: number(parts.deep?.minutes),
              light: number(parts.light?.minutes),
              rem: number(parts.rem?.minutes),
              awake: number(parts.awake?.minutes),
              need: number(day.need_minutes),
            };
          })}
          xKey="date"
          series={stageList.map(({ key, label, color }) => ({
            key,
            label,
            color,
            stackId: 'sleep',
          }))}
          goal={number(night.need_minutes) ?? undefined}
        />
        <p className="mt-2 text-xs text-text-3">
          Missing nights are gaps. Dashed line shows the latest recorded sleep need.
        </p>
      </Card>
      <Card title="Bedtime rhythm">
        <BandLineChart label="Bedtime rhythm" data={bedtime} dataKey="bedtime" band={rhythmBand} />
        <p className="mt-2 text-sm text-text-2">
          {rhythm?.sentence ?? 'More nights will show your bedtime rhythm.'}
        </p>
      </Card>
      {series.sentences.map((sentence, i) => (
        <p key={i} className="text-sm text-text-2">
          {sentence}
        </p>
      ))}
    </div>
  );
}

function HeartPanel({ series }: { series: HealthSeries<Day> }) {
  const days = series.days;
  const resting = latestWith(days, 'resting_hr');
  const hrv = latestWith(days, 'hrv');
  const band: [number, number] | undefined =
    number(hrv?.balanced_low) !== null && number(hrv?.balanced_high) !== null
      ? [number(hrv?.balanced_low)!, number(hrv?.balanced_high)!]
      : undefined;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Resting heart rate" icon={HeartPulse}>
          <p className="font-display text-4xl font-bold">{metric(resting?.resting_hr, ' bpm')}</p>
          <p className="text-sm text-text-2">
            {resting ? dateLabel(resting.date) : 'No readings yet'}
          </p>
        </Card>
        <Card title="Heart rate variability">
          <p className="font-display text-4xl font-bold">{metric(hrv?.hrv, ' ms')}</p>
          <p className="text-sm text-text-2">
            7-day average {metric(hrv?.hrv_weekly, ' ms')} · Garmin status{' '}
            {str(hrv?.hrv_status) ?? '—'}
          </p>
          {band && (
            <div className="mt-4">
              <SegmentGauge
                value={number(hrv?.hrv)}
                max={Math.max(100, band[1] * 1.4)}
                label="HRV against your Garmin balanced band"
                segments={[
                  { label: 'Below', color: 'warning' },
                  { label: 'Balanced', color: 'success' },
                  { label: 'Above', color: 'accent' },
                ]}
                usualRange={band}
              />
            </div>
          )}
        </Card>
      </div>
      <Card title="Resting heart rate over time">
        <BandLineChart
          label="Resting heart rate trend"
          data={chartRows(days, ['resting_hr'])}
          dataKey="resting_hr"
          color="danger"
        />
      </Card>
      <Card title="HRV over time">
        <BandLineChart
          label="Daily HRV with Garmin balanced band"
          data={chartRows(days, ['hrv'])}
          dataKey="hrv"
          color="accent"
          band={band}
        />
        <p className="mt-2 text-sm text-text-2">
          HRV is the small variation between heartbeats. Higher than your own usual is generally a
          sign of being well rested. Don’t compare with other people.
        </p>
      </Card>
    </div>
  );
}

function EnergyPanel({ series }: { series: HealthSeries<Day> }) {
  const days = series.days;
  const today = latestWith(days, 'latest');
  const impacts = days.flatMap((day) =>
    Array.isArray(day.activity_impacts)
      ? (day.activity_impacts as { id: string; name: string; impact: number }[])
      : [],
  );
  return (
    <div className="space-y-4">
      <Card title="Body Battery today" icon={BatteryCharging}>
        <div className="flex flex-wrap items-center gap-6">
          <RingGauge
            value={number(today?.latest)}
            max={100}
            label="Latest Body Battery"
            size={160}
          />
          <div>
            <p className="font-display text-3xl font-bold">{metric(today?.latest)}</p>
            <p className="text-sm text-text-2">
              {today ? dateLabel(today.date) : 'No readings yet'}
            </p>
            <p className="mt-2 text-sm">{str(today?.sentence)}</p>
          </div>
        </div>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {tile('At wake', metric(today?.at_wake))}
        {tile('Charged', metric(today?.charged))}
        {tile('Drained', metric(today?.drained))}
        {tile('Highest', metric(today?.high))}
        {tile('Lowest', metric(today?.low))}
      </div>
      <Card title="Daily energy range">
        <BarSeries
          label="Body Battery daily high and low"
          data={chartRows(days, ['high', 'low'])}
          xKey="date"
          series={[
            { key: 'high', label: 'High', color: 'accent' },
            { key: 'low', label: 'Low', color: 'warning' },
          ]}
        />
        <p className="mt-2 text-xs text-text-3">
          Garmin Body Battery readings, with gaps where a day has no reading.
        </p>
      </Card>
      {impacts.length > 0 && (
        <Card title="Activity impacts">
          <div className="space-y-2">
            {impacts
              .slice(-10)
              .reverse()
              .map((item, i) => (
                <Link
                  key={`${item.id}-${i}`}
                  to={`/activities/${item.id}`}
                  className="flex justify-between border-b border-border py-2 text-sm hover:text-accent"
                >
                  <span>{item.name}</span>
                  <span>{metric(item.impact)} points</span>
                </Link>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function StressPanel({ series }: { series: HealthSeries<Day> }) {
  const days = series.days;
  const today = latestWith(days, 'average');
  const portions = (today?.minutes ?? {}) as Record<string, number | null>;
  const colors = [
    { key: 'rest', label: 'Rest', color: 'success' },
    { key: 'low', label: 'Low', color: 'accent' },
    { key: 'medium', label: 'Medium', color: 'warning' },
    { key: 'high', label: 'High', color: 'danger' },
  ];
  return (
    <div className="space-y-4">
      <Card title="Today’s stress" icon={Waves}>
        <div className="flex flex-wrap items-center gap-6">
          <RingGauge value={number(today?.average)} max={100} label="Average stress" size={160} />
          <div>
            <p className="font-display text-3xl font-bold">{metric(today?.average)}</p>
            <p className="text-sm text-text-2">{str(today?.title) ?? 'No stress reading yet'}</p>
          </div>
        </div>
        <div className="mt-5">
          <StackedBars
            label="Stress breakdown"
            rows={[{ label: 'Today', values: portions }]}
            series={colors}
          />
        </div>
      </Card>
      <Card title="Stress over time">
        <BarSeries
          label="Daily stress minutes by level"
          data={days.map((day) => ({
            date: dateLabel(day.date),
            ...Object.fromEntries(
              colors.map(({ key }) => [
                key,
                number((day.minutes as Record<string, unknown> | undefined)?.[key]),
              ]),
            ),
          }))}
          xKey="date"
          series={colors.map(({ key, label, color }) => ({ key, label, color, stackId: 'stress' }))}
        />
        <BandLineChart
          label="Average daily stress"
          data={chartRows(days, ['average'])}
          dataKey="average"
          color="warning"
          height={140}
        />
      </Card>
      <p className="text-sm text-text-2">
        Garmin estimates stress from heart rate variability. It can also rise during exercise.
      </p>
    </div>
  );
}

function StepsPanel({ series }: { series: HealthSeries<Day> }) {
  const days = series.days;
  const today = latestWith(days, 'steps');
  const weeklyAverage = number(series.summary.weekly_average);
  const todayDate = new Date(`${series.to}T12:00:00`);
  const weekStart = new Date(todayDate);
  weekStart.setDate(todayDate.getDate() - ((todayDate.getDay() + 6) % 7));
  const intensity = days
    .filter((day) => day.date >= weekStart.toISOString().slice(0, 10))
    .reduce(
      (sum, day) =>
        sum + (number(day.moderate_minutes) ?? 0) + 2 * (number(day.vigorous_minutes) ?? 0),
      0,
    );
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Today’s steps" icon={Footprints}>
          <div className="flex flex-wrap items-center gap-5">
            <RingGauge
              value={number(today?.steps)}
              max={number(today?.goal) ?? 8000}
              label="Steps versus goal"
              size={160}
            />
            <div>
              <p className="font-display text-3xl font-bold">{metric(today?.steps)}</p>
              <p className="text-sm text-text-2">Goal {metric(today?.goal)}</p>
            </div>
          </div>
        </Card>
        <Card title="Weekly average">
          <p className="font-display text-4xl font-bold">{metric(weeklyAverage)}</p>
          <p className="text-sm text-text-2">Steps on days with readings</p>
          <p className="mt-3 text-sm">
            Floors up {metric(today?.floors_up)} · down {metric(today?.floors_down)}
          </p>
        </Card>
      </div>
      <Card title="Steps over time">
        <BarSeries
          label="Daily steps with Garmin goals"
          data={chartRows(days, ['steps', 'goal'])}
          xKey="date"
          series={[{ key: 'steps', label: 'Steps', color: 'accent' }]}
          goal={number(today?.goal) ?? undefined}
        />
      </Card>
      <Card title="Intensity minutes">
        <p className="font-display text-3xl font-bold">{Math.round(intensity)} min</p>
        <p className="text-sm text-text-2">This week · moderate plus twice vigorous</p>
        <BarSeries
          label="Daily intensity minutes"
          data={days.map((day) => ({
            date: dateLabel(day.date),
            moderate: number(day.moderate_minutes),
            vigorous:
              number(day.vigorous_minutes) === null ? null : number(day.vigorous_minutes)! * 2,
          }))}
          xKey="date"
          series={[
            { key: 'moderate', label: 'Moderate', color: 'success', stackId: 'intensity' },
            { key: 'vigorous', label: 'Vigorous ×2', color: 'warning', stackId: 'intensity' },
          ]}
          goal={number(today?.intensity_goal) ?? undefined}
        />
      </Card>
    </div>
  );
}

export default function HealthPage() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const segment = location.pathname.split('/')[2];
  const active: Tab = tabs.some((tab) => tab.id === segment) ? (segment as Tab) : 'overview';
  const range: Range = ranges.some((item) => item.value === params.get('range'))
    ? (params.get('range') as Range)
    : '4W';
  const overview = useWorkspaceQuery<Overview>(
    ['wellness', 'overview', range],
    `/wellness/overview?range=${range}`,
    { enabled: active === 'overview' },
  );
  const series = useWorkspaceQuery<HealthSeries<Day>>(
    ['wellness', active, range],
    `/wellness/${active}?range=${range}`,
    { enabled: active !== 'overview' },
  );
  const query = active === 'overview' ? overview : series;
  const setRange = (value: Range) => {
    const next = new URLSearchParams(params);
    next.set('range', value);
    setParams(next);
  };
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Listen to your body
        </p>
        <h1 className="font-display text-3xl font-bold md:text-4xl">Health</h1>
        <p className="mt-1 text-text-2">Your readings, with room for real life.</p>
      </header>
      <nav
        aria-label="Health sections"
        className="sticky top-0 z-20 -mx-4 flex gap-1 overflow-x-auto border-b border-border bg-bg/95 px-4 py-2 backdrop-blur md:mx-0 md:px-0"
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <Link
            key={id}
            to={`/health${id === 'overview' ? '' : `/${id}`}?range=${range}`}
            aria-current={active === id ? 'page' : undefined}
            className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-control px-3 text-sm font-medium ${active === id ? 'bg-accent-soft text-accent' : 'text-text-2 hover:bg-surface-2'}`}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>
      <SegmentedControl label="Health range" value={range} onChange={setRange} options={ranges} />
      {query.isPending ? (
        <div aria-label="Loading Health" className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : query.isError ? (
        <ErrorState message={query.error.message} retry={() => void query.refetch()} />
      ) : active === 'overview' ? (
        overview.data ? (
          <OverviewPanel data={overview.data} />
        ) : (
          <EmptyState title="No health data yet" text="Your readings will appear after a sync." />
        )
      ) : series.data ? (
        <>
          {active === 'sleep' && <SleepPanel series={series.data} />}
          {active === 'heart' && <HeartPanel series={series.data} />}
          {active === 'energy' && <EnergyPanel series={series.data} />}
          {active === 'stress' && <StressPanel series={series.data} />}
          {active === 'steps' && <StepsPanel series={series.data} />}
        </>
      ) : (
        <EmptyState title="No readings yet" text="Sync your watch to see your health trends." />
      )}
    </div>
  );
}
