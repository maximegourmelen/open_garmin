import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../app/workspace-context';
import { useToast } from '../../components/ui/toast-context';
import { tourSteps, type TourId } from '../../content/tour';
import { workspaceRequest } from '../../lib/api';
import { usePreferences } from '../../lib/queries';
import type { Preferences } from '../../lib/types';
import { TourOverlay } from './TourOverlay';
import { useMetricDrawer } from '../metric-drawer/metric-drawer-context';

function TourSession({ id, onEnd }: { id: TourId; onEnd: () => void }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const openMetric = useMetricDrawer();
  const steps = tourSteps[id];
  return paused ? null : (
    <TourOverlay
      key={steps[index].target}
      step={steps[index]}
      index={index}
      count={steps.length}
      onBack={() => setIndex((current) => Math.max(0, current - 1))}
      onNext={() => (index === steps.length - 1 ? onEnd() : setIndex((current) => current + 1))}
      onSkip={onEnd}
      onDemo={
        id === 'overview' && index === 2 && openMetric
          ? () => {
              setPaused(true);
              openMetric('sleep_duration', () => setPaused(false));
            }
          : undefined
      }
    />
  );
}

export function TourLauncher() {
  const location = useLocation();
  const navigate = useNavigate();
  const { mode } = useWorkspace();
  const client = useQueryClient();
  const toast = useToast();
  const prefs = usePreferences();
  const requested = new URLSearchParams(location.search).get('tour');
  const id: TourId | null =
    requested === '1' && location.pathname === '/'
      ? 'overview'
      : requested === 'activity' && /^\/activities\/[^/]+$/.test(location.pathname)
        ? 'activity'
        : null;
  const end = async () => {
    if (!id || !prefs.data) return;
    try {
      const next: Preferences = {
        ...prefs.data,
        tour_completed: Array.from(new Set([...(prefs.data.tour_completed ?? []), id])),
      };
      await workspaceRequest(mode, '/preferences', { method: 'PUT', body: JSON.stringify(next) });
      client.setQueryData([mode, 'preferences'], next);
      const params = new URLSearchParams(location.search);
      params.delete('tour');
      navigate(`${location.pathname}${params.size ? `?${params}` : ''}`, { replace: true });
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : 'Could not save tour progress' });
    }
  };
  return id && prefs.data ? (
    <TourSession key={`${mode}-${id}`} id={id} onEnd={() => void end()} />
  ) : null;
}
