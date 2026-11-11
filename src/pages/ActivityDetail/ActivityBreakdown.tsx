import { useState } from 'react';
import { Tabs } from '../../components/ui';
import { Section } from '../../components/ui/Structure';
import { formatDuration, formatPace } from '../../lib/format';
import type { ActivityDetail } from '../../lib/types';

export function SplitTabs({
  activity,
  units,
}: {
  activity: ActivityDetail;
  units: 'metric' | 'imperial';
}) {
  const [tab, setTab] = useState(activity.sport === 'strength' ? 'sets' : 'splits');
  const splits = units === 'metric' ? activity.splits_km : activity.splits_mi;
  return (
    <Section heading={activity.sport === 'strength' ? 'Exercises' : 'Splits and laps'}>
      <Tabs
        value={tab}
        onChange={setTab}
        label="Activity breakdown"
        tabs={
          activity.sport === 'strength'
            ? [
                { value: 'sets', label: 'Sets' },
                { value: 'laps', label: 'Laps' },
              ]
            : [
                { value: 'splits', label: `Splits (${units === 'metric' ? 'km' : 'mi'})` },
                { value: 'laps', label: 'Watch laps' },
              ]
        }
      />
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[540px] border-collapse text-left type-body">
          <caption className="sr-only">
            {tab === 'sets' ? 'Exercise sets' : 'Activity splits and laps'}
          </caption>
          <thead>
            <tr className="border-y border-border text-text-2">
              <th scope="col" className="py-3 font-normal">
                {tab === 'sets'
                  ? 'Set'
                  : tab === 'splits'
                    ? units === 'metric'
                      ? 'km'
                      : 'mi'
                    : 'Lap'}
              </th>
              <th scope="col" className="py-3 text-right font-normal">
                Time
              </th>
              <th scope="col" className="py-3 text-right font-normal">
                {tab === 'sets' ? 'Exercise' : 'Pace'}
              </th>
              <th scope="col" className="py-3 text-right font-normal">
                {tab === 'sets' ? 'Reps' : 'HR'}
              </th>
              <th scope="col" className="py-3 text-right font-normal">
                {tab === 'sets' ? 'Weight' : 'Elevation'}
              </th>
              {tab === 'splits' && (
                <th scope="col" className="py-3 text-right font-normal">
                  Relative pace
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {tab === 'splits'
              ? splits.map((split) => (
                  <tr key={split.index} className="border-t border-border">
                    <td className="py-3">{split.index}</td>
                    <td className="py-3 text-right tabular-nums">{formatDuration(split.time_s)}</td>
                    <td className="py-3 text-right tabular-nums">
                      {split.pace_s == null
                        ? '—'
                        : `${Math.floor(split.pace_s / 60)}:${String(Math.round(split.pace_s) % 60).padStart(2, '0')}`}
                      {split.partial && <span className="ml-1 text-xs text-text-3">partial</span>}
                    </td>
                    <td className="py-3 text-right tabular-nums">{split.avg_hr ?? '—'}</td>
                    <td className="py-3 text-right tabular-nums">
                      {split.elev_gain_m == null ? '—' : `+${Math.round(split.elev_gain_m)}m`}
                    </td>
                    <td className="py-3 pl-3">
                      {split.pace_s != null &&
                        activity.average_speed &&
                        activity.average_speed > 0 && (
                          <span
                            className="ml-auto block h-1.5 max-w-24 rounded-sm bg-surface-2"
                            title="Relative to average pace"
                          >
                            <span
                              className="block h-full rounded-sm bg-accent"
                              style={{
                                width: `${Math.min(100, Math.max(10, (1000 / activity.average_speed / split.pace_s) * 70))}%`,
                              }}
                            />
                          </span>
                        )}
                    </td>
                  </tr>
                ))
              : tab === 'laps'
                ? activity.laps.map((lap, index) => (
                    <tr key={index} className="border-t border-border">
                      <td className="py-3">{index + 1}</td>
                      <td className="py-3 text-right tabular-nums">
                        {formatDuration(typeof lap.duration === 'number' ? lap.duration : null)}
                      </td>
                      <td className="py-3 text-right tabular-nums">
                        {formatPace(typeof lap.speed === 'number' ? lap.speed : null, units)}
                      </td>
                      <td className="py-3 text-right tabular-nums">{String(lap.hr ?? '—')}</td>
                      <td className="py-3 text-right tabular-nums">
                        {String(lap.elevation ?? '—')}
                      </td>
                    </tr>
                  ))
                : activity.sets.map((set, index) => (
                    <tr key={index} className="border-t border-border">
                      <td className="py-3">{index + 1}</td>
                      <td className="py-3 text-right tabular-nums">
                        {formatDuration(typeof set.duration === 'number' ? set.duration : null)}
                      </td>
                      <td className="py-3 text-right">{String(set.exercise ?? 'Set')}</td>
                      <td className="py-3 text-right tabular-nums">{String(set.reps ?? '—')}</td>
                      <td className="py-3 text-right tabular-nums">{String(set.weight ?? '—')}</td>
                    </tr>
                  ))}
          </tbody>
        </table>
        {((tab === 'splits' && !splits.length) ||
          (tab === 'laps' && !activity.laps.length) ||
          (tab === 'sets' && !activity.sets.length)) && (
          <p className="py-4 text-sm text-text-2">No {tab} data was recorded.</p>
        )}
      </div>
    </Section>
  );
}
