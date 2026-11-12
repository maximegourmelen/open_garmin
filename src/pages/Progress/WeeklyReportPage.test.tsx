import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { WorkspaceContext } from '../../app/workspace-context';
import { ToastProvider } from '../../components/ui';
import { MetricDrawerContext } from '../../features/metric-drawer/metric-drawer-context';
import WeeklyReportPage from './WeeklyReportPage';

const mocks = vi.hoisted(() => ({ query: vi.fn(), open: vi.fn() }));
vi.mock('../../lib/queries', () => ({
  useWorkspaceQuery: mocks.query,
  usePreferences: () => ({ data: { units: 'metric', dismissed_hints: [] } }),
}));
const report = {
  start: '2026-11-02',
  end: '2026-11-08',
  minutes: 180,
  goal: 150,
  sessions: 4,
  distance: 18000,
  effort: 90,
  by_sport: {},
  partial: false,
  goal_met: true,
  summary: '4 activities · 3 h 20 min',
  daily: [{ date: '2026-11-02', minutes: 40 }],
  activities: [
    {
      id: 'run-1',
      date: '2026-11-02',
      name: 'Morning run',
      sport: 'running',
      duration: 3600,
      distance: 8000,
      effort: 40,
    },
  ],
  health: {
    sleep: { current: 430, previous: 420 },
    resting_hr: { current: 55, previous: 57 },
    hrv: { current: 48, previous: 45 },
  },
  records: [],
  previous_four_average: 160,
  method: 'weekly_report@1',
};
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={['/trends/week/2026-11-02']}>
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
            <MetricDrawerContext.Provider value={mocks.open}>
              <Routes>
                <Route path="/trends/week/:weekStart" element={<WeeklyReportPage />} />
              </Routes>
            </MetricDrawerContext.Provider>
          </ToastProvider>
        </WorkspaceContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}
beforeEach(() => mocks.query.mockReturnValue({ data: report, isPending: false, isError: false }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test('shows printable weekly metrics, activities, health comparison, and drawer labels', () => {
  mount();
  expect(screen.getByRole('heading', { name: 'Week of Nov 2' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Day by day' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Morning run' })).toBeTruthy();
  expect(screen.getByText('180')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'About Resting heart rate' }));
  expect(mocks.open).toHaveBeenCalledWith('resting_hr');
  expect(screen.getByRole('button', { name: 'Print' })).toBeTruthy();
});

test('report loading, errors, and missing data are clear', () => {
  mocks.query.mockReturnValue({ isPending: true });
  mount();
  expect(screen.getByLabelText('Loading weekly report')).toBeTruthy();
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
  mocks.query.mockReturnValue({ data: null, isPending: false, isError: false });
  mount();
  expect(screen.getByText('No report for this week')).toBeTruthy();
});
