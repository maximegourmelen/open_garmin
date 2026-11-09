import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { WorkspaceContext } from '../../app/workspace-context';
import { ToastProvider } from '../../components/ui';
import type { JourneyResponse } from '../../lib/types';
import JourneyPage from './JourneyPage';

const mocks = vi.hoisted(() => ({ request: vi.fn(), journey: vi.fn(), recap: vi.fn() }));
vi.mock('../../lib/api', () => ({ workspaceRequest: mocks.request }));
vi.mock('../../lib/queries', () => ({
  useJourney: () => mocks.journey(),
  usePreferences: () => ({ data: { weekly_minutes: 150 } }),
  useRecap: () => mocks.recap(),
}));

const data: JourneyResponse = {
  journey: null,
  available: [
    {
      id: 'walk_to_run_9w',
      name: 'Walk to run',
      focus: 'start_running',
      weeks: [{ tip: 'Start gently', minutes: 60, sessions: 3 }],
    },
  ],
  goal: { minutes: 150, sessions: 3 },
  goal_suggestion: {
    minutes: 130,
    current_goal: 150,
    sentence: 'Try 130 minutes.',
    weeks_met: 0,
    n: 4,
    source: 'calculated',
    method: 'goal_suggestion@1',
  },
  streak: {
    current: 2,
    longest: 4,
    at_risk: false,
    remaining_minutes: 0,
    remaining_sessions: 0,
    weeks: [{ start: '2026-11-02', pct: 100, met: true }],
    method: 'streak@1',
  },
  milestones: [
    {
      id: 'first_5k',
      title: 'First 5K',
      description: 'A first step',
      how_to_earn: 'Complete 5 km',
      icon: '🏅',
      tier: 'bronze',
      color: 'orange',
      earned: false,
      earned_on: null,
      activity_id: null,
      progress: { current: 3, target: 5, unit: 'km' },
    },
  ],
  recaps: [{ week_start: '2026-11-02', seen: false }],
  checkins: [{ date: '2026-11-08', mood: 4, energy: 3, soreness: 1, note: 'Feeling good' }],
};
function mount() {
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
            <JourneyPage />
          </ToastProvider>
        </WorkspaceContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  mocks.request.mockResolvedValue({ ok: true });
  mocks.journey.mockReturnValue({ data, isPending: false, isError: false });
  mocks.recap.mockReturnValue({
    data: {
      week_start: '2026-11-02',
      week_end: '2026-11-08',
      seen: false,
      slides: [
        {
          kind: 'headline',
          title: 'Your week',
          big: '3 sessions',
          text: 'You kept moving',
          pose: 'wave',
        },
        { kind: 'goal', pct: 100, text: 'Goal met' },
      ],
    },
    isPending: false,
    isError: false,
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test('starts a journey and accepts the suggested goal', async () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Explore journeys' }));
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  await waitFor(() =>
    expect(mocks.request).toHaveBeenCalledWith(
      'demo',
      '/journey',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ id: 'walk_to_run_9w' }) }),
    ),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Use 130 min' }));
  await waitFor(() =>
    expect(mocks.request).toHaveBeenCalledWith(
      'demo',
      '/preferences',
      expect.objectContaining({
        method: 'PUT',
        body: expect.stringContaining('"weekly_minutes":130'),
      }),
    ),
  );
});

test('opens badge details and navigates the recap story', async () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: /First 5K/ }));
  expect(screen.getByRole('dialog', { name: 'First 5K' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
  fireEvent.click(screen.getByRole('button', { name: /Week of Nov 2/ }));
  expect(await screen.findByRole('dialog', { name: 'Your week in stories' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Next', exact: true }));
  expect(screen.getByText('Goal met')).toBeTruthy();
  await waitFor(() =>
    expect(mocks.request).toHaveBeenCalledWith('demo', '/recaps/2026-11-02/seen', {
      method: 'POST',
    }),
  );
});
