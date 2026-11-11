import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useWorkspace } from '../../app/workspace-context';
import { Button, EmptyState, ErrorState, Skeleton, useToast } from '../../components/ui';
import { workspaceRequest } from '../../lib/api';
import { useActivity, usePreferences } from '../../lib/queries';
import type { ActivityDetail } from '../../lib/types';
import { DeeperSection } from './ActivityAdvanced';
import { SplitTabs } from './ActivityBreakdown';
import { ActivityEffort } from './ActivityEffort';
import { ActivityHeader } from './ActivityHeader';
import { ActivityMetrics } from './ActivityMetrics';
import { NoteEditor } from './ActivityNotes';
import { ActivityCharts, ActivityRoute } from './ActivityVisuals';

type Neighbors = { previous: string | null; next: string | null };

export default function ActivityDetailPage() {
  const { id = '' } = useParams();
  const { mode } = useWorkspace();
  const activity = useActivity(id);
  const preferences = usePreferences();
  const client = useQueryClient();
  const toast = useToast();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const neighbors = useQuery({
    queryKey: [mode, 'activity', id, 'neighbors'],
    queryFn: () =>
      workspaceRequest<Neighbors>(mode, `/activities/${encodeURIComponent(id)}/neighbors`),
    enabled: Boolean(id),
  });
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
      <div role="status" aria-label="Loading activity" className="space-y-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-96" />
      </div>
    );
  if (activity.isError)
    return <ErrorState message={activity.error.message} retry={() => void activity.refetch()} />;
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
  return (
    <div className="space-y-10">
      <ActivityHeader
        activity={data}
        previous={neighbors.data?.previous}
        next={neighbors.data?.next}
      />
      <ActivityMetrics activity={data} prefs={preferences.data} />
      {data.sport === 'strength' ? (
        <>
          <SplitTabs activity={data} units={preferences.data?.units ?? 'metric'} />
          <ActivityCharts activity={data} allowStrength />
        </>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <ActivityRoute
                activity={data}
                prefs={preferences.data}
                onFetch={() => fetchDetails.mutate()}
                fetching={fetchDetails.isPending}
                canFetch={mode === 'live'}
                hoverIndex={hoverIndex}
              />
            </div>
            <div className="lg:col-span-5">
              <ActivityEffort activity={data} />
            </div>
          </div>
          {data.detail_state === 'ready' && (
            <>
              <ActivityCharts
                activity={data}
                onHover={setHoverIndex}
                units={preferences.data?.units}
              />
              <SplitTabs activity={data} units={preferences.data?.units ?? 'metric'} />
            </>
          )}
        </>
      )}
      <NoteEditor key={data.id} activity={data} onSave={onNoteSave} />
      <DeeperSection activity={data} />
    </div>
  );
}
