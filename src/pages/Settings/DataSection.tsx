import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../app/workspace-context';
import { Button, Dialog, useToast } from '../../components/ui';
import { Section } from '../../components/ui/Structure';
import { request } from '../../lib/api';
import { SettingsRow } from './SettingsRow';

export function DataSection() {
  const { session, mode, setMode, refreshSession } = useWorkspace();
  const client = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const [confirm, setConfirm] = useState<'data' | 'account' | null>(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  async function remove() {
    if (typed !== 'DELETE' || !confirm) return;
    setBusy(true);
    try {
      await request(confirm === 'data' ? '/data' : '/account', { method: 'DELETE' });
      if (confirm === 'account') await refreshSession();
      setMode('demo');
      await client.invalidateQueries();
      setConfirm(null);
      setTyped('');
      navigate('/');
      toast({ message: confirm === 'account' ? 'Workspace deleted' : 'Imported data deleted' });
    } catch (error) {
      toast({ message: (error as Error).message });
    } finally {
      setBusy(false);
    }
  }
  const live = mode === 'live' && Boolean(session?.user);
  return (
    <Section heading="Your data">
      <div className="-mt-4">
        <SettingsRow
          label="Export"
          description="Take your activities, wellness history and notes with you."
        >
          {live ? (
            <div className="flex flex-wrap justify-end gap-3 type-body">
              <a href="/api/export" download className="text-accent hover:underline">
                JSON
              </a>
              <a href="/api/export?format=csv" download className="text-accent hover:underline">
                CSV
              </a>
            </div>
          ) : (
            <span className="type-body text-text-2">
              {session?.user ? 'Open your workspace to export' : 'Connect a workspace to export'}
            </span>
          )}
        </SettingsRow>
        <SettingsRow
          label="Delete imported data"
          description="Removes local activities, health readings, notes and original files. Disconnects Garmin."
        >
          {live ? (
            <Button
              variant="danger"
              onClick={() => {
                setTyped('');
                setConfirm('data');
              }}
            >
              Delete imported data
            </Button>
          ) : (
            <span className="type-body text-text-2">Available in your workspace</span>
          )}
        </SettingsRow>
        <SettingsRow
          label="Delete workspace"
          description="Removes your account and all local data from this installation."
        >
          {live && !session?.local_mode ? (
            <Button
              variant="danger"
              onClick={() => {
                setTyped('');
                setConfirm('account');
              }}
            >
              Delete workspace
            </Button>
          ) : (
            <span className="type-body text-text-2">
              {session?.local_mode
                ? 'Local workspace stays on this device'
                : 'Available in your workspace'}
            </span>
          )}
        </SettingsRow>
      </div>
      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm === 'account' ? 'Delete your workspace?' : 'Delete imported data?'}
        description="This cannot be undone here. Your Garmin account is not changed."
      >
        <p className="mb-3 type-body text-text-2">
          {confirm === 'account'
            ? 'Your account, sessions, imported data and original files will be removed.'
            : 'Your imported data and original files will be removed. Your workspace account and preferences stay.'}
        </p>
        <label className="grid gap-1 type-label text-text-2">
          Type DELETE to confirm
          <input
            className="h-9 rounded-control border border-border-strong bg-surface px-3 type-body text-text"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            Keep my data
          </Button>
          <Button
            variant="danger"
            disabled={typed !== 'DELETE' || busy}
            onClick={() => void remove()}
          >
            {busy ? 'Deleting…' : 'Delete permanently'}
          </Button>
        </div>
      </Dialog>
    </Section>
  );
}
