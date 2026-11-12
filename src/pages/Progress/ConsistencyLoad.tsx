import { useState } from 'react';
import { BulletChart, CalendarHeatmap } from '../../components/charts';
import { MetricLabel } from '../../components/data/Metric';
import { DataTable } from '../../components/ui';
import { Section } from '../../components/ui/Structure';
import type { TrendsResponse } from '../../lib/types';

export function ConsistencyLoad({ data }: { data: TrendsResponse }) {
  const [showCalendarTable, setShowCalendarTable] = useState(false);
  const ramp = data.ramp;
  const average = ramp.average_four_weeks;
  const loadText =
    ramp.band === 'too_early'
      ? 'Too early in the week to compare'
      : ramp.band === 'lighter'
        ? 'Lighter week'
        : ramp.band === 'building' || ramp.band === 'big_jump'
          ? 'Higher than usual'
          : ramp.band === 'steady'
            ? 'On track'
            : 'Building your history';
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Section heading="Consistency">
        {!showCalendarTable && <CalendarHeatmap days={data.consistency.days} />}
        <button
          type="button"
          className="type-caption text-text-2 underline hover:text-text"
          aria-expanded={showCalendarTable}
          onClick={() => setShowCalendarTable((show) => !show)}
        >
          {showCalendarTable ? 'View calendar' : 'View as table'}
        </button>
        {showCalendarTable && (
          <div className="max-h-72 overflow-y-auto">
            <DataTable
              caption="Recorded activity time by day"
              rows={data.consistency.days}
              keyFor={(day) => day.date}
              columns={[
                { key: 'date', label: 'Date', value: (day) => day.date },
                {
                  key: 'minutes',
                  label: 'Activity time',
                  value: (day) => `${Math.round(day.minutes)} min`,
                  numeric: true,
                },
              ]}
            />
          </div>
        )}
        <p className="type-body text-text-2">
          Active on {data.consistency.active_days_28} of the last 28 days.
        </p>
        <p className="type-caption text-text-3">
          Weekly goal met {data.consistency.streak}{' '}
          {data.consistency.streak === 1 ? 'week' : 'weeks'} in a row (best{' '}
          {data.consistency.best_streak}).
        </p>
      </Section>
      <Section heading="Load">
        <MetricLabel id="load" label="This week compared with usual effort" />
        <BulletChart
          label="This week compared with your four-week average"
          value={ramp.this_week}
          goal={average ?? undefined}
          range={average === null ? undefined : [average * 0.6, average * 1.3]}
          max={Math.max(100, ramp.this_week * 1.2, (average ?? 0) * 1.6)}
        />
        <p className="type-body text-text-2">{loadText}</p>
        <p className="type-caption text-text-3">{ramp.sentence}</p>
      </Section>
    </div>
  );
}
