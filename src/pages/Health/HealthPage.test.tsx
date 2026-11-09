import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import HealthPage from './HealthPage';

const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../../lib/queries', () => ({ useWorkspaceQuery: mocks.query }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
function Location() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}
function mount(path = '/health') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/health"
          element={
            <>
              <HealthPage />
              <Location />
            </>
          }
        />
        <Route
          path="/health/:tab"
          element={
            <>
              <HealthPage />
              <Location />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}
const sleep = {
  date: '2026-11-08',
  minutes: 420,
  need_minutes: 450,
  score: 80,
  start: '2026-11-07T23:00:00',
  end: '2026-11-08T06:00:00',
  stages: {
    deep: { minutes: 100 },
    light: { minutes: 200 },
    rem: { minutes: 100 },
    awake: { minutes: 20 },
  },
  sentence: 'You got about what you needed.',
};

test('overview links to a tab and keeps the selected range in the URL', () => {
  mocks.query.mockImplementation((key: string[]) =>
    key[1] === 'overview'
      ? {
          data: {
            range: '4W',
            tabs: Object.fromEntries(
              ['sleep', 'heart', 'energy', 'stress', 'steps'].map((kind) => [
                kind,
                { latest: sleep, sentences: ['A recorded reading'], spark: [sleep] },
              ]),
            ),
          },
          isPending: false,
          isError: false,
        }
      : {
          data: { days: [sleep], summary: {}, sentences: [], range: '4W' },
          isPending: false,
          isError: false,
        },
  );
  mount();
  fireEvent.click(screen.getByRole('radio', { name: '7D' }));
  expect(screen.getByTestId('location').textContent).toBe('/health?range=7D');
  fireEvent.click(
    within(screen.getByRole('navigation', { name: 'Health sections' })).getByRole('link', {
      name: 'Sleep',
    }),
  );
  expect(screen.getByTestId('location').textContent).toBe('/health/sleep?range=7D');
  expect(screen.getByText('Last recorded night · Nov 8')).toBeTruthy();
});

test('sleep tab handles missing nights without claiming zero sleep', () => {
  mocks.query.mockReturnValue({
    data: {
      days: [{ date: '2026-11-08', minutes: null }],
      summary: {},
      sentences: [],
      range: '4W',
    },
    isPending: false,
    isError: false,
  });
  mount('/health/sleep');
  expect(screen.getByText('No sleep readings yet')).toBeTruthy();
});
