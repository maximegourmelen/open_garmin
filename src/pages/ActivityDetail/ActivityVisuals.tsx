import { useState } from 'react';
import { RouteMap, StreamCharts } from '../../components/charts';
import { Button, SegmentedControl } from '../../components/ui';
import { Section } from '../../components/ui/Structure';
import type { ActivityDetail, Preferences } from '../../lib/types';

export function ActivityRoute({
  activity,
  prefs,
  onFetch,
  fetching,
  canFetch,
  hoverIndex,
}: {
  activity: ActivityDetail;
  prefs?: Preferences;
  onFetch: () => void;
  fetching: boolean;
  canFetch: boolean;
  hoverIndex?: number | null;
}) {
  const [metric, setMetric] = useState<'pace' | 'hr' | 'elevation'>('pace');
  const streams = activity.streams;
  const hasGps =
    streams && streams.lat.filter((lat, i) => lat != null && streams.lon[i] != null).length >= 2;
  const points =
    streams?.lat.map((lat, index) => ({
      lat,
      lon: streams.lon[index],
      distance: streams.distance[index],
      value:
        metric === 'hr'
          ? streams.hr[index]
          : metric === 'elevation'
            ? streams.elevation[index]
            : streams.speed[index] && streams.speed[index]! > 0
              ? 1000 / streams.speed[index]!
              : null,
    })) ?? [];
  return (
    <Section
      heading="Route"
      className="h-full"
      action={
        hasGps ? (
          <SegmentedControl
            label="Colour route by"
            value={metric}
            onChange={setMetric}
            options={[
              { value: 'pace', label: 'Pace' },
              { value: 'hr', label: 'HR' },
              { value: 'elevation', label: 'Elevation' },
            ]}
          />
        ) : undefined
      }
    >
      {activity.detail_state !== 'ready' ? (
        <div className="flex min-h-72 flex-col justify-center gap-4 rounded-card border border-border bg-surface p-6">
          <p className="type-body text-text-2">
            Download the detailed file from Garmin to see the route, charts and splits.
          </p>
          <Button disabled={!canFetch || fetching} onClick={onFetch}>
            Download details
          </Button>
        </div>
      ) : hasGps ? (
        <div data-tour="activity-map" className="overflow-hidden rounded-card border border-border">
          <RouteMap
            points={points}
            colorBy={metric}
            hoverIndex={hoverIndex}
            unit={prefs?.units === 'imperial' ? 'mi' : 'km'}
          />
        </div>
      ) : (
        <p className="flex min-h-72 items-center justify-center rounded-card border border-border bg-surface type-body text-text-2">
          No GPS route was recorded.
        </p>
      )}
    </Section>
  );
}

export function ActivityCharts({
  activity,
  allowStrength = false,
  onHover,
  units = 'metric',
}: {
  activity: ActivityDetail;
  allowStrength?: boolean;
  onHover?: (index: number | null) => void;
  units?: 'metric' | 'imperial';
}) {
  const [xAxis, setXAxis] = useState<'time' | 'distance'>('time');
  const streams = activity.streams;
  const hasChannels =
    streams &&
    ['speed', 'hr', 'elevation', 'cadence_spm', 'power'].some((key) =>
      (streams[key as keyof typeof streams] as (number | null)[]).some((value) => value != null),
    );
  if (!hasChannels || (activity.sport === 'strength' && !allowStrength)) return null;
  const usesPace = ['running', 'walking', 'hiking'].includes(activity.sport);
  const chartStreams = usesPace
    ? {
        ...streams,
        speed: streams.speed.map((speed) =>
          speed && speed > 0 ? (units === 'metric' ? 1000 : 1609.344) / speed : null,
        ),
      }
    : streams;
  const channels =
    activity.sport === 'strength'
      ? [{ key: 'hr', label: 'Heart rate', color: 'danger' }]
      : [
          {
            key: 'speed',
            label: usesPace ? `Pace /${units === 'metric' ? 'km' : 'mi'}` : 'Speed',
            color: 'accent',
          },
          { key: 'hr', label: 'Heart rate', color: 'danger' },
          { key: 'elevation', label: 'Elevation', color: 'success' },
          { key: 'cadence_spm', label: 'Cadence', color: 'warning' },
          { key: 'power', label: 'Power', color: 'celebrate' },
        ];
  return (
    <Section
      heading="Charts"
      action={
        <SegmentedControl
          label="Chart distance or time"
          value={xAxis}
          onChange={(value) => setXAxis(value as 'time' | 'distance')}
          options={[
            { value: 'time', label: 'Time' },
            { value: 'distance', label: 'Distance' },
          ]}
        />
      }
    >
      <div data-tour="activity-chart">
        <StreamCharts streams={chartStreams} xAxis={xAxis} onHover={onHover} channels={channels} />
      </div>
    </Section>
  );
}
