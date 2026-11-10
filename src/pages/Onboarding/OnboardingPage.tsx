import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Moon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../app/workspace-context';
import { useTheme } from '../../app/theme-context';
import { ConnectFlow } from '../../components/connection/ConnectFlow';
import { Pip } from '../../components/companion';
import { Button, Card, ErrorState, Skeleton, useToast } from '../../components/ui';
import { workspaceRequest } from '../../lib/api';
import { useJourney, usePreferences } from '../../lib/queries';
import type { Preferences } from '../../lib/types';

const goals = [
  {
    id: 'move_more',
    title: 'Move more',
    detail: 'Make everyday movement feel easier.',
    journey: 'move_more_8w',
  },
  {
    id: 'start_running',
    title: 'Start running',
    detail: 'Ease from walking into running.',
    journey: 'walk_to_run_9w',
  },
  {
    id: 'build_habit',
    title: 'Build a habit',
    detail: 'Make room for movement each week.',
    journey: 'habit_4w',
  },
  {
    id: 'sleep_better',
    title: 'Sleep better',
    detail: 'Find a steadier bedtime rhythm.',
    journey: 'sleep_rhythm_4w',
  },
  {
    id: 'curious',
    title: 'Exploring',
    detail: 'Explore your data at your own pace.',
    journey: null,
  },
] as const;
type Goal = (typeof goals)[number]['id'];
const steps = ['Hello', 'Connect', 'Your goal', 'Weekly target', 'Make it yours', 'Done'];
function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { mode, setMode, session } = useWorkspace();
  const { setTheme } = useTheme();
  const client = useQueryClient();
  const toast = useToast();
  const prefs = usePreferences();
  const journey = useJourney();
  const [step, setStep] = useState(0);
  const [path, setPath] = useState<'demo' | 'live'>('demo');
  const [goal, setGoal] = useState<Goal>('move_more');
  const [minutes, setMinutes] = useState(90);
  const [sessions, setSessions] = useState(3);
  const [name, setName] = useState('Pip');
  const [tone, setTone] = useState<'cheerful' | 'calm'>('cheerful');
  const [theme, chooseTheme] = useState<'dark' | 'light' | 'system'>('system');
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');
  const skip = useMutation({
    mutationFn: async () => {
      if (!prefs.data) throw new Error('Preferences are still loading.');
      const next = { ...prefs.data, onboarded: true };
      await workspaceRequest(mode, '/preferences', {
        method: 'PUT',
        body: JSON.stringify(next),
      });
      return next;
    },
    onSuccess: (next) => {
      client.setQueryData([mode, 'preferences'], next);
      setTheme(next.theme);
      void client.invalidateQueries({ queryKey: [mode] });
      navigate('/');
    },
    onError: (error) => toast({ message: error.message }),
  });
  const save = useMutation({
    mutationFn: async () => {
      if (!prefs.data) throw new Error('Preferences are still loading.');
      const selected = goals.find((item) => item.id === goal)!;
      const targetMode = path === 'live' && session?.user ? 'live' : 'demo';
      const next: Preferences = {
        ...prefs.data,
        onboarded: true,
        goal_focus: goal,
        weekly_minutes: minutes,
        weekly_sessions: sessions,
        companion_name: name.trim() || 'Pip',
        companion_tone: tone,
        theme,
        units,
        journey: selected.journey
          ? { id: selected.journey, started: localDate(), paused: false, repeats: [] }
          : null,
      };
      await workspaceRequest(targetMode, '/preferences', {
        method: 'PUT',
        body: JSON.stringify(next),
      });
      return targetMode;
    },
    onSuccess: (targetMode) => {
      setTheme(theme);
      setMode(targetMode);
      setStep(5);
      void client.invalidateQueries({ queryKey: [targetMode] });
      toast({ message: 'Your space is ready' });
    },
    onError: (error) => toast({ message: error.message }),
  });
  const next = () => {
    if (step === 4) {
      save.mutate();
      return;
    }
    if (step === 2)
      setMinutes(journey.data?.goal_suggestion?.minutes ?? journey.data?.goal.minutes ?? 90);
    setStep((value) => Math.min(5, value + 1));
  };
  if (prefs.isPending)
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-96" />
      </div>
    );
  if (prefs.isError)
    return <ErrorState message={prefs.error.message} retry={() => void prefs.refetch()} />;
  return (
    <div className="mx-auto flex min-h-[75vh] max-w-2xl flex-col justify-center py-6">
      {step < 5 && (
        <div className="mb-3 text-right">
          <button
            className="text-sm text-text-2 underline hover:text-accent"
            disabled={save.isPending || skip.isPending}
            onClick={() => skip.mutate()}
          >
            Skip setup
          </button>
        </div>
      )}
      <div
        className="mb-5 flex justify-between gap-2"
        aria-label={`Step ${step + 1} of ${steps.length}`}
      >
        {steps.map((label, i) => (
          <div key={label} className="flex-1">
            <div className={`h-1.5 rounded-full ${i <= step ? 'bg-accent' : 'bg-surface-3'}`} />
            <span className="mt-1 block text-center text-[10px] text-text-3">{label}</span>
          </div>
        ))}
      </div>
      <Card title={steps[step]} className="min-h-96">
        <div className="space-y-5">
          {step === 0 && (
            <div className="text-center">
              <Pip pose="wave" size={140} />
              <h1 className="mt-3 font-display text-3xl font-bold">Hi, I’m Pip</h1>
              <p className="mx-auto mt-2 max-w-md text-text-2">
                I’ll help you make sense of your watch data and cheer you on.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Button
                  onClick={() => {
                    setPath('live');
                    setStep(1);
                  }}
                >
                  Connect my Garmin
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setPath('demo');
                    setMode('demo');
                    setStep(2);
                  }}
                >
                  Look around with sample data
                </Button>
              </div>
            </div>
          )}
          {step === 1 && (
            <>
              <div className="text-center">
                <Pip pose="thinking" size={72} />
                <h2 className="mt-2 font-display text-2xl font-bold">Bring your Garmin data in</h2>
              </div>
              <ConnectFlow
                onConnected={() => {
                  setPath('live');
                  setStep(2);
                }}
              />
              <Button
                variant="quiet"
                onClick={() => {
                  setPath('demo');
                  setMode('demo');
                  setStep(2);
                }}
              >
                Continue with sample data
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <div className="text-center">
                <Pip pose="stretch" size={72} />
                <h2 className="mt-2 font-display text-2xl font-bold">What’s your main goal?</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {goals.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={goal === item.id}
                    onClick={() => setGoal(item.id)}
                    className={`rounded-tile border p-4 text-left ${goal === item.id ? 'border-accent bg-accent-soft' : 'border-border bg-surface-2 hover:border-border-strong'}`}
                  >
                    <span className="flex items-center justify-between font-semibold">
                      {item.title}
                      {goal === item.id && <Check size={16} />}
                    </span>
                    <span className="mt-1 block text-sm text-text-2">{item.detail}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <div className="text-center">
                <Pip pose="cheer" size={72} />
                <h2 className="mt-2 font-display text-2xl font-bold">Your weekly goal</h2>
                <p className="mt-2 text-sm text-text-2">
                  Most people start with something that feels easy. You can change it any time.
                </p>
              </div>
              <label className="block text-sm">
                Active minutes: <strong>{minutes} min</strong>
                <input
                  className="mt-3 w-full accent-accent"
                  type="range"
                  min="30"
                  max="600"
                  step="5"
                  value={minutes}
                  onChange={(event) => setMinutes(Number(event.target.value))}
                />
              </label>
              <label className="block text-sm">
                Sessions per week: <strong>{sessions}</strong>
                <input
                  className="mt-3 w-full accent-accent"
                  type="range"
                  min="1"
                  max="7"
                  step="1"
                  value={sessions}
                  onChange={(event) => setSessions(Number(event.target.value))}
                />
              </label>
            </>
          )}
          {step === 4 && (
            <>
              <div className="text-center">
                <Pip pose="proud" size={72} />
                <h2 className="mt-2 font-display text-2xl font-bold">Make it yours</h2>
              </div>
              <label className="block text-sm">
                Companion name
                <input
                  className="mt-1 w-full rounded-control border border-border-strong bg-surface-2 p-2"
                  maxLength={20}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <div>
                <p className="mb-2 text-sm">Companion tone</p>
                <div className="flex gap-2">
                  {(['cheerful', 'calm'] as const).map((item) => (
                    <button
                      key={item}
                      aria-pressed={tone === item}
                      onClick={() => setTone(item)}
                      className={`rounded-control px-4 py-2 text-sm capitalize ${tone === item ? 'bg-accent-soft text-accent' : 'bg-surface-2'}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm">Theme</p>
                <div className="flex flex-wrap gap-2">
                  {(['dark', 'light', 'system'] as const).map((item) => (
                    <button
                      key={item}
                      aria-pressed={theme === item}
                      onClick={() => chooseTheme(item)}
                      className={`rounded-control px-4 py-2 text-sm capitalize ${theme === item ? 'bg-accent-soft text-accent' : 'bg-surface-2'}`}
                    >
                      {item === 'system' ? 'Match system' : item}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm">Units</p>
                <div className="flex gap-2">
                  {(['metric', 'imperial'] as const).map((item) => (
                    <button
                      key={item}
                      aria-pressed={units === item}
                      onClick={() => setUnits(item)}
                      className={`rounded-control px-4 py-2 text-sm capitalize ${units === item ? 'bg-accent-soft text-accent' : 'bg-surface-2'}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          {step === 5 && (
            <div className="text-center">
              <Pip pose="cheer" size={140} />
              <h2 className="mt-3 font-display text-3xl font-bold">You’re all set</h2>
              <p className="mt-2 text-text-2">
                First badge unlocked: <strong>Hello there</strong>.
              </p>
              <Button className="mt-6" onClick={() => navigate('/')}>
                Go to My Day <ArrowRight size={16} />
              </Button>
            </div>
          )}
          {step > 0 && step < 5 && (
            <div className="flex justify-between border-t border-border pt-4">
              <Button variant="quiet" onClick={() => setStep((value) => Math.max(0, value - 1))}>
                <ArrowLeft size={16} /> Back
              </Button>
              {step !== 1 && (
                <Button disabled={save.isPending} onClick={next}>
                  {step === 4 ? (save.isPending ? 'Saving…' : 'Finish') : 'Next'}{' '}
                  <ArrowRight size={16} />
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
      <p className="mt-4 text-center text-xs text-text-3">
        <Moon size={12} className="inline" /> You can revisit these choices in Settings.
      </p>
    </div>
  );
}
