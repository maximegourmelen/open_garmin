import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, Star } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useWorkspace } from '../../app/workspace-context';
import { RouteMap, StreamCharts } from '../../components/charts';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  SegmentedControl,
  Skeleton,
  useToast,
} from '../../components/ui';
import { apiPath, workspaceRequest } from '../../lib/api';
import { downloadText } from '../../lib/download';
import { useActivity, usePreferences } from '../../lib/queries';
import type { ActivityDetail } from '../../lib/types';
import {
  ActivityStats,
  DeeperSection,
  EffortSection,
  NoteEditor,
  SplitTabs,
} from './ActivitySections';

export default function ActivityDetailPage() {
  const { id = '' } = useParams();
  const { mode } = useWorkspace();
  const activity = useActivity(id);
  const preferences = usePreferences();
  const client = useQueryClient();
  const toast = useToast();
  const [metric, setMetric] = useState<'pace' | 'hr' | 'elevation'>('pace');
  const [xAxis, setXAxis] = useState<'time' | 'distance'>('time');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const fetchDetails = useMutation({
    mutationFn: () =>
      workspaceRequest(mode, `/activities/${encodeURIComponent(id)}/details`, { method: 'POST' }),
    onSuccess: () => toast({ message: 'Detail download started. You can keep exploring.' }),
    onError: (error) => toast({ message: error.message }),
  });
  const saveNote = useMutation({
    mutationFn: (note: ActivityDetail['note']) =>
      workspaceRequest(mode, `/activities/${encodeURIComponent(id)}/note`, {
        method: 'PUT',
        body: JSON.stringify(note),
      }),
    onSuccess: () => {
      toast({ message: 'Note saved' });
      void client.invalidateQueries({ queryKey: [mode, 'activity', id] });
    },
    onError: (error) => toast({ message: error.message }),
  });
  const mutateNote = saveNote.mutate;
  const onNoteSave = useCallback((note: ActivityDetail['note']) => mutateNote(note), [mutateNote]);

  if (activity.isPending)
    return (
      <div aria-label="Loading activity" className="mx-auto max-w-7xl space-y-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-96" />
      </div>
    );
  if (activity.isError)
    return (
      <ErrorState
        message={activity.error.message}
        retry={() => {
          void activity.refetch();
        }}
      />
    );
  if (!activity.data)
    return (
      <EmptyState
        title="Activity not found"
        text="This activity is not in your workspace."
        action={
          <Link to="/activities">
            <Button>Back to activities</Button>
          </Link>
        }
      />
    );
  const data = activity.data;
  const streams = data.streams;
  const hasGps =
    streams &&
    streams.lat.filter((lat, index) => lat != null && streams.lon[index] != null).length >= 2;
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
  const hasChannels =
    streams &&
    ['speed', 'hr', 'elevation', 'cadence_spm', 'power'].some((key) =>
      (streams[key as keyof typeof streams] as (number | null)[]).some((value) => value != null),
    );
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Link
        to="/activities"
        className="inline-flex items-center gap-1 text-sm text-text-2 hover:text-accent"
      >
        <ArrowLeft size={16} />
        Activities
      </Link>
      <header className="flex flex-wrap justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold md:text-3xl">{data.name}</h2>
            {data.is_best && (
              <Star size={19} className="text-celebrate" aria-label="Personal best" />
            )}
          </div>
          <p className="mt-1 text-sm text-text-2">
            {new Date(data.start).toLocaleString(undefined, {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}{' '}
            · {data.device}
            {data.location_name ? ` · ${data.location_name}` : ''}
          </p>
        </div>
        <details className="relative">
          <summary className="flex min-h-10 cursor-pointer items-center gap-2 rounded-control border border-border-strong bg-surface-2 px-3 text-sm font-semibold">
            <Download size={16} />
            Export
          </summary>
          <div className="absolute right-0 z-10 mt-1 min-w-40 rounded-tile border border-border bg-surface p-1 shadow-xl">
            <button
              type="button"
              onClick={() =>
                downloadText(
                  `activity-${data.id}.json`,
                  JSON.stringify(data, null, 2),
                  'application/json',
                )
              }
              className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2"
            >
              JSON
            </button>
            {data.has_route && (
              <a
                href={apiPath(mode, `/activities/${encodeURIComponent(id)}/gpx`)}
                download
                className="block rounded-lg px-3 py-2 text-sm hover:bg-surface-2"
              >
                GPX route
              </a>
            )}
            {mode === 'live' && (
              <a
                href={apiPath(mode, `/activities/${encodeURIComponent(id)}/original`)}
                download
                className="block rounded-lg px-3 py-2 text-sm hover:bg-surface-2"
              >
                Original file
              </a>
            )}
          </div>
        </details>
      </header>
      <section className="rounded-card border border-border bg-surface p-4">
        <p className="type-body text-text-2">{data.summary.text}</p>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <div data-tour="activity-map">
          {data.sport !== 'strength' && data.detail_state !== 'ready' ? (
            <Card title="See the full picture">
              <p className="text-sm text-text-2">
                Download the detailed file from Garmin to see charts and splits.
              </p>
              <Button
                className="mt-3"
                disabled={mode === 'demo' || fetchDetails.isPending}
                onClick={() => fetchDetails.mutate()}
              >
                Fetch details
              </Button>
            </Card>
          ) : data.sport !== 'strength' && hasGps ? (
            <Card title="Your route">
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
              <div className="mt-3">
                <RouteMap
                  points={points}
                  colorBy={metric}
                  hoverIndex={hoverIndex}
                  unit={preferences.data?.units === 'imperial' ? 'mi' : 'km'}
                />
              </div>
            </Card>
          ) : (
            <Card title="Your route">
              <p className="text-sm text-text-2">No GPS route was recorded for this activity.</p>
            </Card>
          )}
        </div>
        <ActivityStats activity={data} prefs={preferences.data} />
      </div>
      <EffortSection activity={data} />
      {data.sport !== 'strength' && hasChannels && (
        <div data-tour="activity-chart">
          <Card title="Inside the activity">
            <div className="mb-3">
              <SegmentedControl
                label="Chart distance or time"
                value={xAxis}
                onChange={setXAxis}
                options={[
                  { value: 'time', label: 'Time' },
                  { value: 'distance', label: 'Distance' },
                ]}
              />
            </div>
            <StreamCharts streams={streams!} xAxis={xAxis} onHover={setHoverIndex} />
          </Card>
        </div>
      )}
      <SplitTabs activity={data} units={preferences.data?.units ?? 'metric'} />
      <NoteEditor key={data.id} activity={data} onSave={onNoteSave} />
      <DeeperSection activity={data} />
    </div>
  );
}
