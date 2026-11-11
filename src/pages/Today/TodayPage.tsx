import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '../../app/workspace-context';
import { EmptyState, ErrorState, Skeleton, useToast } from '../../components/ui';
import { workspaceRequest } from '../../lib/api';
import { usePreferences, useToday } from '../../lib/queries';
import { TodayCard } from './TodayCards';

type CheckinInput = {
  mood: number | null;
  energy: number | null;
  soreness: number | null;
  note: string;
};

export default function TodayPage() {
  const { mode } = useWorkspace();
  const today = useToday();
  const preferences = usePreferences();
  const queryClient = useQueryClient();
  const toast = useToast();
  const checkin = useMutation({
    mutationFn: (body: CheckinInput) =>
      workspaceRequest<{ reply?: { text: string } }>(mode, `/checkins/${today.data!.date}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: (result) => {
      toast({ message: result.reply?.text ?? 'Check-in saved' });
      void queryClient.invalidateQueries({ queryKey: [mode, 'today'] });
    },
  });

  if (today.isPending)
    return (
      <div className="mx-auto max-w-7xl space-y-4" aria-label="Loading Today">
        <Skeleton className="h-32" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  if (today.isError)
    return (
      <ErrorState
        message={today.error.message}
        retry={() => {
          void today.refetch();
        }}
      />
    );
  if (!today.data)
    return (
      <EmptyState
        title="Today is ready for you"
        text="Connect your watch or explore sample data to begin."
      />
    );
  const data = today.data;
  const layout = (data.layout.length ? data.layout : ['week', 'suggestion', 'checkin']).filter(
    (id) => !['streak', 'next_milestone', 'journey'].includes(id),
  );
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="flex flex-wrap items-start justify-between gap-4 rounded-card border border-border bg-surface p-5 md:p-7">
        <div className="max-w-3xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
            My Day ·{' '}
            {new Date(`${data.date}T12:00:00`).toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <h2 className="mb-3 text-2xl font-bold md:text-3xl">{data.greeting}</h2>
          <p className="type-body text-text-2">Your activity and health data at a glance.</p>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-12">
        {layout.map((id) => (
          <div
            key={id}
            className={
              id === 'week' || id === 'latest_activity' || id === 'insights'
                ? 'md:col-span-5 lg:col-span-5'
                : id === 'suggestion'
                  ? 'md:col-span-4 lg:col-span-4'
                  : 'md:col-span-3 lg:col-span-3'
            }
          >
            <div
              data-tour={
                id === 'week'
                  ? 'week'
                  : id === 'sleep'
                    ? 'metric-strip'
                    : id === 'suggestion'
                      ? 'guidance'
                      : undefined
              }
            >
              <TodayCard
                id={id}
                data={data}
                prefs={preferences.data}
                onCheckin={(value) => checkin.mutate(value)}
                checkinSaving={checkin.isPending}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
