import { createContext, useContext } from 'react';
import type { WorkspaceMode } from '../lib/api';

export interface Session {
  user: { name: string; email: string } | null;
  csrf_token: string | null;
  registration_open?: boolean;
  local_mode?: boolean;
}

export interface WorkspaceState {
  mode: WorkspaceMode;
  setMode: (mode: WorkspaceMode) => void;
  session: Session | null;
  booting: boolean;
  refreshSession: () => Promise<void>;
}

export const WorkspaceContext = createContext<WorkspaceState | null>(null);
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('WorkspaceProvider is missing');
  return value;
}
