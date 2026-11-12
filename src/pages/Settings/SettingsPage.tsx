import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui';
import { PageHeader } from '../../layout/PageHeader';
import { usePreferences } from '../../lib/queries';
import type { Preferences } from '../../lib/types';
import { AppearanceSection } from './AppearanceSection';
import { ConnectionSection } from './ConnectionSection';
import { DataSection } from './DataSection';
import { GoalsSection } from './GoalsSection';
import { HeartZonesSection } from './HeartZonesSection';
import { HelpAboutSection } from './HelpAboutSection';
import { UnitsSection } from './UnitsSection';
import { useSettingsAutosave } from './useSettingsAutosave';

const sections = [
  { id: 'goals', label: 'Goals' },
  { id: 'units', label: 'Units and region' },
  { id: 'zones', label: 'Heart-rate zones' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'connection', label: 'Garmin connection' },
  { id: 'data', label: 'Your data' },
  { id: 'help', label: 'Help' },
  { id: 'about', label: 'About' },
] as const;

function SettingsEditor({ initial }: { initial: Preferences }) {
  const model = useSettingsAutosave(initial);
  const [params] = useSearchParams();
  useEffect(() => {
    const section = params.get('section');
    if (section) document.getElementById(section)?.scrollIntoView?.({ block: 'start' });
  }, [params]);
  return (
    <div className="space-y-8">
      <PageHeader title="Settings" pageId="settings" />
      <div className="grid gap-10 lg:grid-cols-[180px_minmax(0,720px)]">
        <nav
          aria-label="Settings sections"
          className="flex gap-4 overflow-x-auto border-b border-border pb-3 lg:sticky lg:top-8 lg:h-fit lg:flex-col lg:border-b-0 lg:border-l lg:pl-4"
        >
          {sections.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="shrink-0 type-body text-text-2 hover:text-text hover:underline"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="min-w-0 space-y-12">
          <div id="goals" className="scroll-mt-8">
            <GoalsSection model={model} />
          </div>
          <div id="units" className="scroll-mt-8">
            <UnitsSection model={model} />
          </div>
          <div id="zones" className="scroll-mt-8">
            <HeartZonesSection model={model} />
          </div>
          <div id="appearance" className="scroll-mt-8">
            <AppearanceSection model={model} />
          </div>
          <div id="connection" className="scroll-mt-8">
            <ConnectionSection />
          </div>
          <div id="data" className="scroll-mt-8">
            <DataSection />
          </div>
          <div id="help" className="scroll-mt-8">
            <HelpAboutSection model={model} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const prefs = usePreferences();
  if (prefs.isPending)
    return (
      <div role="status" aria-label="Loading Settings" className="space-y-5">
        <Skeleton className="h-28" />
        <Skeleton className="h-72" />
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
