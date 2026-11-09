import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { WorkspaceContext } from '../../app/workspace-context';
import { ToastProvider } from '../../components/ui';
import type { Preferences, TodayResponse } from '../../lib/types';
import TodayPage from './TodayPage';

const mocks = vi.hoisted(() => ({
  useToday: vi.fn(),
  usePreferences: vi.fn(),
  workspaceRequest: vi.fn(),
}));
vi.mock('../../lib/queries', () => ({
  useToday: mocks.useToday,
  usePreferences: mocks.usePreferences,
}));
vi.mock('../../lib/api', () => ({ workspaceRequest: mocks.workspaceRequest }));

const today = {
  date: '2026-11-09',
  greeting: 'Good morning, Alex',
  message: { id: 'hello', text: 'A steady start to the week.', pose: 'wave', data_refs: [] },
  week: {
    start: '2026-11-09',
    end: '2026-11-15',
    minutes: 30,
    goal: 150,
    pct: 20,
    sessions: 1,
    sessions_goal: 3,
    remaining_minutes: 120,
    days_left: 6,
    by_day: [
      { date: '2026-11-09', minutes: 30, sports: ['walking'], is_today: true, is_future: false },
    ],
    sentence: 'You moved 30 minutes this week.',
    method: 'active_minutes@1',
  },
  suggestion: {
    kind: 'go',
    title: 'Good day to move',
    text: 'A walk would feel good.',
    pose: 'wave',
    signals: [],
    footnote: 'A suggestion.',
    method: 'today_suggestion@1',
  },
  streak: {
    current: 2,
    longest: 3,
    at_risk: false,
    remaining_minutes: 0,
    remaining_sessions: 0,
    weeks: [],
    method: 'streak@1',
  },
  sleep: null,
  body_battery: null,
  resting_hr: null,
  hrv: null,
  steps: null,
  checkin: { date: '2026-11-09', mood: null, energy: null, soreness: null, note: '' },
  latest_activity: null,
  next_milestone: null,
  journey: null,
  insights: [],
  unseen_milestones: [],
  recap_ready: null,
  layout: ['week', 'checkin'],
  method: '',
} as TodayResponse;

const prefs = {
  today_layout: ['week', 'checkin'],
  units: 'metric',
  companion_enabled: true,
  companion_name: 'Pip',
} as Preferences;

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
            <TodayPage />
          </ToastProvider>
        </WorkspaceContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.useToday.mockReturnValue({ data: today, isPending: false, isError: false });
  mocks.usePreferences.mockReturnValue({ data: prefs });
  mocks.workspaceRequest.mockResolvedValue({ ok: true });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test('shows the week and saves a check-in in the selected workspace', async () => {
  mount();
  expect(screen.getByText('A steady start to the week.')).toBeTruthy();
  expect(screen.getByText('You moved 30 minutes this week.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Good' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }));
  await waitFor(() =>
    expect(mocks.workspaceRequest).toHaveBeenCalledWith(
      'demo',
      '/checkins/2026-11-09',
      expect.objectContaining({ method: 'PUT' }),
    ),
  );
  expect(JSON.parse(mocks.workspaceRequest.mock.calls[0][2].body).mood).toBe(4);
});

test('Edit My Day saves card order and visibility', async () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Edit My Day' }));
  expect(screen.getByRole('dialog', { name: 'Edit My Day' })).toBeTruthy();
  fireEvent.click(screen.getByRole('switch', { name: 'Show Check-in' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save layout' }));
  await waitFor(() =>
    expect(mocks.workspaceRequest).toHaveBeenCalledWith(
      'demo',
      '/preferences',
      expect.objectContaining({ method: 'PUT' }),
    ),
  );
  expect(JSON.parse(mocks.workspaceRequest.mock.calls[0][2].body).today_layout).toEqual(['week']);
});

test('loading and error states give a clear retry', () => {
  mocks.useToday.mockReturnValue({ isPending: true });
  const view = mount();
  expect(screen.getByLabelText('Loading Today')).toBeTruthy();
  view.unmount();
  const refetch = vi.fn();
  mocks.useToday.mockReturnValue({
    isPending: false,
    isError: true,
    error: new Error('Connection lost'),
    refetch,
  });
  mount();
  expect(screen.getByRole('alert').textContent).toContain('Connection lost');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(refetch).toHaveBeenCalled();
});

test('empty response explains how to begin', () => {
  mocks.useToday.mockReturnValue({ isPending: false, isError: false, data: null });
  mount();
  expect(screen.getByText('Today is ready for you')).toBeTruthy();
});
