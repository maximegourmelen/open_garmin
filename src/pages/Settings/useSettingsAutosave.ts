import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../app/theme-context';
import { useWorkspace } from '../../app/workspace-context';
import { workspaceRequest } from '../../lib/api';
import type { Preferences } from '../../lib/types';

type SaveState = { kind: 'saving' | 'saved' | 'error'; message?: string };

export function useSettingsAutosave(initial: Preferences) {
  const { mode } = useWorkspace();
  const theme = useTheme();
  const client = useQueryClient();
  const [draft, setDraft] = useState(initial);
  const [states, setStates] = useState<Partial<Record<keyof Preferences, SaveState>>>({});
  const current = useRef(initial);
  const pending = useRef(new Set<keyof Preferences>());
  const revision = useRef<Partial<Record<keyof Preferences, number>>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const mounted = useRef(true);

  function flush() {
    if (!pending.current.size) return;
    const keys = [...pending.current];
    const versions = Object.fromEntries(keys.map((key) => [key, revision.current[key]]));
    const snapshot = current.current;
    pending.current.clear();
    queue.current = queue.current
      .catch(() => undefined)
      .then(async () => {
        try {
          await workspaceRequest(mode, '/preferences', {
            method: 'PUT',
            body: JSON.stringify(snapshot),
          });
          client.setQueryData([mode, 'preferences'], snapshot);
          if (!mounted.current) return;
          setStates((old) => {
            const next = { ...old };
            if (snapshot === current.current)
              for (const key of Object.keys(next) as (keyof Preferences)[])
                if (next[key]?.kind === 'error') delete next[key];
            for (const key of keys)
              if (revision.current[key] === versions[key]) next[key] = { kind: 'saved' };
            return next;
          });
          setTimeout(() => {
            if (!mounted.current) return;
            setStates((old) => {
              const next = { ...old };
              for (const key of keys)
                if (revision.current[key] === versions[key] && next[key]?.kind === 'saved')
                  delete next[key];
              return next;
            });
          }, 2000);
        } catch (error) {
          if (!mounted.current) return;
          setStates((old) => {
            const next = { ...old };
            for (const key of keys)
              if (revision.current[key] === versions[key])
                next[key] = { kind: 'error', message: (error as Error).message };
            return next;
          });
        }
      });
  }

  function update<K extends keyof Preferences>(key: K, value: Preferences[K], debounce = false) {
    const next = { ...current.current, [key]: value };
    current.current = next;
    setDraft(next);
    pending.current.add(key);
    revision.current[key] = (revision.current[key] ?? 0) + 1;
    setStates((old) => ({ ...old, [key]: { kind: 'saving' } }));
    if (key === 'theme') theme.setTheme(value as Preferences['theme']);
    if (key === 'reduce_motion')
      document.documentElement.setAttribute('data-reduce-motion', String(value));
    if (timer.current) clearTimeout(timer.current);
    timer.current = debounce ? setTimeout(flush, 500) : null;
    if (!debounce) flush();
  }

  useEffect(() => {
    mounted.current = true;
    const pendingKeys = pending.current;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      if (pendingKeys.size) {
        const snapshot = current.current;
        queue.current = queue.current
          .catch(() => undefined)
          .then(() =>
            workspaceRequest(mode, '/preferences', {
              method: 'PUT',
              body: JSON.stringify(snapshot),
            }),
          );
      }
    };
  }, [mode]);

  return { draft, states, update };
}
