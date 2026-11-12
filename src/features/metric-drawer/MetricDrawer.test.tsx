import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { WorkspaceContext } from '../../app/workspace-context';
import { MetricLabel } from '../../components/data/Metric';
import { MetricDrawerProvider } from './MetricDrawerProvider';

vi.mock('../../lib/api', async (original) => ({
  ...(await original<typeof import('../../lib/api')>()),
  workspaceRequest: vi.fn(async (_mode: string, path: string) => {
    if (!path.includes('/metrics/resting_hr/summary')) throw new Error('Unexpected metric');
    return {
      id: 'resting_hr',
      latest: { date: '2026-11-10', value: 58 },
      unit: 'bpm',
      usual_range: { low: 54, high: 62, n: 20 },
      series: Array.from({ length: 30 }, (_, index) => ({
        date: `2026-10-${String(index + 1).padStart(2, '0')}`,
        value: index === 2 ? null : 58,
      })),
      source: 'garmin',
      method_id: null,
      value_label: null,
    };
  }),
}));

afterEach(cleanup);

test('a metric label opens personal details and returns focus when dismissed', async () => {
  render(
    <MemoryRouter>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <WorkspaceContext.Provider
          value={{
            mode: 'demo',
            setMode: vi.fn(),
            session: null,
            booting: false,
            refreshSession: vi.fn(),
          }}
        >
          <MetricDrawerProvider>
            <MetricLabel id="resting_hr" label="Resting HR" />
          </MetricDrawerProvider>
        </WorkspaceContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
  const trigger = screen.getByRole('button', { name: 'About Resting HR' });
  trigger.focus();
  fireEvent.click(trigger);
  expect(
    await screen.findByRole('dialog', { name: 'Resting heart rate' }, { timeout: 5000 }),
  ).toBeTruthy();
  expect(await screen.findByText('58 bpm')).toBeTruthy();
  expect(screen.getByText('54–62 bpm')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'View as table' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Close drawer' }));
  await waitFor(() => expect(document.activeElement).toBe(trigger));
});
