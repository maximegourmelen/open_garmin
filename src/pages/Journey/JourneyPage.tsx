import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Flame, Pause, Play, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../../app/workspace-context';
import { Pip } from '../../components/companion';
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  Pill,
  ProgressBar,
  SegmentedControl,
  Sheet,
  Skeleton,
  useToast,
} from '../../components/ui';
import { workspaceRequest } from '../../lib/api';
import { useJourney, usePreferences } from '../../lib/queries';
import type {
  JourneyResponse,
  JourneyView,
  JourneyWeek,
  MilestoneView,
  Preferences,
} from '../../lib/types';
import { StoryViewer } from './StoryViewer';

type BadgeFilter = 'all' | 'earned' | 'next';
const dateLabel = (value: string) =>
  new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function JourneyPath({ weeks, current }: { weeks: JourneyWeek[]; current: number | null }) {
  if (!weeks.length) return null;
  const width = Math.max(360, weeks.length * 72);
  const points = weeks.map((_, i) => ({ x: 38 + i * 72, y: i % 2 ? 70 : 38 }));
  return (
    <div className="overflow-x-auto" aria-label="Journey week path">
      <svg
        viewBox={`0 0 ${width} 120`}
        className="h-32 min-w-full"
        style={{ width }}
        role="img"
        aria-label={`Journey path, ${weeks.length} weeks, current week ${current ?? 'none'}`}
      >
        <path
          d={`M ${points.map((point) => `${point.x} ${point.y}`).join(' L ')}`}
          fill="none"
          stroke="var(--border-strong)"
          strokeWidth="4"
          strokeDasharray="6 5"
        />
        {weeks.map((week, i) => (
          <g key={week.slot}>
            <circle
              cx={points[i].x}
              cy={points[i].y}
              r="18"
              fill={
                week.status === 'done'
                  ? 'var(--celebrate)'
                  : week.status === 'current'
                    ? 'var(--accent)'
                    : 'var(--surface-3)'
              }
              stroke="var(--border-strong)"
              strokeWidth="2"
            />
            <text
              x={points[i].x}
              y={points[i].y + 5}
              textAnchor="middle"
              fill={week.status === 'done' || week.status === 'current' ? 'white' : 'var(--text-2)'}
              fontSize="13"
              fontWeight="700"
            >
              {week.status === 'done' ? '★' : week.week}
            </text>
            <text x={points[i].x} y="107" textAnchor="middle" fill="var(--text-2)" fontSize="10">
              W{week.week}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function ActiveJourney({
  journey,
  onAction,
  onChange,
  busy,
}: {
  journey: JourneyView;
  onAction: (action: 'pause' | 'resume' | 'repeat_week' | 'leave') => void;
  onChange: () => void;
  busy: boolean;
}) {
  const current =
    journey.weeks.find((week) => week.slot === journey.current_slot) ?? journey.weeks.at(-1);
  return (
    <Card title="Your journey" icon={Sparkles} className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-3xl font-bold">{journey.name}</h3>
          <p className="mt-1 text-text-2">
            {journey.completed
              ? 'Journey complete'
              : `Week ${current?.week ?? 1} of ${journey.weeks.length}`}
            {journey.paused ? ' · Paused' : ''}
          </p>
        </div>
        <Pip pose={journey.completed ? 'proud' : journey.paused ? 'calm' : 'cheer'} size={72} />
      </div>
      <JourneyPath weeks={journey.weeks} current={journey.current_slot} />
      {current && (
        <div className="grid gap-4 sm:grid-cols-2">
          {current.targets.minutes !== undefined && (
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>Minutes</span>
                <strong>
                  {Math.round(current.actual.minutes)} / {current.targets.minutes}
                </strong>
              </div>
              <ProgressBar
                value={current.actual.minutes}
                max={current.targets.minutes}
                label="Journey minutes"
              />
            </div>
          )}
          {current.targets.sessions !== undefined && (
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>Sessions</span>
                <strong>
                  {current.actual.sessions} / {current.targets.sessions}
                </strong>
              </div>
              <ProgressBar
                value={current.actual.sessions}
                max={current.targets.sessions}
                label="Journey sessions"
              />
            </div>
          )}
          {current.targets.longest_minutes !== undefined && (
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>Longest session</span>
                <strong>
                  {Math.round(current.actual.longest_minutes)} / {current.targets.longest_minutes}{' '}
                  min
                </strong>
              </div>
              <ProgressBar
                value={current.actual.longest_minutes}
                max={current.targets.longest_minutes}
                label="Longest session"
              />
            </div>
          )}
          {current.targets.avg_steps !== undefined && (
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>Average steps</span>
                <strong>
                  {current.actual.avg_steps ?? '—'} / {current.targets.avg_steps}
                </strong>
              </div>
              <ProgressBar
                value={current.actual.avg_steps ?? 0}
                max={current.targets.avg_steps}
                label="Average steps"
              />
            </div>
          )}
          {current.targets.nights_at_need !== undefined && (
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>Restful nights</span>
                <strong>
                  {current.actual.nights_at_need} / {current.targets.nights_at_need}
                </strong>
              </div>
              <ProgressBar
                value={current.actual.nights_at_need}
                max={current.targets.nights_at_need}
                label="Restful nights"
              />
            </div>
          )}
        </div>
      )}
      {current?.targets.tip && (
        <p className="mt-4 rounded-tile bg-accent-soft p-3 text-sm text-text-2">
          {current.targets.tip}
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onChange}>
          Change journey
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => onAction(journey.paused ? 'resume' : 'pause')}
        >
          {journey.paused ? <Play size={16} /> : <Pause size={16} />}
          {journey.paused ? 'Resume' : 'Pause'}
        </Button>
        <Button
          variant="quiet"
          disabled={busy || journey.current_slot === null}
          onClick={() => onAction('repeat_week')}
        >
          <RotateCcw size={16} /> Repeat week
        </Button>
      </div>
    </Card>
  );
}

export default function JourneyPage() {
  const { mode } = useWorkspace();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [picker, setPicker] = useState(false);
  const [badgeFilter, setBadgeFilter] = useState<BadgeFilter>('all');
  const [badge, setBadge] = useState<MilestoneView | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const journey = useJourney();
  const preferences = usePreferences();
  const change = useMutation({
    mutationFn: (body: { id: string } | { action: string }) =>
      workspaceRequest<JourneyResponse>(mode, '/journey', {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      setPicker(false);
      setConfirmLeave(false);
      toast({ message: 'Journey updated' });
      void queryClient.invalidateQueries({ queryKey: [mode, 'journey'] });
      void queryClient.invalidateQueries({ queryKey: [mode, 'today'] });
    },
    onError: (error) => toast({ message: error.message }),
  });
  const acceptGoal = useMutation({
    mutationFn: (minutes: number) => {
      if (!preferences.data) throw new Error('Preferences are still loading.');
      return workspaceRequest(mode, '/preferences', {
        method: 'PUT',
        body: JSON.stringify({
          ...preferences.data,
          weekly_minutes: minutes,
        } satisfies Preferences),
      });
    },
    onSuccess: () => {
      toast({ message: 'Weekly goal updated' });
      void queryClient.invalidateQueries({ queryKey: [mode, 'preferences'] });
      void queryClient.invalidateQueries({ queryKey: [mode, 'journey'] });
      void queryClient.invalidateQueries({ queryKey: [mode, 'today'] });
    },
    onError: (error) => toast({ message: error.message }),
  });
  if (journey.isPending)
    return (
      <div className="mx-auto max-w-6xl space-y-4" aria-label="Loading Journey">
        <Skeleton className="h-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  if (journey.isError)
    return <ErrorState message={journey.error.message} retry={() => void journey.refetch()} />;
  if (!journey.data)
    return (
      <EmptyState
        title="Your journey starts here"
        text="Connect your watch or explore sample data to find a plan."
      />
    );
  const data = journey.data;
  const badges = data.milestones.filter(
    (item) => badgeFilter === 'all' || (badgeFilter === 'earned' ? item.earned : !item.earned),
  );
  const action = (value: 'pause' | 'resume' | 'repeat_week' | 'leave') =>
    value === 'leave' ? setConfirmLeave(true) : change.mutate({ action: value });
  const recapWeek = params.get('recap');
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Move with purpose
        </p>
        <h1 className="font-display text-3xl font-bold md:text-4xl">Your Journey</h1>
        <p className="mt-1 text-text-2">A path that fits your life, one week at a time.</p>
      </header>
      {data.journey ? (
        <ActiveJourney
          journey={data.journey}
          onAction={action}
          onChange={() => setPicker(true)}
          busy={change.isPending}
        />
      ) : (
        <EmptyState
          title="Choose a journey"
          text="Pick a gentle path. You can pause or change it whenever you need."
          action={<Button onClick={() => setPicker(true)}>Explore journeys</Button>}
        />
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Weekly goal" icon={Sparkles}>
          <p className="font-display text-3xl font-bold">
            {data.goal.minutes} min{' '}
            <span className="text-base font-normal text-text-2">
              across {data.goal.sessions} sessions
            </span>
          </p>
          {data.goal_suggestion && data.goal_suggestion.minutes !== data.goal.minutes && (
            <div className="mt-4 rounded-tile bg-accent-soft p-4">
              <p className="text-sm">{data.goal_suggestion.sentence}</p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  disabled={acceptGoal.isPending || !preferences.data}
                  onClick={() => acceptGoal.mutate(data.goal_suggestion!.minutes)}
                >
                  Use {data.goal_suggestion.minutes} min
                </Button>
                <Button
                  size="sm"
                  variant="quiet"
                  onClick={() => toast({ message: `Keeping ${data.goal.minutes} minutes` })}
                >
                  Keep {data.goal.minutes}
                </Button>
              </div>
            </div>
          )}
        </Card>
        <Card title="Your streak" icon={Flame}>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl font-bold text-celebrate">
              {data.streak.current}
            </span>
            <span className="text-text-2">weeks · best {data.streak.longest}</span>
          </div>
          {data.streak.at_risk && (
            <p className="mt-2 text-sm text-warning">
              {data.streak.remaining_minutes} minutes and {data.streak.remaining_sessions} sessions
              to keep it going.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Recent streak weeks">
            {data.streak.weeks.slice(-12).map((week) => (
              <span
                key={week.start}
                title={`${dateLabel(week.start)} · ${week.pct ?? 0}%`}
                className={`flex size-7 items-center justify-center rounded-full border text-xs ${week.met ? 'border-celebrate bg-celebrate text-white' : 'border-border-strong bg-surface-2 text-text-2'}`}
              >
                {week.met ? '★' : week.pct === null ? '○' : Math.round(week.pct / 10)}
              </span>
            ))}
          </div>
        </Card>
      </div>
      <Card title="Milestones" icon={Trophy}>
        <SegmentedControl
          label="Milestone filter"
          value={badgeFilter}
          onChange={setBadgeFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'earned', label: 'Earned' },
            { value: 'next', label: 'Next up' },
          ]}
        />
        {badges.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {badges.map((item) => (
              <button
                key={item.id}
                onClick={() => setBadge(item)}
                className={`rounded-tile border border-border p-4 text-left hover:border-accent ${item.earned ? 'bg-celebrate/10' : 'bg-surface-2'}`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`text-2xl ${item.earned ? '' : 'grayscale opacity-50'}`}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  <strong>{item.title}</strong>
                  {item.earned && <Pill tone="success">Earned</Pill>}
                </div>
                <p className="text-sm text-text-2">
                  {item.earned ? `Earned ${dateLabel(item.earned_on!)}` : item.how_to_earn}
                </p>
                {!item.earned && item.progress && (
                  <ProgressBar
                    className="mt-3"
                    value={item.progress.current}
                    max={item.progress.target}
                    label={`${item.title} progress`}
                  />
                )}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-text-2">No milestones in this group yet.</p>
        )}
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Weekly recaps">
          <div className="space-y-2">
            {data.recaps.length ? (
              data.recaps.map((recap) => (
                <button
                  key={recap.week_start}
                  onClick={() => setParams({ recap: recap.week_start })}
                  className="flex w-full items-center justify-between rounded-tile border border-border bg-surface-2 p-3 text-left hover:border-accent"
                >
                  <span>Week of {dateLabel(recap.week_start)}</span>
                  {recap.seen ? (
                    <span className="text-sm text-text-2">Watch again →</span>
                  ) : (
                    <Pill tone="accent">New story</Pill>
                  )}
                </button>
              ))
            ) : (
              <p className="text-sm text-text-2">Your stories appear after a completed week.</p>
            )}
          </div>
        </Card>
        <Card title="Check-in history">
          <div className="space-y-2">
            {data.checkins.length ? (
              data.checkins.map((entry) => (
                <div key={entry.date} className="flex gap-3 border-b border-border py-2 text-sm">
                  <span className="w-16 shrink-0 text-text-2">{dateLabel(entry.date)}</span>
                  <span aria-label={entry.mood ? `Mood ${entry.mood} of 5` : 'Mood not set'}>
                    {entry.mood ? ['😟', '😕', '😐', '🙂', '😊'][entry.mood - 1] : '—'}
                  </span>
                  <span
                    aria-label={entry.energy ? `Energy ${entry.energy} of 5` : 'Energy not set'}
                  >
                    ⚡{entry.energy ?? '—'}
                  </span>
                  <span className="min-w-0 text-text-2">{entry.note}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-text-2">Check in from My Day to see your history here.</p>
            )}
          </div>
        </Card>
      </div>
      <Dialog
        open={picker}
        onOpenChange={setPicker}
        title="Choose your journey"
        description="Start a path that feels right for you."
      >
        <div className="grid gap-3">
          {data.available.map((option) => (
            <div key={option.id} className="rounded-tile border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{option.name}</h3>
                  <p className="text-sm text-text-2">
                    {option.weeks.length} weeks ·{' '}
                    {option.weeks[0]?.tip ?? option.focus.replace('_', ' ')}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={change.isPending}
                  onClick={() => change.mutate({ id: option.id })}
                >
                  Start
                </Button>
              </div>
            </div>
          ))}
          {data.journey && (
            <Button variant="quiet" onClick={() => setConfirmLeave(true)}>
              Leave current journey
            </Button>
          )}
        </div>
      </Dialog>
      <Dialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="Leave this journey?"
        description="Your activity history and badges stay with you."
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmLeave(false)}>
            Keep journey
          </Button>
          <Button disabled={change.isPending} onClick={() => change.mutate({ action: 'leave' })}>
            Leave journey
          </Button>
        </div>
      </Dialog>
      <Sheet
        open={badge !== null}
        onOpenChange={(open) => !open && setBadge(null)}
        title={badge?.title ?? 'Milestone'}
      >
        {badge && (
          <div className="space-y-3">
            <div className="text-5xl" aria-hidden="true">
              {badge.icon}
            </div>
            <Pill tone={badge.earned ? 'success' : 'neutral'}>
              {badge.earned ? `Earned ${dateLabel(badge.earned_on!)}` : 'In progress'}
            </Pill>
            <p>{badge.description}</p>
            <p className="text-sm text-text-2">How to earn: {badge.how_to_earn}</p>
            {badge.progress && (
              <>
                <ProgressBar
                  value={badge.progress.current}
                  max={badge.progress.target}
                  label={`${badge.title} progress`}
                />
                <p className="text-sm text-text-2">
                  {badge.progress.current} / {badge.progress.target} {badge.progress.unit}
                </p>
              </>
            )}
          </div>
        )}
      </Sheet>
      {recapWeek && (
        <StoryViewer
          key={recapWeek}
          week={recapWeek}
          onClose={() => {
            const next = new URLSearchParams(params);
            next.delete('recap');
            setParams(next);
          }}
        />
      )}
    </div>
  );
}
