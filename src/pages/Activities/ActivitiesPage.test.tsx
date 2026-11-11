import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { WorkspaceContext } from '../../app/workspace-context';
import { ToastProvider } from '../../components/ui';
import type { ActivitySummary } from '../../lib/types';
import ActivitiesPage from './ActivitiesPage';
import CompareActivitiesPage from './CompareActivities';

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../lib/api', () => ({ workspaceRequest: mocks.request }));
vi.mock('../../lib/queries', () => ({
  usePreferences: () => ({ data: { units: 'metric' } }),
  useWorkspaceQuery: () => ({ data: { days: [] } }),
}));

const date = new Date().toLocaleDateString('en-CA');
const base = {
  date,
  start: `${date}T07:00:00`,
  type: 'running',
  gap_speed: null,
  elevation: null,
  zone_minutes: [10, 20, 5, 0, 0] as (number | null)[],
  has_route: true,
  detail_state: 'ready',
  location_name: null,
  is_best: false,
  device: 'Watch',
  source: 'demo',
} as const;
const items = [
  {
    ...base,
    id: '1',
    name: 'Morning run',
    sport: 'running',
    distance: 5000,
    duration: 1800,
    average_speed: 2.78,
    average_hr: 140,
    effort_points: 42,
  },
  {
    ...base,
    id: '2',
    name: 'Evening walk',
    sport: 'walking',
    distance: 3000,
    duration: 2400,
    average_speed: 1.25,
    average_hr: 110,
    effort_points: 20,
  },
] as ActivitySummary[];

function LocationProbe() {
  const location = useLocation();
  return (
    <output data-testid="location">
      {location.pathname}
      {location.search}
    </output>
  );
}
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={['/activities']}>
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
            <Routes>
              <Route path="/activities" element={<ActivitiesPage />} />
              <Route path="/activities/compare" element={<CompareActivitiesPage />} />
            </Routes>
            <LocationProbe />
          </ToastProvider>
        </WorkspaceContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.request.mockImplementation((_mode: string, path: string) =>
    path.startsWith('/activities/')
      ? Promise.resolve({
          ...items.find((item) => path.endsWith(item.id)),
          streams: { hr: [100, 130, 140] },
        })
      : Promise.resolve({
          items,
          next_cursor: null,
          totals: { sessions: 2, duration: 4200, distance: 8000, effort_points: 62 },
        }),
  );
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test('lists activities, keeps filters in the URL, and compares two sessions', async () => {
  mount();
  expect((await screen.findAllByText('Morning run')).length).toBeGreaterThan(0);
  expect(screen.getAllByText('Evening walk').length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole('button', { name: '7D' }));
  expect(screen.getByTestId('location').textContent).toContain('range=7D');
  await screen.findAllByText('Morning run');
  fireEvent.click(screen.getByRole('button', { name: /^Sport/ }));
  fireEvent.click(await screen.findByRole('checkbox', { name: 'running' }));
  await waitFor(() =>
    expect(screen.getByTestId('location').textContent).toContain('sport=running'),
  );
  await screen.findAllByText('Morning run');
  fireEvent.click(screen.getByRole('button', { name: /^Compare$/ }));
  fireEvent.click((await screen.findAllByRole('checkbox', { name: 'Compare Morning run' }))[0]);
  fireEvent.click(screen.getAllByRole('checkbox', { name: 'Compare Evening walk' })[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Compare selected' }));
  expect(await screen.findByRole('heading', { name: 'Compare activities' })).toBeTruthy();
  expect(screen.getByTestId('location').textContent).toContain('/activities/compare?ids=1,2');
  expect(await screen.findByRole('table', { name: 'Activity metrics side by side' })).toBeTruthy();
});

test('calendar opens a day with activity and sleep context', async () => {
  mount();
  await screen.findAllByText('Morning run');
  fireEvent.click(screen.getByRole('radio', { name: 'Calendar' }));
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(`${date}: 2 activities`) }));
  expect(screen.getByRole('dialog', { name: date })).toBeTruthy();
  expect(screen.getByText('That night’s sleep')).toBeTruthy();
});

test('empty results explain the next action', async () => {
  mocks.request.mockResolvedValue({
    items: [],
    next_cursor: null,
    totals: { sessions: 0, duration: 0, distance: 0, effort_points: 0 },
  });
  mount();
  expect(await screen.findByText('Your activities will appear here')).toBeTruthy();
});

test('shows loading and recoverable error states', async () => {
  let rejectRequest: (error: Error) => void = () => undefined;
  mocks.request.mockImplementationOnce(
    () =>
      new Promise((_resolve, reject) => {
        rejectRequest = reject;
      }),
  );
  mount();
  expect(screen.getByLabelText('Loading activities')).toBeTruthy();
  rejectRequest(new Error('Activity service unavailable'));
  expect(await screen.findByText('Activity service unavailable')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
});

test('search updates the URL and activity query', async () => {
  mount();
  await screen.findAllByText('Morning run');
  fireEvent.change(screen.getByPlaceholderText('Search activities'), { target: { value: 'run' } });
  await waitFor(() => expect(screen.getByTestId('location').textContent).toContain('q=run'));
  await waitFor(() =>
    expect(mocks.request.mock.calls.some(([, path]) => String(path).includes('q=run'))).toBe(true),
  );
});
