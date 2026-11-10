import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { ThemeProvider } from './providers';
import { useTheme } from './theme-context';

function Controls() {
  const { theme, resolved, setTheme } = useTheme();
  return (
    <div>
      <span>{`${theme}:${resolved}`}</span>
      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={() => setTheme('system')}>System</button>
    </div>
  );
}

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.removeProperty('--bg');
  document.head.innerHTML = '';
  localStorage.clear();
  vi.unstubAllGlobals();
});

test('theme control switches tokens and follows the system preference', () => {
  document.head.innerHTML = '<meta name="theme-color" content="">';
  document.documentElement.style.setProperty('--bg', 'rgb(11, 11, 12)');
  let changed: (() => void) | undefined;
  const media = {
    matches: true,
    addEventListener: (_: string, listener: () => void) => {
      changed = listener;
    },
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal('matchMedia', () => media);
  render(
    <ThemeProvider initialTheme="dark">
      <Controls />
    </ThemeProvider>,
  );
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
    'rgb(11, 11, 12)',
  );
  fireEvent.click(screen.getByText('Light'));
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(localStorage.getItem('og_theme')).toBe('light');
  fireEvent.click(screen.getByText('System'));
  expect(screen.getByText('system:dark')).toBeTruthy();
  act(() => {
    media.matches = false;
    changed?.();
  });
  expect(document.documentElement.dataset.theme).toBe('light');
});
