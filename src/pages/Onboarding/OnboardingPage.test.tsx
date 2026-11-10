import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { ThemeProvider } from '../../app/providers';
import { WorkspaceContext } from '../../app/workspace-context';
import { ToastProvider } from '../../components/ui';
import OnboardingPage from './OnboardingPage';

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  setMode: vi.fn(),
  preferences: {
    onboarded: false,
    weekly_minutes: 150,
    weekly_sessions: 3,
    units: 'metric',
    theme: 'dark',
    companion_name: 'Pip',
    companion_tone: 'cheerful',
  },
}));
vi.mock('../../lib/api', () => ({
  workspaceRequest: mocks.request,
  request: mocks.request,
  setCsrfToken: vi.fn(),
}));
vi.mock('../../lib/queries', () => ({
  usePreferences: () => ({
    data: mocks.preferences,
    isPending: false,
    isError: false,
  }),
  useJourney: () => ({ data: { goal_suggestion: { minutes: 80 }, goal: { minutes: 150 } } }),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.preferences.theme = 'dark';
  mocks.preferences.weekly_minutes = 150;
});
function mount(mode: 'demo' | 'live' = 'demo') {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <MemoryRouter>
      <ThemeProvider initialTheme="dark">
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
              <OnboardingPage />
            </ToastProvider>
          </WorkspaceContext.Provider>
        </QueryClientProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

test('sample path saves goal, companion and theme choices', async () => {
  mocks.request.mockResolvedValue({ ok: true });
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Look around with sample data' }));
  fireEvent.click(screen.getByRole('button', { name: /Start running/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByText(/Active minutes:/).textContent).toContain('80 min');
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Companion name' }), {
    target: { value: 'Buddy' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'calm' }));
  fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
  await waitFor(() =>
    expect(mocks.request).toHaveBeenCalledWith(
      'demo',
      '/preferences',
      expect.objectContaining({
        method: 'PUT',
        body: expect.stringContaining('"companion_name":"Buddy"'),
      }),
    ),
  );
  const saved = JSON.parse(
    mocks.request.mock.calls.find((call) => call[1] === '/preferences')?.[2].body,
  );
  expect(saved.goal_focus).toBe('start_running');
  expect(saved.journey.id).toBe('walk_to_run_9w');
  expect(saved.onboarded).toBe(true);
  expect(await screen.findByText('You’re all set')).toBeTruthy();
});

test('skipping setup keeps an existing live user and their preferences', async () => {
  mocks.preferences.theme = 'light';
  mocks.preferences.weekly_minutes = 175;
  mocks.request.mockResolvedValue({ ok: true });
  mount('live');
  fireEvent.click(screen.getByRole('button', { name: 'Skip setup' }));
  await waitFor(() =>
    expect(mocks.request).toHaveBeenCalledWith('live', '/preferences', expect.anything()),
  );
  const saved = JSON.parse(mocks.request.mock.calls[0][2].body);
  expect(saved).toEqual({ ...mocks.preferences, onboarded: true });
  expect(mocks.setMode).not.toHaveBeenCalled();
});
