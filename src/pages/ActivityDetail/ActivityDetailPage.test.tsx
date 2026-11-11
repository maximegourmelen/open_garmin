import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { WorkspaceContext } from '../../app/workspace-context';
import { ToastProvider } from '../../components/ui';
import { sample } from './activityFixture';
import ActivityDetailPage from './ActivityDetailPage';

const mocks = vi.hoisted(() => ({ useActivity: vi.fn(), request: vi.fn() }));
vi.mock('../../lib/queries', () => ({
  useActivity: mocks.useActivity,
  usePreferences: () => ({ data: { units: 'metric', companion_enabled: true } }),
}));
vi.mock('../../lib/api', () => ({
  apiPath: (_mode: string, path: string) => `/api/demo${path}`,
  workspaceRequest: mocks.request,
}));

function mount(mode: 'demo' | 'live' = 'demo') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={['/activities/a1']}>
      <QueryClientProvider client={client}>
        <WorkspaceContext.Provider
          value={{ mode, setMode: vi.fn(), session: null, booting: false, refreshSession: vi.fn() }}
        >
          <ToastProvider>
            <Routes>
              <Route path="/activities/:id" element={<ActivityDetailPage />} />
            </Routes>
          </ToastProvider>
        </WorkspaceContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.useActivity.mockReturnValue({ data: sample, isPending: false, isError: false });
  mocks.request.mockImplementation((_mode: string, path: string) =>
    Promise.resolve(path.endsWith('/neighbors') ? { previous: 'a0', next: 'a2' } : { ok: true }),
  );
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test('renders route, synchronized streams, zones, and watch laps', () => {
  mount();
  expect(screen.getByRole('img', { name: 'Activity route' })).toBeTruthy();
  expect(screen.getByRole('img', { name: /Heart rate over activity/ })).toBeTruthy();
  expect(screen.getByLabelText('Heart rate zones').textContent).toMatch(/^Z5.*Z4.*Z3.*Z2.*Z1/);
  fireEvent.click(screen.getByRole('tab', { name: 'Watch laps' }));
  expect(screen.getByRole('table').textContent).toContain('140');
});

test('shows six explained metrics and navigation to adjacent activities', async () => {
  mount();
  expect(screen.getByRole('group', { name: 'Key metrics' }).textContent).toContain(
    'Elevation gain',
  );
  expect(
    screen.getByRole('group', { name: 'Key metrics' }).querySelectorAll('[data-metric-id]'),
  ).toHaveLength(6);
  expect(
    (await screen.findByRole('link', { name: 'Previous activity' })).getAttribute('href'),
  ).toBe('/activities/a0');
  expect(screen.getByRole('link', { name: 'Next activity' }).getAttribute('href')).toBe(
    '/activities/a2',
  );
});

test('renders loading, error, empty, and strength states', () => {
  mocks.useActivity.mockReturnValue({ isPending: true });
  mount();
  expect(screen.getByLabelText('Loading activity')).toBeTruthy();
  cleanup();
  mocks.useActivity.mockReturnValue({
    isPending: false,
    isError: true,
    error: new Error('Unavailable'),
    refetch: vi.fn(),
  });
  mount();
  expect(screen.getByText('Unavailable')).toBeTruthy();
  cleanup();
  mocks.useActivity.mockReturnValue({ isPending: false, isError: false, data: null });
  mount();
  expect(screen.getByText('Activity not found')).toBeTruthy();
  cleanup();
  mocks.useActivity.mockReturnValue({
    isPending: false,
    isError: false,
    data: {
      ...sample,
      sport: 'strength',
      sets: [{ exercise: 'Squat', reps: 8, weight: 60, duration: 120 }],
    },
  });
  mount();
  expect(screen.getByRole('heading', { name: 'Exercises' })).toBeTruthy();
  expect(screen.getByRole('table').textContent).toContain('Squat');
  expect(screen.queryByRole('heading', { name: 'Route' })).toBeNull();
});

test('swimming shows pace per 100 metres', () => {
  mocks.useActivity.mockReturnValue({
    isPending: false,
    isError: false,
    data: { ...sample, sport: 'swimming', average_speed: 1.5 },
  });
  mount();
  expect(screen.getByRole('group', { name: 'Key metrics' }).textContent).toContain('1:07 /100m');
});

test('notes save after editing and detailed files can be requested', async () => {
  mount();
  fireEvent.change(screen.getByRole('textbox', { name: 'Your note' }), {
    target: { value: 'Felt easy' },
  });
  await waitFor(
    () =>
      expect(mocks.request).toHaveBeenCalledWith(
        'demo',
        '/activities/a1/note',
        expect.objectContaining({ method: 'PUT' }),
      ),
    { timeout: 2000 },
  );
  cleanup();
  mocks.request.mockClear();
  mocks.useActivity.mockReturnValue({
    data: { ...sample, detail_state: 'pending', streams: null },
    isPending: false,
    isError: false,
  });
  mount('live');
  fireEvent.click(screen.getByRole('button', { name: 'Download details' }));
  await waitFor(() =>
    expect(mocks.request).toHaveBeenCalledWith(
      'live',
      '/activities/a1/details',
      expect.objectContaining({ method: 'POST' }),
    ),
  );
});
