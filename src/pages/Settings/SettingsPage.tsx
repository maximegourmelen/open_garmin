import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronRight, HeartPulse, Info, Palette, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTheme } from '../../app/theme-context';
import { useWorkspace } from '../../app/workspace-context';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Pill,
  Skeleton,
  Switch,
  useToast,
} from '../../components/ui';
import { workspaceRequest } from '../../lib/api';
import { usePreferences, useStatus } from '../../lib/queries';
import type { Preferences, Sport } from '../../lib/types';
import { ConnectionSection, DataSection } from './ConnectionAndData';

type Section = 'profile' | 'zones' | 'units' | 'appearance' | 'connection' | 'data' | 'about';
const sections: { id: Section; label: string }[] = [
  { id: 'profile', label: 'Profile & goals' },
  { id: 'zones', label: 'Heart rate zones' },
  { id: 'units', label: 'Units & time' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'connection', label: 'Garmin connection' },
  { id: 'data', label: 'Your data' },
  { id: 'about', label: 'About' },
];
const sports: { value: Sport; label: string }[] = [
  { value: 'walking', label: 'Walking' },
  { value: 'running', label: 'Running' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'swimming', label: 'Swimming' },
  { value: 'strength', label: 'Strength' },
  { value: 'hiking', label: 'Hiking' },
  { value: 'other', label: 'Other' },
];
const inputClass =
  'mt-1 w-full rounded-control border border-border-strong bg-surface-2 px-3 py-2 text-text';
