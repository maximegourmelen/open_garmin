import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '../../app/workspace-context';
import { EmptyState, ErrorState, Skeleton, useToast } from '../../components/ui';
import { PageHeader } from '../../layout/PageHeader';
import { workspaceRequest } from '../../lib/api';
import { formatDateTitle } from '../../lib/format';
import { useOverview, usePreferences } from '../../lib/queries';
import { OverviewFeeling } from './OverviewFeeling';
import { OverviewGuidance } from './OverviewGuidance';
import { OverviewLastNight } from './OverviewLastNight';
import { OverviewNotes, OverviewRecent } from './OverviewRecent';
import { OverviewWeek } from './OverviewWeek';

export default function TodayPage() {
  const { mode } = useWorkspace();
  const overview = useOverview();
  const preferences = usePreferences();
  const queryClient = useQueryClient();
  const toast = useToast();
  const checkin = useMutation({
    mutationFn: ({ mood, note }: { mood: number | null; note: string }) =>
      workspaceRequest(mode, `/checkins/${overview.data!.date}`, {
        method: 'PUT',
        body: JSON.stringify({
          mood,
          energy: overview.data?.feeling_today?.energy ?? null,
          soreness: overview.data?.feeling_today?.soreness ?? null,
          note,
        }),
      }),
    onSuccess: () => {
      toast({ message: 'Check-in saved' });
      void queryClient.invalidateQueries({ queryKey: [mode, 'overview'] });
    },
    onError: (error) => toast({ message: error.message }),
  });
  if (overview.isPending)
    return (
      <div aria-label="Loading Overview" className="space-y-5">
        <Skeleton className="h-28" />
        <Skeleton className="h-44" />
        <div className="grid gap-5 md:grid-cols-2">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      </div>
    );
  if (overview.isError)
    return <ErrorState message={overview.error.message} retry={() => void overview.refetch()} />;
  if (!overview.data)
    return (
      <EmptyState
        title="Your overview starts here"
        text="Connect your Garmin account or explore sample data to see last night's readings and this week's activity."
      />
    );
  const data = overview.data;
  return (
    <div className="space-y-9">
      <PageHeader
        title={formatDateTitle(data.date)}
        description={data.summary_sentence}
        pageId="overview"
      />
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-x-6 md:gap-y-10">
        <OverviewLastNight data={data.last_night} />
        <OverviewGuidance data={data.today} />
        <OverviewWeek data={data.week} />
        <OverviewRecent
          activities={data.recent_activities}
          date={data.date}
          units={preferences.data?.units ?? 'metric'}
        />
        <OverviewNotes notes={data.notes} />
        <OverviewFeeling
          data={data.feeling_today}
          saving={checkin.isPending}
          onSave={(mood, note) => checkin.mutate({ mood, note })}
        />
      </div>
    </div>
  );
}
