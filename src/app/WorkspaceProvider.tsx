import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { request, setCsrfToken } from '../lib/api';
import type { WorkspaceMode } from '../lib/api';
import { WorkspaceContext } from './workspace-context';
import type { Session } from './workspace-context';

function storedMode(): WorkspaceMode {
  try {
    return localStorage.getItem('og_workspace') === 'live' ? 'live' : 'demo';
  } catch {
    return 'demo';
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [mode, changeMode] = useState<WorkspaceMode>(storedMode);
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);
  const refreshSession = useCallback(async () => {
    try {
      let next = await request<Session>('/session');
      if (!next.user && next.local_mode)
        next = await request<Session>('/auth/local', { method: 'POST' });
      setSession(next);
      setCsrfToken(next.csrf_token);
      if (!next.user) changeMode('demo');
    } catch {
      setSession(null);
      setCsrfToken(null);
      changeMode('demo');
    } finally {
      setBooting(false);
    }
  }, []);
  useEffect(() => {
    // Session bootstrapping starts a network request; state updates happen after it resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshSession();
  }, [refreshSession]);
  const setMode = useCallback(
    (next: WorkspaceMode) => {
      if (next === 'live' && !session?.user) return;
      changeMode(next);
      try {
        localStorage.setItem('og_workspace', next);
      } catch {
        /* storage unavailable */
      }
    },
    [session],
  );
  const value = useMemo(
    () => ({ mode, setMode, session, booting, refreshSession }),
    [mode, setMode, session, booting, refreshSession],
  );
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
