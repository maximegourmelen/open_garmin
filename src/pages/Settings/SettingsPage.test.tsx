import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { ThemeProvider } from '../../app/providers';
import { WorkspaceContext } from '../../app/workspace-context';
import { ToastProvider } from '../../components/ui';
import type { Preferences, StatusResponse } from '../../lib/types';
import SettingsPage from './SettingsPage';

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  workspaceRequest: vi.fn(),
  refreshSession: vi.fn(),
  setMode: vi.fn(),
  prefsQuery: vi.fn(),
}));
vi.mock('../../lib/api', () => ({
  request: mocks.request,
  workspaceRequest: mocks.workspaceRequest,
}));
const prefs: Preferences = {
  units: 'metric',
  timezone: 'America/Toronto',
  week_start: 'monday',
  weekly_distance: 40000,
  weekly_minutes: 150,
  weekly_sessions: 3,
  primary_sport: 'walking',
  theme: 'dark',
  reduce_motion: false,
  onboarded: true,
  tour_completed: [],
  dismissed_hints: [],
  goal_focus: 'move_more',
  companion_enabled: true,
  companion_name: 'Legacy',
  companion_tone: 'cheerful',
  zone_source: 'garmin',
  max_hr: null,
  steps_goal_source: 'garmin',
  steps_goal: 8000,
  today_layout: [],
  nav_collapsed: false,
  journey: null,
};
const status = {
  mode: 'live',
  local_mode: false,
  user: { name: 'Alex' },
  jobs: [],
  connection: {
    connected: true,
    state: 'connected',
    last_checked: null,
    last_success: null,
    message: null,
    region: 'com',
  },
  data_through: null,
  rederive: { state: 'idle', progress: 0 },
  unseen: { milestones: 0, recap_week: null },
} as StatusResponse;
vi.mock('../../lib/queries', () => ({
  usePreferences: () => mocks.prefsQuery(),
  useStatus: () => ({ data: status }),
}));
function mount(mode: 'demo' | 'live' = 'demo', initial = '/settings') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <ThemeProvider initialTheme="dark">
        <QueryClientProvider client={client}>
          <WorkspaceContext.Provider
            value={{
              mode,
              setMode: mocks.setMode,
              session:
                mode === 'live'
                  ? { user: { name: 'Alex', email: 'alex@example.test' }, csrf_token: 'test' }
                  : null,
              booting: false,
              refreshSession: mocks.refreshSession,
            }}
          >
            <ToastProvider>
              <SettingsPage />
            </ToastProvider>
          </WorkspaceContext.Provider>
        </QueryClientProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  mocks.request.mockResolvedValue(status);
  mocks.workspaceRequest.mockResolvedValue({ ok: true });
  mocks.refreshSession.mockResolvedValue(undefined);
  mocks.prefsQuery.mockReturnValue({ data: prefs, isPending: false, isError: false });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test('shows all sections and autosaves number changes after a short pause', async () => {
  mount();
  expect(screen.getByRole('heading', { name: 'Goals' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Garmin connection' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Your data' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Weekly active minutes' }), {
    target: { value: '120' },
  });
  await waitFor(() =>
    expect(mocks.workspaceRequest).toHaveBeenCalledWith(
      'demo',
      '/preferences',
      expect.objectContaining({ body: expect.stringContaining('"weekly_minutes":120') }),
    ),
  );
  expect(screen.getAllByText('Saved').length).toBeGreaterThan(0);
});

test('saves theme immediately and shows inline errors', async () => {
  mocks.workspaceRequest.mockRejectedValueOnce(new Error('Could not save preferences'));
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Light' }));
  await waitFor(() =>
    expect(screen.getByRole('alert').textContent).toContain('Could not save preferences'),
  );
  expect(mocks.workspaceRequest).toHaveBeenCalledWith(
    'demo',
    '/preferences',
    expect.objectContaining({ body: expect.stringContaining('"theme":"light"') }),
  );
});

test('permanent deletion requires an exact typed confirmation', async () => {
  mount('live', '/settings?section=data');
  fireEvent.click(screen.getByRole('button', { name: 'Delete imported data' }));
  const remove = screen.getByRole('button', { name: 'Delete permanently' });
  expect((remove as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(screen.getByRole('textbox', { name: 'Type DELETE to confirm' }), {
    target: { value: 'DELETE' },
  });
  fireEvent.click(remove);
  await waitFor(() => expect(mocks.request).toHaveBeenCalledWith('/data', { method: 'DELETE' }));
});

test('loading, error, and unavailable preferences have clear states', () => {
  mocks.prefsQuery.mockReturnValue({ isPending: true });
  mount();
  expect(screen.getByLabelText('Loading Settings')).toBeTruthy();
  cleanup();
  mocks.prefsQuery.mockReturnValue({
    isPending: false,
    isError: true,
    error: new Error('Offline'),
    refetch: vi.fn(),
  });
  mount();
  expect(screen.getByText('Offline')).toBeTruthy();
  cleanup();
  mocks.prefsQuery.mockReturnValue({ isPending: false, isError: false, data: null });
  mount();
  expect(screen.getByText('Settings are unavailable')).toBeTruthy();
});
