import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MetricLabel } from '../../components/data/Metric';
import { DataTable } from '../../components/ui';
import { Section, Tag } from '../../components/ui/Structure';
import type { TrendsResponse } from '../../lib/types';
import { recordNames, recordValue, shortDate, timeText, weekTitle } from './trendFormat';

type RecordRow = TrendsResponse['records'][number];
export function RecordsSection({
  records,
  units,
}: {
  records: RecordRow[];
  units: 'metric' | 'imperial';
}) {
  const shown = records.filter((row) => recordNames[row.kind]);
  return (
    <Section heading="Records">
      {shown.length ? (
        <>
          <div className="divide-y divide-border border-y border-border md:hidden">
            {shown.map((row) => (
              <div
                key={row.kind}
                className="flex items-center justify-between gap-3 py-3 type-body"
              >
                <div className="min-w-0">
                  <MetricLabel id="record" label={recordNames[row.kind]} />
                  <p className="type-caption text-text-3">
                    {shortDate(row.all_time.date)}
                    {row.all_time.is_new ? ' · New' : ''}
                  </p>
                </div>
                <div className="shrink-0 text-right tabular-nums">
                  <p>{recordValue(row.kind, row.all_time.value, units)}</p>
                  {!row.all_time.activity_id.startsWith('week:') && (
                    <Link
                      to={`/activities/${row.all_time.activity_id}`}
                      className="type-caption text-accent"
                    >
                      View →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block">
            <DataTable
              caption="Personal records"
              rows={shown}
              keyFor={(row) => row.kind}
              columns={[
                {
                  key: 'record',
                  label: 'Record',
                  value: (row) => (
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <MetricLabel id="record" label={recordNames[row.kind]} />
                      {row.all_time.is_new && <Tag>New</Tag>}
                    </span>
                  ),
                },
                {
                  key: 'value',
                  label: 'Value',
                  value: (row) => recordValue(row.kind, row.all_time.value, units),
                },
                { key: 'date', label: 'Date', value: (row) => shortDate(row.all_time.date) },
                {
                  key: 'activity',
                  label: 'Activity',
                  value: (row) =>
                    row.all_time.activity_id.startsWith('week:') ? (
                      '—'
                    ) : (
                      <Link to={`/activities/${row.all_time.activity_id}`} className="text-accent">
                        View →
                      </Link>
                    ),
                },
              ]}
            />
          </div>
        </>
      ) : (
        <p className="type-body text-text-2">
          Records appear after activities with reliable details.
        </p>
      )}
    </Section>
  );
}

export function ReportsSection({ reports }: { reports: TrendsResponse['reports'] }) {
  const [visible, setVisible] = useState(8);
  return (
    <Section heading="Weekly reports" description="A clear summary of each week, ready to print.">
      <div className="divide-y divide-border border-y border-border">
        {reports.slice(0, visible).map((week) => (
          <Link
            key={week.start}
            to={`/trends/week/${week.start}`}
            className="flex flex-wrap items-center justify-between gap-2 py-3 type-body hover:text-accent"
          >
            <span>{weekTitle(week.start)}</span>
            <span className="text-text-2">
              {timeText(week.minutes)} · {week.sessions}{' '}
              {week.sessions === 1 ? 'activity' : 'activities'} ·{' '}
              {week.goal_met ? 'goal met' : week.partial ? 'in progress' : 'goal not met'}
            </span>
            <span aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
      {visible < reports.length && (
        <button
          type="button"
          className="type-body text-accent hover:underline"
          onClick={() => setVisible((count) => count + 12)}
        >
          Show all weeks
        </button>
      )}
    </Section>
  );
}
