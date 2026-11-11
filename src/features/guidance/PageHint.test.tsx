import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { WorkspaceContext } from '../../app/workspace-context';
import { ToastProvider } from '../../components/ui/Toast';
import { PageHint } from './PageHint';

const mocks = vi.hoisted(() => ({
  store: { demo: { dismissed_hints: [] as string[] }, live: { dismissed_hints: [] as string[] } },
  request: vi.fn(),
}));
vi.mock('../../lib/api', () => ({
  workspaceRequest: mocks.request,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.store.demo = { dismissed_hints: [] };
  mocks.store.live = { dismissed_hints: [] };
});

function mount(mode: 'demo' | 'live') {
  return render(
    <MemoryRouter>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <WorkspaceContext.Provider
          value={{ mode, setMode: vi.fn(), session: null, booting: false, refreshSession: vi.fn() }}
        >
          <ToastProvider>
            <PageHint id="activities" />
          </ToastProvider>
        </WorkspaceContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

test.each(['demo', 'live'] as const)('%s hint dismissal survives a fresh render', async (mode) => {
  mocks.request.mockImplementation(
    async (requestedMode: 'demo' | 'live', _path: string, options?: { body?: string }) => {
      if (options?.body) mocks.store[requestedMode] = JSON.parse(options.body);
      return mocks.store[requestedMode];
    },
  );
  const first = mount(mode);
  expect(await screen.findByText('How to read this page')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'About this page' })).toBeTruthy());
  expect(mocks.store[mode].dismissed_hints).toContain('activities');
  first.unmount();
  mount(mode);
  expect(await screen.findByRole('button', { name: 'About this page' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'About this page' }));
  expect(screen.getByText('How to read this page')).toBeTruthy();
});
