import type { Preferences } from '../../lib/types';

export type SaveState = { kind: 'saving' | 'saved' | 'error'; message?: string };
export type SettingsModel = {
  draft: Preferences;
  states: Partial<Record<keyof Preferences, SaveState>>;
  update: <K extends keyof Preferences>(key: K, value: Preferences[K], debounce?: boolean) => void;
};
