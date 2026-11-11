import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../app/workspace-context';
import { ConnectFlow } from '../../components/connection/ConnectFlow';
import { Button, ErrorState, Skeleton, useToast } from '../../components/ui';
import { Drawer } from '../../components/ui/Overlays';
import { guideTopics } from '../../content/guide';
import { workspaceRequest } from '../../lib/api';
import { usePreferences, useStatus, useWorkspaceQuery } from '../../lib/queries';
import type { JourneyResponse, Preferences } from '../../lib/types';
import { WelcomeGoals } from './WelcomeGoals';
import { WelcomePreview } from './WelcomePreview';

export default function WelcomePage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const toast = useToast();
  const { mode, setMode } = useWorkspace();
  const prefs = usePreferences();
  const status = useStatus();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [path, setPath] = useState<'demo' | 'live'>('demo');
  const [connectionHelp, setConnectionHelp] = useState(false);
  const [minutesChoice, setMinutes] = useState<number | null>(null);
  const [sessionsChoice, setSessions] = useState<number | null>(null);
  const [unitsChoice, setUnits] = useState<'metric' | 'imperial' | null>(null);
  const [weekStartChoice, setWeekStart] = useState<'monday' | 'sunday' | null>(null);
  const suggestion = useWorkspaceQuery<JourneyResponse>(['welcome-goal'], '/journey', {
    enabled: step === 2 && Boolean(prefs.data),
  });
  const recommended = suggestion.data?.goal_suggestion;
  const minutes = minutesChoice ?? recommended?.minutes ?? prefs.data?.weekly_minutes ?? 150;
  const sessions = sessionsChoice ?? prefs.data?.weekly_sessions ?? 3;
  const units = unitsChoice ?? prefs.data?.units ?? 'metric';
  const weekStart = weekStartChoice ?? prefs.data?.week_start ?? 'monday';
  const save = useMutation({
    mutationFn: async (skip: boolean) => {
      const current = await workspaceRequest<Preferences>(mode, '/preferences');
      const next: Preferences = skip
        ? { ...current, onboarded: true }
        : {
            ...current,
            onboarded: true,
            weekly_minutes: minutes,
            weekly_sessions: sessions,
            units,
            week_start: weekStart,
          };
      await workspaceRequest(mode, '/preferences', { method: 'PUT', body: JSON.stringify(next) });
      return next;
    },
    onSuccess: (next) => {
      client.setQueryData([mode, 'preferences'], next);
      void client.invalidateQueries({ queryKey: [mode] });
      navigate('/');
    },
    onError: (error) => toast({ message: error.message }),
  });
  if (prefs.isPending)
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-80" />
      </div>
    );
  if (prefs.isError)
    return <ErrorState message={prefs.error.message} retry={() => void prefs.refetch()} />;
  const activeJob = status.data?.jobs.find(
    (job) => job.kind === 'sync' && ['queued', 'running'].includes(job.state),
  );
  return (
    <div
      className={
        step === 0 ? 'mx-auto max-w-[1080px] py-6 md:py-12' : 'mx-auto max-w-[520px] py-6 md:py-12'
      }
    >
      <div className="mb-12 flex items-center justify-between gap-4">
        <p className="type-caption text-text-2">Step {step + 1} of 3</p>
        <button
          type="button"
          disabled={save.isPending}
          onClick={() => save.mutate(true)}
          className="type-body text-text-2 underline hover:text-text"
        >
          Skip setup
        </button>
      </div>
      {step === 0 && (
        <>
          <WelcomePreview />
          <div className="mt-10 flex flex-wrap gap-3">
            <Button
              variant="primary"
              onClick={() => {
                setPath('live');
                setStep(1);
              }}
            >
              Connect Garmin
            </Button>
            <Button
              onClick={() => {
                setPath('demo');
                setMode('demo');
                setStep(2);
              }}
            >
              Explore with sample data
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setConnectionHelp(true)}
            className="mt-5 type-body text-text-2 underline hover:text-text"
          >
            How does the Garmin connection work?
          </button>
        </>
      )}
      {step === 1 && (
        <div className="space-y-7">
          <div>
            <h1 className="type-title text-text">Connect your Garmin.</h1>
            <p className="mt-2 type-body text-text-2">
              Your recent readings arrive first. You can continue while older history imports.
            </p>
          </div>
          <ConnectFlow
            onConnected={() => {
              setPath('live');
              setStep(2);
            }}
          />
          <div className="flex flex-wrap gap-3">
            <Button variant="quiet" onClick={() => setStep(0)}>
              <ArrowLeft size={16} /> Back
            </Button>
            <Button
              onClick={() => {
                setPath('demo');
                setMode('demo');
                setStep(2);
              }}
            >
              Continue with sample data
            </Button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-8">
          <WelcomeGoals
            minutes={minutes}
            sessions={sessions}
            units={units}
            weekStart={weekStart}
            suggestionReason={
              recommended && recommended.n >= 2
                ? 'Based on your last 4 weeks'
                : 'A starting point you can adjust'
            }
            onMinutes={setMinutes}
            onSessions={setSessions}
            onUnits={setUnits}
            onWeekStart={setWeekStart}
          />
          {path === 'live' && activeJob && (
            <p role="status" className="type-body text-text-2">
              Importing the last 90 days — {Math.round(activeJob.progress)}%
            </p>
          )}
          <div className="flex flex-wrap gap-3 border-t border-border pt-6">
            <Button variant="primary" disabled={save.isPending} onClick={() => save.mutate(false)}>
              {save.isPending ? 'Saving…' : 'Go to Overview'}
            </Button>
            <Button variant="quiet" onClick={() => setStep(path === 'live' ? 1 : 0)}>
              <ArrowLeft size={16} /> Back
            </Button>
          </div>
        </div>
      )}
      <Drawer
        open={connectionHelp}
        onOpenChange={setConnectionHelp}
        title={guideTopics['connecting-garmin'].title}
      >
        <div className="space-y-4 type-body text-text-2">
          {guideTopics['connecting-garmin'].paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </Drawer>
    </div>
  );
}
