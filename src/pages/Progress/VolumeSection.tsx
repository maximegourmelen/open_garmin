import { useState } from 'react';
import { BarSeries } from '../../components/charts';
import { SegmentedControl } from '../../components/ui';
import { Section } from '../../components/ui/Structure';
import type { TrendWeek } from '../../lib/types';
import { shortDate } from './trendFormat';

type Measure = 'time' | 'distance' | 'effort';
export function VolumeSection({
  weeks,
  units,
}: {
  weeks: TrendWeek[];
  units: 'metric' | 'imperial';
}) {
  const [measure, setMeasure] = useState<Measure>('time');
  const sports = [...new Set(weeks.flatMap((week) => Object.keys(week.by_sport)))];
  const distanceDivisor = units === 'imperial' ? 1609.344 : 1000;
  const series = {
    time: { key: 'value', label: 'Active minutes', color: 'data-1' },
    distance: {
      key: 'value',
      label: units === 'imperial' ? 'Miles' : 'Kilometres',
      color: 'data-1',
    },
    effort: { key: 'value', label: 'Effort points', color: 'data-1' },
  }[measure];
  return (
    <Section
      heading="Volume"
      description="Weekly totals. The lighter bar is the current week in progress."
      action={
        <SegmentedControl
          label="Volume measure"
          value={measure}
          onChange={(value) => setMeasure(value as Measure)}
          options={[
            { value: 'time', label: 'Time' },
            { value: 'distance', label: 'Distance' },
            { value: 'effort', label: 'Effort' },
          ]}
        />
      }
    >
      <BarSeries
        label={`Weekly ${series.label.toLowerCase()}`}
        data={weeks.map((week) => ({
          date: shortDate(week.start),
          value:
            measure === 'time'
              ? week.minutes
              : measure === 'distance'
                ? week.distance / distanceDivisor
                : week.effort,
          partial: week.partial,
        }))}
        xKey="date"
        series={[series]}
        goal={measure === 'time' ? weeks.at(-1)?.goal : undefined}
        partialKey="partial"
        height={280}
      />
      {sports.length > 1 && (
        <div className="space-y-3">
          <h3 className="type-label text-text">Recorded duration by sport</h3>
          <BarSeries
            label="Weekly recorded duration by sport"
            data={weeks.map((week) => ({
              date: shortDate(week.start),
              partial: week.partial,
              ...week.by_sport,
            }))}
            xKey="date"
            series={sports.map((sport) => ({
              key: sport,
              label: sport,
              color: `sport-${sport}`,
              stackId: 'sport',
            }))}
            partialKey="partial"
            height={160}
          />
        </div>
      )}
    </Section>
  );
}
