import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { ThemeProvider } from './providers';
import { WorkspaceContext } from './workspace-context';
import AppShell from './AppShell';

vi.mock('../lib/queries', () => ({
  useStatus: () => ({ data: { mode: 'demo', jobs: [], connection: { connected: false } } }),
  usePreferences: () => ({ data: { onboarded: true } }),
}));
vi.mock('../pages/Journey/JourneyPage', () => ({
  default: () => <h2>Journey</h2>,
}));
vi.mock('../pages/Progress/ProgressPage', () => ({
  default: () => <h2>Progress</h2>,
}));
afterEach(() => cleanup());
window.scrollTo = vi.fn();

function renderAt(path: string) {
  const client = new QueryClient();
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider initialTheme="dark">
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
            <AppShell />
          </WorkspaceContext.Provider>
        </QueryClientProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

test('old routes redirect into the new shell', async () => {
  renderAt('/training');
  expect(await screen.findByRole('heading', { name: 'Progress', level: 2 })).toBeTruthy();
  expect(screen.getAllByRole('navigation', { name: 'Mobile navigation' })).toHaveLength(1);
});

test('primary navigation and command palette work', async () => {
  renderAt('/journey');
  expect(await screen.findByRole('heading', { name: 'Journey', level: 2 })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /^Search$/ }));
  expect(screen.getByRole('dialog', { name: 'Search and jump' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Trends' }));
  expect(await screen.findByRole('heading', { name: 'Progress', level: 2 })).toBeTruthy();
});

test('the new shell highlights the active destination', async () => {
  renderAt('/trends');
  expect(await screen.findByRole('heading', { name: 'Progress', level: 2 })).toBeTruthy();
  expect(
    screen
      .getAllByRole('link', { name: 'Trends' })
      .some((link) => link.getAttribute('aria-current') === 'page'),
  ).toBe(true);
  expect(screen.queryByText('Workspace /')).toBeNull();
});
