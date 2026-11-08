import { createContext, useContext } from 'react';

export type ThemeChoice = 'dark' | 'light' | 'system';

export type ThemeState = {
  theme: ThemeChoice;
  resolved: 'dark' | 'light';
  setTheme: (theme: ThemeChoice) => void;
};

export const ThemeContext = createContext<ThemeState | null>(null);

export function useTheme(): ThemeState {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('ThemeProvider is missing');
  return context;
}