const zoneNames = ['Warm-up', 'Easy', 'Aerobic', 'Threshold', 'Maximum'];
const zoneFloor = [50, 60, 70, 80, 90];
function SettingsEditor({ initial }: { initial: Preferences }) {
  const { mode, session, refreshSession } = useWorkspace();
  const themeContext = useTheme();
  const client = useQueryClient();
  const toast = useToast();
  const status = useStatus();
  const [params, setParams] = useSearchParams();
  const section: Section =
    sections.find((item) => item.id === params.get('section'))?.id ?? 'profile';
  const [draft, setDraft] = useState<Preferences>(initial);
  const [displayName, setDisplayName] = useState(
    session?.user?.name ?? status.data?.user.name ?? 'Athlete',
  );
  const [savedName, setSavedName] = useState(displayName);
  const timezoneOptions =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const save = useMutation({
    mutationFn: async () => {
      if (!displayName.trim()) throw new Error('Enter a display name.');
      if (!timezoneOptions.includes(draft.timezone) && draft.timezone !== browserZone)
        throw new Error('Choose a timezone from the list.');
      await workspaceRequest(mode, '/preferences', { method: 'PUT', body: JSON.stringify(draft) });
      if (displayName.trim() !== savedName)
        await workspaceRequest(mode, '/profile', {
          method: 'PUT',
          body: JSON.stringify({ name: displayName.trim() }),
        });
    },
    onSuccess: () => {
      setSavedName(displayName.trim());
      themeContext.setTheme(draft.theme);
      document.documentElement.setAttribute('data-reduce-motion', String(draft.reduce_motion));
      void client.invalidateQueries({ queryKey: [mode] });
      if (mode === 'live') void refreshSession();
      toast({ message: 'Settings saved' });
    },
    onError: (error) => toast({ message: error.message }),
  });
  function chooseSection(value: Section) {
    const next = new URLSearchParams(params);
    next.set('section', value);
    setParams(next);
  }
  const set = <K extends keyof Preferences>(key: K, value: Preferences[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Make it yours</p>
        <h1 className="font-display text-3xl font-bold md:text-4xl">Settings</h1>
        <p className="mt-1 text-text-2">Choose how your space feels and what it tracks.</p>
      </header>
      <div className="grid gap-5 md:grid-cols-[220px_1fr]">
        <nav
          aria-label="Settings sections"
          className="flex gap-1 overflow-x-auto rounded-card border border-border bg-surface p-2 md:flex-col"
        >
          {sections.map((item) => (
            <button
              key={item.id}
              onClick={() => chooseSection(item.id)}
              aria-current={section === item.id ? 'page' : undefined}
              className={`flex min-h-10 shrink-0 items-center justify-between gap-3 rounded-control px-3 text-left text-sm ${section === item.id ? 'bg-accent-soft font-semibold text-accent' : 'text-text-2 hover:bg-surface-2'}`}
            >
              {item.label}
              <ChevronRight size={15} className="hidden md:block" />
            </button>
          ))}
        </nav>
        <div className="min-w-0 space-y-4">
          {section === 'profile' && (
            <Card title="Profile & goals" icon={UserRound}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  Display name
                  <input
                    className={inputClass}
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    maxLength={120}
                  />
                </label>
                <label className="text-sm">
                  Primary sport
                  <select
                    className={inputClass}
                    value={draft.primary_sport}
                    onChange={(event) => set('primary_sport', event.target.value as Sport)}
                  >
                    {sports.map((sport) => (
                      <option key={sport.value} value={sport.value}>
                        {sport.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Weekly active minutes
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    max="10080"
                    value={draft.weekly_minutes}
                    onChange={(event) => set('weekly_minutes', Number(event.target.value))}
                  />
                </label>
                <label className="text-sm">
                  Sessions each week
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    max="14"
                    value={draft.weekly_sessions}
                    onChange={(event) => set('weekly_sessions', Number(event.target.value))}
                  />
                </label>
                <label className="text-sm">
                  Daily steps goal source
                  <select
                    className={inputClass}
                    value={draft.steps_goal_source}
                    onChange={(event) =>
                      set(
                        'steps_goal_source',
                        event.target.value as Preferences['steps_goal_source'],
                      )
                    }
                  >
                    <option value="garmin">Garmin watch</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>
                {draft.steps_goal_source === 'custom' && (
                  <label className="text-sm">
                    Custom daily steps goal
                    <input
                      className={inputClass}
                      type="number"
                      min="1"
                      max="100000"
                      value={draft.steps_goal}
                      onChange={(event) => set('steps_goal', Number(event.target.value))}
                    />
                  </label>
                )}
              </div>
            </Card>
          )}
          {section === 'zones' && (
            <Card title="Heart rate zones" icon={HeartPulse}>
              <p className="mb-4 text-sm text-text-2">
                Garmin uses zone times from your watch when available. Custom zones use your maximum
                heart rate.
              </p>
              <label className="block text-sm">
                Zone source
                <select
                  className={inputClass}
                  value={draft.zone_source}
                  onChange={(event) =>
                    set('zone_source', event.target.value as Preferences['zone_source'])
                  }
                >
                  <option value="garmin">Garmin (from your watch)</option>
                  <option value="custom">Custom</option>
                </select>
              </label>
              {draft.zone_source === 'custom' && (
                <>
                  <label className="mt-4 block text-sm">
                    Maximum heart rate
                    <input
                      className={inputClass}
                      type="number"
                      min="120"
                      max="230"
                      value={draft.max_hr ?? ''}
                      onChange={(event) =>
                        set('max_hr', event.target.value ? Number(event.target.value) : null)
                      }
                      placeholder="Enter your measured max HR"
                    />
                  </label>
                  <p className="mt-2 text-xs text-text-3">
                    Use a measured value if you have one. Custom zones need a maximum heart rate to
                    calculate boundaries.
                  </p>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-border text-text-2">
                          <th className="p-2">Zone</th>
                          <th className="p-2">Name</th>
                          <th className="p-2">Range</th>
                        </tr>
                      </thead>
                      <tbody>
                        {zoneNames.map((label, i) => (
                          <tr key={label} className="border-b border-border">
                            <th className="p-2">Z{i + 1}</th>
                            <td className="p-2">{label}</td>
                            <td className="p-2">
                              {draft.max_hr
                                ? `${Math.round((draft.max_hr * zoneFloor[i]) / 100)}–${i === 4 ? draft.max_hr : Math.round((draft.max_hr * zoneFloor[i + 1]) / 100) - 1} bpm`
                                : `${zoneFloor[i]}–${i === 4 ? 100 : zoneFloor[i + 1]}% max`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Card>
          )}
          {section === 'units' && (
            <Card title="Units & time">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  Units
                  <select
                    className={inputClass}
                    value={draft.units}
                    onChange={(event) => set('units', event.target.value as Preferences['units'])}
                  >
                    <option value="metric">Metric · km, m</option>
                    <option value="imperial">Imperial · mi, ft</option>
                  </select>
                </label>
                <label className="text-sm">
                  Week starts
                  <select
                    className={inputClass}
                    value={draft.week_start}
                    onChange={(event) =>
                      set('week_start', event.target.value as Preferences['week_start'])
                    }
                  >
                    <option value="monday">Monday</option>
                    <option value="sunday">Sunday</option>
                  </select>
                </label>
                <label className="text-sm sm:col-span-2">
                  Timezone
                  <input
                    className={inputClass}
                    list="timezones"
                    value={draft.timezone}
                    onChange={(event) => set('timezone', event.target.value)}
                    autoComplete="off"
                  />
                  <datalist id="timezones">
                    <option value={browserZone}>{browserZone} · browser</option>
                    {timezoneOptions.map((zone) => (
                      <option key={zone} value={zone} />
                    ))}
                  </datalist>
                </label>
              </div>
            </Card>
          )}
          {section === 'appearance' && (
            <Card title="Appearance" icon={Palette}>
              <div className="grid gap-3 sm:grid-cols-3">
                {(['dark', 'light', 'system'] as const).map((choice) => (
                  <button
                    key={choice}
                    onClick={() => set('theme', choice)}
                    aria-pressed={draft.theme === choice}
                    className={`rounded-tile border p-3 text-left ${draft.theme === choice ? 'border-accent bg-accent-soft' : 'border-border bg-surface-2'}`}
                  >
                    <div
                      className={`mb-3 h-16 rounded-lg border ${choice === 'dark' ? 'border-slate-700 bg-slate-950' : choice === 'light' ? 'border-slate-300 bg-white' : 'border-slate-500 bg-gradient-to-r from-slate-950 to-white'}`}
                    />
                    <span className="text-sm font-medium">
                      {choice === 'system' ? 'Match system' : choice === 'dark' ? 'Dark' : 'Light'}
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-5">
                <Switch
                  label="Reduce motion"
                  checked={draft.reduce_motion}
                  onChange={(value) => set('reduce_motion', value)}
                />
              </div>
            </Card>
          )}
          {section === 'connection' && <ConnectionSection />}
          {section === 'data' && <DataSection />}
          {section === 'about' && (
            <Card title="About" icon={Info}>
              <p className="text-sm text-text-2">Open Garmin · version 0.1.0 · MIT licence.</p>
              <p className="mt-3 text-sm text-text-2">
                This independent app is not affiliated with, sponsored by or endorsed by Garmin. It
                helps you understand your own data; it is not medical advice.
              </p>
              <Link
                to="/methods"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent underline"
              >
                How it works <ChevronRight size={15} />
              </Link>
              <div className="mt-4">
                <Pill tone="accent">Built for beginners</Pill>
              </div>
            </Card>
          )}
          {!['connection', 'data', 'about'].includes(section) && (
            <div className="flex justify-end">
              <Button variant="primary" disabled={save.isPending} onClick={() => save.mutate()}>
                {save.isPending ? 'Saving…' : 'Save changes'} <Check size={16} />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default function SettingsPage() {
  const prefs = usePreferences();
  if (prefs.isPending)
    return (
      <div className="mx-auto max-w-6xl space-y-4" aria-label="Loading Settings">
        <Skeleton className="h-24" />
        <Skeleton className="h-96" />
      </div>
    );
  if (prefs.isError)
    return <ErrorState message={prefs.error.message} retry={() => void prefs.refetch()} />;
  if (!prefs.data)
    return (
      <EmptyState
        title="Settings are unavailable"
        text="Try again after your workspace is ready."
      />
    );
  return <SettingsEditor initial={prefs.data} />;
}
