import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { WorkspaceContext } from '../../app/workspace-context';
import { ToastProvider } from '../../components/ui';
import { MetricDrawerContext } from '../../features/metric-drawer/metric-drawer-context';
import type { OverviewResponse } from '../../lib/types';
import TodayPage from './TodayPage';

const mocks = vi.hoisted(() => ({ overview: vi.fn(), preferences: vi.fn(), request: vi.fn() }));
vi.mock('../../lib/queries', () => ({
  useOverview: mocks.overview,
  usePreferences: mocks.preferences,
}));
vi.mock('../../lib/api', () => ({ workspaceRequest: mocks.request }));
vi.mock('../../layout/PageHeader', () => ({
  PageHeader: ({ title, description }: { title: string; description: string }) => (
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  ),
}));

const metric = (value: number | null) => ({
  value,
  unit: '',
  usual_range: null,
  status: value === null ? ('missing' as const) : ('within' as const),
  delta: null,
  spark: [],
});
const overview = {
  date: '2026-11-09',
  summary_sentence: '30 of 150 active minutes this week.',
  last_night: {
    sleep: metric(435),
    resting_hr: metric(56),
    hrv: metric(48),
    body_battery: metric(72),
  },
  week: {
    active_minutes: 30,
    goal_minutes: 150,
    activity_count: 1,
    goal_activities: 3,
    activity_seconds: 2220,
    daily_active_minutes: [30, null, null, null, null, null, null],
    start: '2026-11-09',
    end: '2026-11-15',
  },
  today: {
    kind: 'easy',
    title: 'Keep it light',
    sentence: 'A walk fits today.',
    reasons: [{ label: 'Sleep', value: '7 h 15 min', metric_id: 'sleep' }],
  },
  recent_activities: [],
  notes: [
    { id: 'note', text: 'Your week is building', source: 'Recent activity', href: '/trends' },
  ],
  feeling_today: { mood: null, energy: 3, soreness: 1, note: '' },
} as OverviewResponse;

function mount(openMetric = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
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
            <MetricDrawerContext.Provider value={openMetric}>
              <TodayPage />
            </MetricDrawerContext.Provider>
          </ToastProvider>
        </WorkspaceContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.overview.mockReturnValue({ data: overview, isPending: false, isError: false });
  mocks.preferences.mockReturnValue({ data: { units: 'metric' } });
  mocks.request.mockResolvedValue({});
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test('shows the summary, distinct active and recorded time, and the main sections', () => {
  mount();
  expect(screen.getByText('30 of 150 active minutes this week.')).toBeTruthy();
  expect(screen.getByText(/1 of 3 activities/)).toBeTruthy();
  expect(screen.getByText(/37.*min recorded/)).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Last night' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Today' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Worth knowing' })).toBeTruthy();
});

test('every last-night metric label opens its explanation', () => {
  const open = vi.fn();
  mount(open);
  for (const [label, id] of [
    ['Sleep', 'sleep_duration'],
    ['Resting HR', 'resting_hr'],
    ['HRV', 'hrv'],
    ['Body Battery', 'body_battery'],
  ]) {
    fireEvent.click(screen.getByRole('button', { name: `About ${label}` }));
    expect(open).toHaveBeenLastCalledWith(id);
  }
});

test('a one-tap feeling saves in the selected workspace without erasing other check-in fields', async () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Feeling 4 of 5' }));
  await waitFor(() =>
    expect(mocks.request).toHaveBeenCalledWith(
      'demo',
      '/checkins/2026-11-09',
      expect.objectContaining({ method: 'PUT' }),
    ),
  );
  expect(JSON.parse(mocks.request.mock.calls[0][2].body)).toEqual({
    mood: 4,
    energy: 3,
    soreness: 1,
    note: '',
  });
});

test('loading, error and empty states explain what to do', () => {
  mocks.overview.mockReturnValue({ isPending: true });
  const view = mount();
  expect(screen.getByLabelText('Loading Overview')).toBeTruthy();
  view.unmount();
  const refetch = vi.fn();
  mocks.overview.mockReturnValue({
    isPending: false,
    isError: true,
    error: new Error('Connection lost'),
    refetch,
  });
  const failed = mount();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(refetch).toHaveBeenCalled();
  failed.unmount();
  mocks.overview.mockReturnValue({ isPending: false, isError: false, data: null });
  mount();
  expect(screen.getByText('Your overview starts here')).toBeTruthy();
});
