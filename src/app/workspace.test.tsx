import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { WorkspaceProvider } from './WorkspaceProvider';
import { useWorkspace } from './workspace-context';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

function Probe() {
  const workspace = useWorkspace();
  return (
    <div>
      <span data-testid="mode">{workspace.mode}</span>
      <span data-testid="user">{workspace.session?.user?.name ?? 'none'}</span>
      <button onClick={() => workspace.setMode('live')}>Use live</button>
      <button onClick={() => workspace.setMode('demo')}>Use demo</button>
    </div>
  );
}

test('authenticated user can switch between separate workspaces', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          user: { name: 'Alex', email: 'alex@example.test' },
          csrf_token: 'token',
          local_mode: false,
        }),
        { status: 200 },
      ),
    ),
  );
  render(
    <WorkspaceProvider>
      <Probe />
    </WorkspaceProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Alex'));
  expect(screen.getByTestId('mode').textContent).toBe('demo');
  fireEvent.click(screen.getByRole('button', { name: 'Use live' }));
  expect(screen.getByTestId('mode').textContent).toBe('live');
  expect(localStorage.getItem('og_workspace')).toBe('live');
  fireEvent.click(screen.getByRole('button', { name: 'Use demo' }));
  expect(screen.getByTestId('mode').textContent).toBe('demo');
});

test('a visitor stays in the sample workspace', async () => {
  localStorage.setItem('og_workspace', 'live');
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ user: null, csrf_token: null, local_mode: false }), {
        status: 200,
      }),
    ),
  );
  render(
    <WorkspaceProvider>
      <Probe />
    </WorkspaceProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('mode').textContent).toBe('demo'));
  fireEvent.click(screen.getByRole('button', { name: 'Use live' }));
  expect(screen.getByTestId('mode').textContent).toBe('demo');
});
