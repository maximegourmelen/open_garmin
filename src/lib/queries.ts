import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '../app/workspace-context';
import { workspaceRequest } from './api';
import type {
  ActivityDetail,
  ActivityList,
  HealthSeries,
  Insight,
  JourneyResponse,
  Method,
  ProgressResponse,
  Range,
  StatusResponse,
  TodayResponse,
} from './types';

export function queryKey(mode: 'demo' | 'live', ...parts: unknown[]) {
  return [mode, ...parts] as const;
}

export function useWorkspaceQuery<T>(
  key: unknown[],
  path: string,
  options?: { enabled?: boolean; refetchInterval?: number },
) {
  const { mode } = useWorkspace();
  return useQuery({
    queryKey: queryKey(mode, ...key),
    queryFn: () => workspaceRequest<T>(mode, path),
    enabled: options?.enabled,
    refetchInterval: options?.refetchInterval,
  });
}

export function useStatus() {
  const { mode, booting } = useWorkspace();
  const client = useQueryClient();
  const previousRunning = useRef(false);
  const query = useQuery({
    queryKey: queryKey(mode, 'status'),
    queryFn: () => workspaceRequest<StatusResponse>(mode, '/status'),
    enabled: !booting,
    refetchInterval: (query) =>
      query.state.data?.jobs.some((job) => ['queued', 'running'].includes(job.state))
        ? 5000
        : 60000,
  });
  const running =
    query.data?.jobs.some((job) => ['queued', 'running'].includes(job.state)) ?? false;
  useEffect(() => {
    if (previousRunning.current && !running) void client.invalidateQueries({ queryKey: [mode] });
    previousRunning.current = running;
  }, [running, mode, client]);
  return query;
}

export const useToday = () =>
  useWorkspaceQuery<TodayResponse>(['today'], '/today', { refetchInterval: 60000 });
export const useActivities = (params = '') =>
  useWorkspaceQuery<ActivityList>(['activities', params], `/activities${params}`);
export const useActivity = (id: string) =>
  useWorkspaceQuery<ActivityDetail>(['activity', id], `/activities/${encodeURIComponent(id)}`, {
    enabled: Boolean(id),
  });
export const useWellness = (kind: string, range: Range = '4W') =>
  useWorkspaceQuery<HealthSeries>(['wellness', kind, range], `/wellness/${kind}?range=${range}`);
export const useProgress = () => useWorkspaceQuery<ProgressResponse>(['progress'], '/progress');
export const useDeeper = (range: Range = '4W') =>
  useWorkspaceQuery<Record<string, unknown>>(['deeper', range], `/progress/deeper?range=${range}`);
export const useJourney = () => useWorkspaceQuery<JourneyResponse>(['journey'], '/journey');
export const useInsights = () => useWorkspaceQuery<Insight[]>(['insights'], '/insights');
export const useMethods = () => useWorkspaceQuery<Method[]>(['methods'], '/methods');
export const useResearch = () =>
  useWorkspaceQuery<Record<string, unknown>>(['research'], '/research');
export const useRelationship = (x: string, y: string, lag: number, range: Range) =>
  useWorkspaceQuery<Record<string, unknown>>(
    ['relationships', x, y, lag, range],
    `/relationships?x=${encodeURIComponent(x)}&y=${encodeURIComponent(y)}&lag=${lag}&range=${range}`,
  );
export const useRecap = (week: string) =>
  useWorkspaceQuery<Record<string, unknown>>(['recap', week], `/recaps/${week}`, {
    enabled: Boolean(week),
  });
