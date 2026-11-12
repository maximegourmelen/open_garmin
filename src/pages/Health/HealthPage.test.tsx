import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { WorkspaceContext } from '../../app/workspace-context';
import { ToastProvider } from '../../components/ui';
import { MetricDrawerContext } from '../../features/metric-drawer/metric-drawer-context';
import HealthPage from './HealthPage';

const mocks = vi.hoisted(() => ({ query: vi.fn(), openMetric: vi.fn() }));
vi.mock('../../lib/queries', () => ({
  useWorkspaceQuery: mocks.query,
  usePreferences: () => ({ data: { dismissed_hints: [] } }),
}));
const day = {
  date: '2026-11-08',
  minutes: 420,
  need_minutes: 450,
  score: 80,
  start: '2026-11-07T23:00:00',
  end: '2026-11-08T06:00:00',
  awake_count: 2,
  sentence: 'You got about what you needed.',
  stages: {
    deep: { minutes: 100, optimal_range_pct: [15, 25] },
    light: { minutes: 200 },
    rem: { minutes: 100 },
    awake: { minutes: 20 },
  },
  bedtime_minutes_from_noon: 660,
  wake_minutes_from_noon: 1080,
  resting_hr: 55,
  hr_min: 48,
  hr_max: 165,
  hrv: 45,
  hrv_weekly: 47,
  hrv_status: 'Balanced',
  balanced_low: 40,
  balanced_high: 60,
  latest: 70,
  at_wake: 80,
  high: 90,
  low: 30,
  charged: 60,
  drained: 40,
  activity_impacts: [{ id: 'a1', name: 'Morning run', impact: -8 }],
  average: 28,
  minutes_by_level: {},
  steps: 8500,
  goal: 9000,
  floors_up: 7,
  moderate_minutes: 20,
  vigorous_minutes: 10,
  intensity_goal: 150,
};
const health = {
  days: [day],
  summary: { bedtime_rhythm: { usual_minutes_after_18: 300, band_minutes: 30 } },
  from: '2026-11-08',
  to: '2026-11-08',
  range: '30D',
  sentences: [],
  method: 'wellness@1',
};

function Location() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}
function mount(path = '/health/sleep') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={client}>
        <WorkspaceContext.Provider
          value={{
            mode: 'demo',
            setMode: vi.fn(),
            session: null,
            booting: false,
            refreshSession: vi.fn(),
          }}
        >
          <ToastProvider>
            <MetricDrawerContext.Provider value={mocks.openMetric}>
              <Routes>
                <Route path="/health/:tab" element={<HealthPage />} />
              </Routes>
              <Location />
            </MetricDrawerContext.Provider>
          </ToastProvider>
        </WorkspaceContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}
beforeEach(() => mocks.query.mockReturnValue({ data: health, isPending: false, isError: false }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test('uses five planned tabs and keeps the date range in the URL', () => {
  mount();
  const nav = screen.getByRole('navigation', { name: 'Health sections' });
  expect(nav.querySelectorAll('a')).toHaveLength(5);
  fireEvent.click(screen.getByRole('button', { name: '7D' }));
  expect(screen.getByTestId('location').textContent).toBe('/health/sleep?range=7D');
  fireEvent.click(screen.getByRole('link', { name: 'Heart' }));
  expect(screen.getByTestId('location').textContent).toBe('/health/heart?range=7D');
  expect(screen.getByRole('heading', { name: 'Resting heart rate' })).toBeTruthy();
});

test('sleep shows explained metrics, hours chart, and percentage stage ranges', () => {
  mount();
  expect(screen.getByRole('button', { name: 'About Duration' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'About Duration' }));
  expect(mocks.openMetric).toHaveBeenCalledWith('sleep_duration');
  expect(screen.getByRole('img', { name: /Sleep stages in hours/ })).toBeTruthy();
  expect(screen.getByLabelText('Sleep stages').textContent).toContain('15–25% usual');
});

test('each health tab renders its main section', () => {
  for (const [path, heading] of [
    ['/health/heart', 'Resting heart rate'],
    ['/health/body-battery', 'Daily range'],
    ['/health/stress', 'Time by stress level'],
    ['/health/steps', 'Steps over time'],
  ]) {
    mount(path);
    expect(screen.getByRole('heading', { name: heading })).toBeTruthy();
    cleanup();
  }
});

test('loading, error, and missing sleep have clear states', () => {
  mocks.query.mockReturnValue({ isPending: true });
  mount();
  expect(screen.getByLabelText('Loading Health')).toBeTruthy();
  cleanup();
  mocks.query.mockReturnValue({
    isPending: false,
    isError: true,
    error: new Error('Offline'),
    refetch: vi.fn(),
  });
  mount();
  expect(screen.getByText('Offline')).toBeTruthy();
  cleanup();
  mocks.query.mockReturnValue({
    data: { ...health, days: [{ date: '2026-11-08', minutes: null }] },
    isPending: false,
    isError: false,
  });
  mount();
  expect(screen.getByText('No sleep readings yet')).toBeTruthy();
});

test('a tab with calendar days but no measurements shows its empty state', () => {
  mocks.query.mockReturnValue({
    data: { ...health, days: [{ date: '2026-11-08', steps: null }] },
    isPending: false,
    isError: false,
  });
  mount('/health/steps');
  expect(screen.getByText('No steps readings yet')).toBeTruthy();
});
