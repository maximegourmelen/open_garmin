import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { WorkspaceContext } from '../../app/workspace-context';
import { ToastProvider } from '../../components/ui';
import WelcomePage from './WelcomePage';

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  setMode: vi.fn(),
  preferences: {
    onboarded: false,
    weekly_minutes: 150,
    weekly_sessions: 3,
    units: 'metric',
    week_start: 'monday',
  },
}));
vi.mock('../../lib/api', () => ({
  workspaceRequest: mocks.request,
  request: mocks.request,
  setCsrfToken: vi.fn(),
}));
vi.mock('../../lib/queries', () => ({
  usePreferences: () => ({ data: mocks.preferences, isPending: false, isError: false }),
  useStatus: () => ({ data: { jobs: [] } }),
  useWorkspaceQuery: () => ({ data: null }),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function Location() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

function mount(mode: 'demo' | 'live' = 'demo') {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={['/welcome']}>
      <QueryClientProvider client={client}>
        <WorkspaceContext.Provider
          value={{
            mode,
            setMode: mocks.setMode,
            session:
              mode === 'live'
                ? { user: { name: 'Test', email: 'test@example.test' }, csrf_token: 'token' }
                : null,
            booting: false,
            refreshSession: vi.fn(),
          }}
        >
          <ToastProvider>
            <WelcomePage />
            <Location />
          </ToastProvider>
        </WorkspaceContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

test('sample path reaches weekly goals and saves the four welcome preferences', async () => {
  mocks.request.mockImplementation(
    async (_mode: string, _path: string, options?: { method?: string }) =>
      options?.method === 'PUT' ? { ok: true } : mocks.preferences,
  );
  mount();
  expect(screen.getByText('Step 1 of 3')).toBeTruthy();
  expect(screen.getByText('See your Garmin data clearly.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Explore with sample data' }));
  expect(screen.getByText('Step 3 of 3')).toBeTruthy();
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Active minutes per week' }), {
    target: { value: '180' },
  });
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Activities per week' }), {
    target: { value: '4' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Go to Overview' }));
  await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/'));
  const saved = JSON.parse(
    mocks.request.mock.calls.find((call) => call[2]?.method === 'PUT')?.[2].body,
  );
  expect(saved).toMatchObject({
    onboarded: true,
    weekly_minutes: 180,
    weekly_sessions: 4,
    units: 'metric',
    week_start: 'monday',
  });
});

test('connect path shows key guidance and lets the user continue with sample data', () => {
  mount('live');
  fireEvent.click(screen.getByRole('button', { name: 'Connect Garmin' }));
  expect(screen.getByText('Step 2 of 3')).toBeTruthy();
  expect(screen.getByText('1. Open the Garmin Connect key page.')).toBeTruthy();
  expect(screen.getAllByText('Why?')).toHaveLength(3);
  fireEvent.click(screen.getByRole('button', { name: 'Continue with sample data' }));
  expect(screen.getByText('Step 3 of 3')).toBeTruthy();
});

test('skipping saves the current live preferences without changing goals', async () => {
  mocks.request.mockImplementation(
    async (_mode: string, _path: string, options?: { method?: string }) =>
      options?.method === 'PUT' ? { ok: true } : mocks.preferences,
  );
  mount('live');
  fireEvent.click(screen.getByRole('button', { name: 'Skip setup' }));
  await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/'));
  const saveCall = mocks.request.mock.calls.find((call) => call[2]?.method === 'PUT');
  expect(saveCall?.[0]).toBe('live');
  expect(JSON.parse(saveCall?.[2].body)).toEqual({ ...mocks.preferences, onboarded: true });
});
