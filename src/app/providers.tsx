import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ThemeContext } from './theme-context';
import type { ThemeChoice } from './theme-context';

function systemTheme(): 'dark' | 'light' {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function storedTheme(): ThemeChoice {
  const value = localStorage.getItem('og_theme');
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: ReactNode;
  initialTheme?: ThemeChoice;
}) {
  const [theme, setTheme] = useState<ThemeChoice>(() => initialTheme ?? storedTheme());
  const [system, setSystem] = useState<'dark' | 'light'>(() => systemTheme());
  const resolved = theme === 'system' ? system : theme;

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return;
    const changed = () => setSystem(media.matches ? 'dark' : 'light');
    media.addEventListener('change', changed);
    return () => media.removeEventListener('change', changed);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolved;
    localStorage.setItem('og_theme', theme);
    const colour = getComputedStyle(root).getPropertyValue('--bg').trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colour);
  }, [theme, resolved]);

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
