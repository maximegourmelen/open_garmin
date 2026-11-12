import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { WorkspaceContext } from '../../app/workspace-context';
import { ToastProvider } from '../../components/ui';
import { MetricDrawerContext } from '../../features/metric-drawer/metric-drawer-context';
import ProgressPage from './ProgressPage';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  deeper: vi.fn(),
  relationship: vi.fn(),
  open: vi.fn(),
}));
vi.mock('../../lib/queries', () => ({
  useWorkspaceQuery: mocks.query,
  usePreferences: () => ({ data: { units: 'metric', dismissed_hints: [] } }),
  useDeeper: mocks.deeper,
  useRelationship: mocks.relationship,
}));
const week = {
  start: '2026-11-02',
  end: '2026-11-08',
  minutes: 180,
  goal: 150,
  sessions: 4,
  distance: 18000,
  effort: 90,
  by_sport: { running: 120, walking: 70 },
  partial: false,
  goal_met: true,
  daily: [],
};
const data = {
  range: '30D',
  signals: [
    {
      id: 'resting_hr',
      status: 'improving',
      before: 60,
      after: 56,
      unit: 'bpm',
      spark: [60, 58, 56],
      sentence: 'Lower',
      n_before: 14,
      n_after: 14,
    },
    {
      id: 'efficiency',
      status: 'steady',
      before: 1.4,
      after: 1.41,
      unit: 'm/beat',
      spark: [1.4, 1.41],
      sentence: 'Steady',
      n_before: 8,
      n_after: 8,
    },
  ],
  volume: [week],
  consistency: {
    days: [{ date: '2026-11-05', minutes: 40 }],
    active_days_28: 11,
    streak: 2,
    best_streak: 4,
  },
  ramp: {
    band: 'steady',
    this_week: 80,
    average_four_weeks: 72,
    sentence: 'Right around your usual.',
  },
  records: [
    {
      kind: 'distance:5000',
      all_time: { activity_id: 'run-1', date: '2026-11-05', value: 1500, is_new: true },
    },
  ],
  reports: [week],
  method: 'trends@1',
};
function Location() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}
function mount(path = '/trends') {
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
            <MetricDrawerContext.Provider value={mocks.open}>
              <ProgressPage />
              <Location />
            </MetricDrawerContext.Provider>
          </ToastProvider>
        </WorkspaceContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}
beforeEach(() => mocks.query.mockReturnValue({ data, isPending: false, isError: false }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test('shows signal rows, volume, consistency, records, reports, and URL range', () => {
  mount();
  expect(screen.getByRole('heading', { name: 'Fitness signals' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Volume' })).toBeTruthy();
  expect(screen.getByText('Active on 11 of the last 28 days.')).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Records' })).toBeTruthy();
  expect(screen.getByRole('link', { name: /Week of Nov 2/ })).toBeTruthy();
  fireEvent.click(screen.getAllByRole('button', { name: 'About Resting heart rate' })[0]);
  expect(mocks.open).toHaveBeenCalledWith('resting_hr');
  fireEvent.click(screen.getByRole('button', { name: '90D' }));
  expect(screen.getByTestId('location').textContent).toBe('/trends?range=90D');
  fireEvent.click(screen.getByRole('radio', { name: 'Distance' }));
  expect(screen.getByRole('img', { name: /Weekly kilometres/ })).toBeTruthy();
  expect(mocks.deeper).not.toHaveBeenCalled();
});

test('advanced analysis only loads when opened', () => {
  mocks.deeper.mockReturnValue({ isPending: true });
  mocks.relationship.mockReturnValue({ isPending: true });
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Show advanced analysis' }));
  expect(mocks.deeper).toHaveBeenCalled();
});

test('loading, error, and empty states explain what to do', () => {
  mocks.query.mockReturnValue({ isPending: true });
  mount();
  expect(screen.getByLabelText('Loading Trends')).toBeTruthy();
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
    data: { ...data, volume: [{ ...week, minutes: null }] },
    isPending: false,
    isError: false,
  });
  mount();
  expect(screen.getByText('Your trends start here')).toBeTruthy();
});
