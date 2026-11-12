import { Link, useParams } from 'react-router-dom';
import { BarSeries } from '../../components/charts';
import { Metric, MetricStrip } from '../../components/data/Metric';
import { DataTable, EmptyState, ErrorState, Skeleton } from '../../components/ui';
import { Section } from '../../components/ui/Structure';
import { PageHeader } from '../../layout/PageHeader';
import { formatDistance, formatDurationSummary } from '../../lib/format';
import { usePreferences, useWorkspaceQuery } from '../../lib/queries';
import type { WeeklyReport } from '../../lib/types';
import { ReportHealth } from './ReportHealth';
import {
  numberText,
  recordNames,
  recordValue,
  shortDate,
  timeText,
  weekTitle,
} from './trendFormat';

export default function WeeklyReportPage() {
  const { weekStart = '' } = useParams();
  const query = useWorkspaceQuery<WeeklyReport>(
    ['weekly-report', weekStart],
    `/reports/week/${encodeURIComponent(weekStart)}`,
    { enabled: Boolean(weekStart) },
  );
  const prefs = usePreferences();
  const units = prefs.data?.units ?? 'metric';
  return (
    <div className="print-report mx-auto max-w-[720px] space-y-9">
      <PageHeader
        title={weekStart ? weekTitle(weekStart) : 'Weekly report'}
        description="A record of your activity and health readings for the week."
        back={{ href: '/trends', label: 'Back to Trends' }}
        action={
          <button
            type="button"
            className="rounded-control border border-border px-4 py-2 type-body hover:bg-surface-2"
            onClick={() => window.print()}
          >
            Print
          </button>
        }
      />
      {query.isPending ? (
        <div role="status" aria-label="Loading weekly report" className="space-y-5">
          <Skeleton className="h-28" />
          <Skeleton className="h-64" />
        </div>
      ) : query.isError ? (
        <ErrorState message={query.error.message} retry={() => void query.refetch()} />
      ) : !query.data ? (
        <EmptyState
          title="No report for this week"
          text="Choose a week from Trends to see its report."
        />
      ) : (
        <ReportBody report={query.data} units={units} />
      )}
    </div>
  );
}

function ReportBody({ report, units }: { report: WeeklyReport; units: 'metric' | 'imperial' }) {
  const comparison =
    report.previous_four_average === null || report.minutes === null
      ? 'More weeks of readings will make a comparison possible.'
      : report.minutes > report.previous_four_average * 1.1
        ? 'You recorded more active minutes than your previous four-week average.'
        : report.minutes < report.previous_four_average * 0.9
          ? 'You recorded fewer active minutes than your previous four-week average.'
          : 'Your active minutes were close to your previous four-week average.';
  return (
    <div className="space-y-10">
      <p className="type-body text-text-2">
        {report.summary}.{' '}
        {report.partial ? 'This week is still in progress.' : 'This week is complete.'}
      </p>
      <MetricStrip>
        <Metric
          id="active_minutes"
          label="Active minutes"
          value={numberText(report.minutes)}
          unit="min"
          size="lg"
          caption={`Goal ${numberText(report.goal)}`}
        />
        <Metric id="activity_count" label="Activities" value={report.sessions} />
        <Metric
          id="activity_distance"
          label="Distance"
          value={formatDistance(report.distance, units)}
        />
        <Metric id="effort" label="Effort" value={numberText(report.effort)} />
      </MetricStrip>
      <Section
        heading="Day by day"
        description="Active minutes from Garmin intensity readings, with missing days left blank."
      >
        <BarSeries
          label="Daily active minutes this week"
          data={report.daily.map((day) => ({ date: shortDate(day.date), minutes: day.minutes }))}
          xKey="date"
          series={[{ key: 'minutes', label: 'Active minutes', color: 'data-1' }]}
          height={200}
        />
      </Section>
      <Section heading="Activities">
        {report.activities.length ? (
          <DataTable
            caption="Activities this week"
            rows={report.activities}
            keyFor={(row) => row.id}
            columns={[
              { key: 'date', label: 'Date', value: (row) => shortDate(row.date) },
              {
                key: 'activity',
                label: 'Activity',
                value: (row) => (
                  <Link to={`/activities/${row.id}`} className="text-accent">
                    {row.name}
                  </Link>
                ),
              },
              { key: 'time', label: 'Time', value: (row) => formatDurationSummary(row.duration) },
              {
                key: 'distance',
                label: 'Distance',
                value: (row) => formatDistance(row.distance, units),
              },
            ]}
          />
        ) : (
          <p className="type-body text-text-2">No activities recorded this week.</p>
        )}
      </Section>
      <ReportHealth health={report.health} />
      <Section heading="Records set">
        {report.records.length ? (
          <ul className="space-y-2 type-body">
            {report.records.map((row) => (
              <li key={row.kind}>
                {recordNames[row.kind] ?? row.kind}:{' '}
                {recordValue(row.kind, row.all_time.value, units)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="type-body text-text-2">No new records this week.</p>
        )}
      </Section>
      <Section heading="Compared with your previous 4 weeks">
        <p className="type-body text-text-2">
          {comparison}{' '}
          {report.previous_four_average !== null &&
            `Previous average: ${timeText(report.previous_four_average)}.`}
        </p>
      </Section>
      <p className="type-caption text-text-3">
        Source: Garmin readings and recorded activities. Active minutes count vigorous time twice.
      </p>
    </div>
  );
}
