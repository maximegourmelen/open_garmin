import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BandLineChart, BarSeries, ScatterPlot, StackedBars } from '../../components/charts';
import { Card, EmptyState, ErrorState, SegmentedControl, Skeleton } from '../../components/ui';
import { useDeeper } from '../../lib/queries';
import type { Range } from '../../lib/types';
import { RelationshipExplorer } from './RelationshipExplorer';
import { RunningFormTrends } from './RunningFormTrends';

const ranges: { value: Range; label: string }[] = [
  { value: '7D', label: '7D' },
  { value: '4W', label: '4W' },
  { value: '3M', label: '3M' },
  { value: '1Y', label: '1Y' },
];
const labelDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

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
          <RunningFormTrends rows={deeper.data.running_form} />
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
