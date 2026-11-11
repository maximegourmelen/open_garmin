import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { ThemeProvider } from './providers';
import { WorkspaceContext } from './workspace-context';
import AppShell from './AppShell';
import { ToastProvider } from '../components/ui/Toast';

vi.mock('../lib/queries', () => ({
  useStatus: () => ({ data: { mode: 'demo', jobs: [], connection: { connected: false } } }),
  usePreferences: () => ({ data: { onboarded: true } }),
}));
vi.mock('../pages/Progress/ProgressPage', () => ({
  default: () => <h2>Progress</h2>,
}));
vi.mock('../pages/Today/TodayPage', () => ({
  default: () => <h2>Overview page</h2>,
}));
vi.mock('../pages/Health/HealthPage', () => ({
  default: () => <h2>Health page</h2>,
}));
vi.mock('../pages/Methods/MethodsPage', () => ({
  default: () => <h2>Guide page</h2>,
}));
afterEach(() => cleanup());
window.scrollTo = vi.fn();

function renderAt(path: string) {
  const client = new QueryClient();
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider initialTheme="dark">
        <QueryClientProvider client={client}>
          <ToastProvider>
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
              <LocationProbe />
            </WorkspaceContext.Provider>
          </ToastProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

test.each([
  ['/today', '/'],
  ['/dashboard', '/'],
  ['/journey', '/trends'],
  ['/progress', '/trends'],
  ['/training', '/trends'],
  ['/insights', '/trends'],
  ['/health', '/health/sleep'],
  ['/health/energy', '/health/body-battery'],
  ['/recovery', '/health/heart'],
  ['/methods', '/guide/methods'],
  ['/research', '/guide/methods'],
])('%s redirects to %s', async (from, to) => {
  renderAt(from);
  await waitFor(() => expect(screen.getByTestId('location').textContent).toBe(to));
});

test('an unknown route returns to overview and explains why', async () => {
  renderAt('/nowhere');
  await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/'));
  expect(await screen.findByText('Page not found')).toBeTruthy();
});

test('primary navigation and command palette work', async () => {
  renderAt('/trends');
  expect(await screen.findByRole('heading', { name: 'Progress', level: 2 })).toBeTruthy();
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
