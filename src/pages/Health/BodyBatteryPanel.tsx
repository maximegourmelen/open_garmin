import { Link } from 'react-router-dom';
import { BarSeries, RangeBars } from '../../components/charts';
import { Metric } from '../../components/data/Metric';
import { Section } from '../../components/ui/Structure';
import { HealthMeaning, HealthMetrics } from './HealthShared';
import { dateLabel, latest, number, type HealthData } from './healthUtils';

type Impact = { id: string; name: string; impact: number };

export function BodyBatteryPanel({ series }: { series: HealthData }) {
  const days = series.days;
  const today = latest(days, 'at_wake') ?? latest(days, 'latest');
  const impacts = days.flatMap((day) =>
    Array.isArray(day.activity_impacts) ? (day.activity_impacts as Impact[]) : [],
  );
  return (
    <div className="space-y-10">
      <HealthMetrics>
        <Metric id="body_battery" label="At wake" value={number(today?.at_wake)} size="lg" />
        <Metric id="body_battery_high" label="Highest" value={number(today?.high)} />
        <Metric id="body_battery_low" label="Lowest" value={number(today?.low)} />
        <Metric id="body_battery_charged" label="Charged" value={number(today?.charged)} />
        <Metric id="body_battery_drained" label="Drained" value={number(today?.drained)} />
      </HealthMetrics>
      <Section
        heading="Daily range"
        description="Each bar spans the day's lowest and highest Body Battery reading."
      >
        <RangeBars
          label="Body Battery daily low to high"
          data={days
            .slice(-14)
            .map((day) => ({ date: day.date, low: number(day.low), high: number(day.high) }))}
        />
        {number(today?.at_wake) !== null && (
          <p className="type-body text-text-2">
            Your latest morning level was {number(today?.at_wake)} out of 100.
          </p>
        )}
      </Section>
      <div className="grid gap-8 lg:grid-cols-2">
        <Section heading="Activity impacts">
          {impacts.length ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse type-body">
                <caption className="sr-only">Body Battery change after activities</caption>
                <thead>
                  <tr className="border-y border-border text-text-2">
                    <th scope="col" className="py-3 text-left font-normal">
                      Activity
                    </th>
                    <th scope="col" className="py-3 text-right font-normal">
                      Change
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {impacts
                    .slice(-10)
                    .reverse()
                    .map((item, index) => (
                      <tr key={`${item.id}-${index}`} className="border-b border-border">
                        <td className="py-3">
                          <Link to={`/activities/${item.id}`} className="hover:text-accent">
                            {item.name}
                          </Link>
                        </td>
                        <td className="py-3 text-right tabular-nums">
                          {item.impact > 0 ? '+' : ''}
                          {item.impact}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="type-body text-text-2">
              Activity impacts will appear after your watch records them.
            </p>
          )}
        </Section>
        <Section
          heading="Charged and drained"
          description="How much your Body Battery rose and fell each day."
        >
          <BarSeries
            label="Body Battery charged and drained"
            data={days.map((day) => ({
              date: dateLabel(day.date),
              charged: number(day.charged),
              drained: number(day.drained),
            }))}
            xKey="date"
            series={[
              { key: 'charged', label: 'Charged', color: 'positive' },
              { key: 'drained', label: 'Drained', color: 'data-muted' },
            ]}
            height={200}
          />
        </Section>
      </div>
      <HealthMeaning id="body_battery" />
    </div>
  );
}
