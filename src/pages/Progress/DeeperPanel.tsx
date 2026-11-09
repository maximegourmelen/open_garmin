import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BandLineChart,
  BarSeries,
  ScatterPlot,
  Sparkline,
  StackedBars,
} from '../../components/charts';
import {
  Card,
  EmptyState,
  ErrorState,
  SegmentedControl,
  Select,
  Skeleton,
} from '../../components/ui';
import { useDeeper, useRelationship } from '../../lib/queries';
import type { Range } from '../../lib/types';

const ranges: { value: Range; label: string }[] = [
  { value: '7D', label: '7D' },
  { value: '4W', label: '4W' },
  { value: '3M', label: '3M' },
  { value: '1Y', label: '1Y' },
];
const variables = [
  ['sleep_minutes', 'Sleep duration'],
  ['sleep_score', 'Sleep score'],
  ['hrv', 'HRV'],
  ['resting_hr', 'Resting heart rate'],
  ['bb_at_wake', 'Body Battery at wake'],
  ['stress_avg', 'Stress'],
  ['steps', 'Steps'],
  ['active_minutes', 'Active minutes'],
  ['effort_points', 'Effort points'],
  ['checkin_energy', 'Check-in energy'],
  ['checkin_mood', 'Check-in mood'],
].map(([value, label]) => ({ value, label }));
const labelDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function RelationshipExplorer({ range }: { range: Range }) {
  const [x, setX] = useState('sleep_minutes');
  const [y, setY] = useState('checkin_energy');
  const [lag, setLag] = useState(0);
  const relation = useRelationship(x, y, lag, range);
  return (
    <Card
      title="Relationships explorer"
      explainer={{
        what: 'Paired daily readings show how two values moved together.',
        why: 'Explore patterns in your own history.',
        source: 'Your Garmin and check-in data',
        method: 'relationship@1',
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          Compare
          <Select label="First value" value={x} onChange={setX} options={variables} />
        </label>
        <label className="space-y-1 text-sm">
          With
          <Select
            label="Second value"
            value={y}
            onChange={setY}
            options={variables.filter((item) => item.value !== x)}
          />
        </label>
        <label className="space-y-1 text-sm">
          Timing
          <Select
            label="Timing"
            value={String(lag)}
            onChange={(value) => setLag(Number(value))}
            options={[
              { value: '0', label: 'Same day' },
              { value: '1', label: 'Next day' },
            ]}
          />
        </label>
      </div>
      {relation.isPending ? (
        <Skeleton className="mt-4 h-48" />
      ) : relation.isError ? (
        <ErrorState message={relation.error.message} retry={() => void relation.refetch()} />
      ) : relation.data ? (
        <div className="mt-4">
          <p className="font-medium">{relation.data.words}</p>
          <p className="text-sm text-text-2">
            {relation.data.n} paired days
            {relation.data.rho !== null ? ` · Spearman ρ ${relation.data.rho}` : ''}
          </p>
          {relation.data.points.length ? (
            <ScatterPlot
              label={`${x} versus ${y}`}
              data={relation.data.points.map(([a, b]) => ({ x: a, y: b }))}
              xLabel={variables.find((item) => item.value === x)?.label}
              yLabel={variables.find((item) => item.value === y)?.label}
            />
          ) : (
            <EmptyState
              title="No paired days yet"
              text="More daily readings will make this comparison possible."
            />
          )}
          <p className="text-xs text-text-3">{relation.data.disclaimer}</p>
        </div>
      ) : null}
    </Card>
  );
}

export default function DeeperPanel() {
  const [range, setRange] = useState<Range>('3M');
  const deeper = useDeeper(range);
  return (
    <div className="space-y-4">
      <SegmentedControl label="Deeper range" value={range} onChange={setRange} options={ranges} />
      {deeper.isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : deeper.isError ? (
        <ErrorState message={deeper.error.message} retry={() => void deeper.refetch()} />
      ) : deeper.data ? (
        <>
          <Card title="Effort over time">
            <BarSeries
              label="Daily effort points"
              data={deeper.data.effort_trend.days.map((day) => ({
                date: labelDate(day.date),
                effort: day.effort,
              }))}
              xKey="date"
              series={[{ key: 'effort', label: 'Effort points', color: 'accent' }]}
            />
            <BandLineChart
              label="Seven-day effort average"
              data={deeper.data.effort_trend.days.map((day) => ({
                date: labelDate(day.date),
                acute: day.acute,
              }))}
              dataKey="acute"
              color="warning"
              height={150}
            />
            <BandLineChart
              label="Twenty-eight-day effort average"
              data={deeper.data.effort_trend.days.map((day) => ({
                date: labelDate(day.date),
                chronic: day.chronic,
              }))}
              dataKey="chronic"
              color="success"
              height={150}
            />
            <BandLineChart
              label="Short-term to long-term effort ratio"
              data={deeper.data.effort_trend.days.map((day) => ({
                date: labelDate(day.date),
                ratio: day.ratio,
              }))}
              dataKey="ratio"
              height={150}
            />
            <p className="mt-2 text-xs text-text-3">{deeper.data.effort_trend.caption}</p>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Intensity mix">
              <StackedBars
                label="Easy, moderate and hard minutes"
                rows={[
                  {
                    label: '4 weeks',
                    values: {
                      easy: deeper.data.intensity_mix.easy_minutes,
                      moderate: deeper.data.intensity_mix.moderate_minutes,
                      hard: deeper.data.intensity_mix.hard_minutes,
                    },
                  },
                ]}
                series={[
                  { key: 'easy', label: 'Easy', color: 'success' },
                  { key: 'moderate', label: 'Moderate', color: 'accent' },
                  { key: 'hard', label: 'Hard', color: 'danger' },
                ]}
              />
              <p className="mt-3 text-sm text-text-2">{deeper.data.intensity_mix.sentence}</p>
            </Card>
            <Card title="Garmin training benefit">
              {Object.entries(deeper.data.benefit_mix).length ? (
                <div className="space-y-2">
                  {Object.entries(deeper.data.benefit_mix).map(([label, count]) => (
                    <div
                      key={label}
                      className="flex justify-between border-b border-border py-1 text-sm"
                    >
                      <span>{label}</span>
                      <strong>{count} sessions</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-2">No Garmin training benefit labels yet.</p>
              )}
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Pace at heart rate">
              {deeper.data.pace_hr.length ? (
                <ScatterPlot
                  label="Pace versus average heart rate"
                  data={deeper.data.pace_hr.map((point) => ({
                    x: point.average_hr,
                    y: point.pace_s_per_km / 60,
                  }))}
                  xLabel="Heart rate (bpm)"
                  yLabel="Pace (min/km)"
                />
              ) : (
                <p className="text-sm text-text-2">
                  Running or walking sessions with pace and heart rate will appear here.
                </p>
              )}
            </Card>
            <Card title="5K estimate">
              <p className="font-display text-3xl font-bold">
                {deeper.data.five_k_estimate.seconds === null
                  ? '—'
                  : `${Math.floor(deeper.data.five_k_estimate.seconds / 60)}:${String(Math.round(deeper.data.five_k_estimate.seconds % 60)).padStart(2, '0')}`}
              </p>
              <p className="mt-2 text-sm text-text-2">{deeper.data.five_k_estimate.sentence}</p>
              {deeper.data.five_k_estimate.based_on && (
                <Link
                  className="mt-2 inline-block text-sm text-accent underline"
                  to={`/activities/${deeper.data.five_k_estimate.based_on.activity_id}`}
                >
                  Based on this activity
                </Link>
              )}
            </Card>
          </div>
          {deeper.data.running_form.some((row) =>
            Object.values(row).some((value) => typeof value === 'number'),
          ) && (
            <Card title="Running form trends">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(
                  [
                    { key: 'cadence_spm', label: 'Cadence', unit: 'spm' },
                    { key: 'stride_length_m', label: 'Stride length', unit: 'm' },
                    { key: 'ground_contact_ms', label: 'Ground contact', unit: 'ms' },
                    { key: 'vertical_oscillation_cm', label: 'Vertical oscillation', unit: 'cm' },
                    { key: 'vertical_ratio_pct', label: 'Vertical ratio', unit: '%' },
                  ] as const
                ).map(({ key, label, unit }) => (
                  <div key={key} className="rounded-tile bg-surface-2 p-3">
                    <p className="text-sm text-text-2">{label}</p>
                    <p className="font-display text-xl font-bold">
                      {[...deeper.data!.running_form].reverse().find((row) => row[key] !== null)?.[
                        key
                      ] ?? '—'}{' '}
                      {unit}
                    </p>
                    <Sparkline
                      label={`${label} trend`}
                      values={deeper.data!.running_form.map((row) => row[key])}
                    />
                  </div>
                ))}
              </div>
            </Card>
          )}
          {deeper.data.vo2max.length > 0 && (
            <Card title="Garmin VO₂ max">
              <BandLineChart
                label="Garmin VO2 max trend"
                data={deeper.data.vo2max.map((row) => ({
                  date: labelDate(row.date),
                  value: row.value,
                }))}
              />
            </Card>
          )}
        </>
      ) : (
        <EmptyState
          title="No deeper trends yet"
          text="Your training details will appear after more activities."
        />
      )}
      <RelationshipExplorer range={range} />
    </div>
  );
}
