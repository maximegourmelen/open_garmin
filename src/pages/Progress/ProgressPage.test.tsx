import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import ProgressPage from './ProgressPage';

const mocks = vi.hoisted(() => ({ progress: vi.fn(), deeper: vi.fn(), relationship: vi.fn() }));
vi.mock('../../lib/queries', () => ({
  useProgress: () => mocks.progress(),
  usePreferences: () => ({ data: { units: 'metric' } }),
  useDeeper: () => mocks.deeper(),
  useRelationship: () => mocks.relationship(),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
function mount() {
  return render(
    <MemoryRouter>
      <ProgressPage />
    </MemoryRouter>,
  );
}
const data = {
  signals: [
    {
      id: 'rhr',
      status: 'improving',
      sentence: 'Your resting heart rate is trending lower.',
      before: 65,
      after: 61,
      unit: 'bpm',
      n_before: 12,
      n_after: 14,
      method: 'fitness@1',
    },
  ],
  bests: [
    {
      kind: 'distance:5000',
      all_time: {
        activity_id: 'run-1',
        kind: 'distance:5000',
        date: '2026-11-05',
        sport: 'running',
        value: 1500,
        source: 'calculated',
        is_new: true,
      },
      recent_90: null,
    },
  ],
  volume: [
    {
      start: '2026-11-02',
      end: '2026-11-08',
      minutes: 180,
      goal: 150,
      sessions: 4,
      distance: 18000,
      by_sport: { running: 120, walking: 70 },
      partial: false,
      method: 'active_minutes@1',
    },
  ],
  consistency: { days: [{ date: '2026-11-05', minutes: 30 }], active_days_28: 11 },
  ramp: {
    band: 'steady',
    ratio: 1.1,
    this_week: 80,
    average_four_weeks: 72,
    projected: 80,
    sentence: 'Right around your usual.',
    n: 4,
    source: 'calculated',
    method: 'ramp_check@1',
  },
  method: 'progress_overview@1',
};

test('shows progress and switches volume units without fetching deeper data', () => {
  mocks.progress.mockReturnValue({ data, isPending: false, isError: false });
  mount();
  expect(screen.getByText('Your resting heart rate is trending lower.')).toBeTruthy();
  expect(screen.getByText('Fastest 5 km')).toBeTruthy();
  expect(screen.getByText('Active on 11 of the last 28 days')).toBeTruthy();
  expect(mocks.deeper).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('radio', { name: 'Distance' }));
  expect(screen.getByRole('img', { name: /Weekly distance/ })).toBeTruthy();
});

test('deeper data loads only when expanded', () => {
  mocks.progress.mockReturnValue({ data, isPending: false, isError: false });
  mocks.deeper.mockReturnValue({ isPending: true });
  mocks.relationship.mockReturnValue({ isPending: true });
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Go deeper' }));
  expect(mocks.deeper).toHaveBeenCalled();
  expect(screen.getByRole('combobox', { name: 'First value' })).toBeTruthy();
});
