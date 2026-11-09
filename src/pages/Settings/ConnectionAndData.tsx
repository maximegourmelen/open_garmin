import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, ExternalLink, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../app/workspace-context';
import { ConnectFlow } from '../../components/connection/ConnectFlow';
import { Pip } from '../../components/companion';
import { Button, Card, Dialog, ErrorState, Pill, Skeleton, useToast } from '../../components/ui';
import { request } from '../../lib/api';
import type { StatusResponse } from '../../lib/types';

export function ConnectionSection() {
  const { session, mode, setMode } = useWorkspace();
  const client = useQueryClient();
  const toast = useToast();
  const [connectOpen, setConnectOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const live = useQuery({
    queryKey: ['live', 'status'],
    queryFn: () => request<StatusResponse>('/status'),
    enabled: Boolean(session?.user),
    retry: false,
  });
  async function sync(days: number) {
    setBusy(true);
    try {
      await request(`/sync?days=${days}`, { method: 'POST' });
      toast({ message: `Importing the last ${days} days` });
      void client.invalidateQueries({ queryKey: ['live'] });
    } catch (error) {
      toast({ message: (error as Error).message });
    } finally {
      setBusy(false);
    }
  }
  async function disconnect() {
    setBusy(true);
    try {
      await request('/connection', { method: 'DELETE' });
      setDisconnectOpen(false);
      toast({ message: 'Garmin disconnected' });
      void client.invalidateQueries({ queryKey: ['live'] });
    } catch (error) {
      toast({ message: (error as Error).message });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <Card title="Garmin connection" icon={ShieldCheck}>
        <div className="flex items-center gap-4">
          <Pip pose={live.data?.connection.connected ? 'cheer' : 'thinking'} size={72} />
          <div>
            <Pill tone={live.data?.connection.connected ? 'success' : 'neutral'}>
              {live.data?.connection.connected
                ? 'Connected'
                : session?.user
                  ? 'Not connected'
                  : 'Sign in to connect'}
            </Pill>
            <p className="mt-2 text-sm text-text-2">
              {live.data?.connection.message ?? 'Your Garmin data stays private in this workspace.'}
            </p>
          </div>
        </div>
        {live.isPending && session?.user ? (
          <Skeleton className="mt-4 h-16" />
        ) : live.isError ? (
          <ErrorState message={live.error.message} retry={() => void live.refetch()} />
        ) : (
          live.data && (
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-text-2">Last checked</dt>
                <dd>
                  {live.data.connection.last_checked
                    ? new Date(live.data.connection.last_checked).toLocaleString()
                    : 'Not yet'}
                </dd>
              </div>
              <div>
                <dt className="text-text-2">Newest daily source data</dt>
                <dd>{live.data.data_through ?? 'Not yet imported'}</dd>
              </div>
              <div>
                <dt className="text-text-2">Region</dt>
                <dd>{live.data.connection.region === 'cn' ? 'Garmin China' : 'Garmin Global'}</dd>
              </div>
              <div>
                <dt className="text-text-2">Last successful sync</dt>
                <dd>
                  {live.data.connection.last_success
                    ? new Date(live.data.connection.last_success).toLocaleString()
                    : 'Not yet'}
                </dd>
              </div>
            </dl>
          )
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={() => setConnectOpen(true)}>
            {live.data?.connection.connected ? 'Replace key' : 'Connect Garmin'}
          </Button>
          {mode === 'demo' && session?.user && (
            <Button variant="quiet" onClick={() => setMode('live')}>
              Open my data
            </Button>
          )}
          {live.data?.connection.connected && (
            <>
              <Button variant="secondary" disabled={busy} onClick={() => void sync(90)}>
                <RefreshCw size={16} /> Import 90 days
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => void sync(365)}>
                Import last year
              </Button>
              <Button variant="danger" disabled={busy} onClick={() => setDisconnectOpen(true)}>
                Disconnect
              </Button>
            </>
          )}
        </div>
        <p className="mt-4 text-xs text-text-3">
          Personal API keys expire on the date selected in Garmin Connect. Replacing or
          disconnecting here does not revoke a key at Garmin.
        </p>
      </Card>
      <Dialog open={connectOpen} onOpenChange={setConnectOpen} title="Connect Garmin">
        <ConnectFlow
          onConnected={() => {
            setConnectOpen(false);
            void live.refetch();
            void client.invalidateQueries();
            toast({ message: 'Garmin connection ready' });
          }}
        />
      </Dialog>
      <Dialog
        open={disconnectOpen}
        onOpenChange={setDisconnectOpen}
        title="Disconnect Garmin?"
        description="Your imported data stays here, but new data will stop syncing."
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDisconnectOpen(false)}>
            Keep connected
          </Button>
          <Button variant="danger" disabled={busy} onClick={() => void disconnect()}>
            Disconnect
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

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
  return (
    <div className="space-y-4">
      <Card title="Export your data" icon={Download}>
        <p className="text-sm text-text-2">
          Take your activities, wellness history and notes with you. JSON includes stored source
          responses and sample streams.
        </p>
        {session?.user && mode === 'live' ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              className="inline-flex min-h-11 items-center gap-2 rounded-control border border-border-strong bg-surface-2 px-4 py-2 text-sm font-semibold hover:bg-surface-3"
              href="/api/export"
              download
            >
              Complete JSON archive <Download size={16} />
            </a>
            <a
              className="inline-flex min-h-11 items-center gap-2 rounded-control border border-border-strong bg-surface-2 px-4 py-2 text-sm font-semibold hover:bg-surface-3"
              href="/api/export?format=csv"
              download
            >
              Activity spreadsheet <Download size={16} />
            </a>
          </div>
        ) : (
          <p className="mt-3 text-sm text-text-2">
            {session?.user
              ? 'Switch to your own workspace to export your data.'
              : 'Sign in to export your own data. Sample data is available in the demo workspace.'}
          </p>
        )}
        <p className="mt-3 text-xs text-text-3">
          Original activity files can be downloaded from each activity detail page.
        </p>
      </Card>
      <Card title="Private by default" icon={ShieldCheck}>
        <ul className="space-y-2 text-sm text-text-2">
          <li>Encrypted Garmin credentials</li>
          <li>Private sessions and health data</li>
          <li>No advertising or health-data analytics</li>
          <li>Open-source calculations</li>
        </ul>
      </Card>
      {session?.user && mode === 'live' && (
        <Card title="Your data, your decision" icon={Trash2}>
          <p className="text-sm text-text-2">
            Deleting imported data removes activities, wellness records, notes and original files
            from this installation, and disconnects Garmin.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="danger"
              onClick={() => {
                setTyped('');
                setConfirm('data');
              }}
            >
              Delete imported data
            </Button>
            {!session.local_mode && (
              <Button
                variant="danger"
                onClick={() => {
                  setTyped('');
                  setConfirm('account');
                }}
              >
                Delete workspace account
              </Button>
            )}
          </div>
        </Card>
      )}
      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm === 'account' ? 'Delete your workspace?' : 'Delete imported data?'}
        description="This cannot be undone here. Your Garmin account is not changed."
      >
        <p className="mb-3 text-sm text-text-2">
          {confirm === 'account'
            ? 'Your account, sessions, imported data and original files will be removed.'
            : 'Your imported data and original files will be removed. Your workspace account and preferences stay.'}
        </p>
        <label className="block text-sm">
          Type DELETE to confirm
          <input
            className="mt-1 w-full rounded-control border border-border-strong bg-surface-2 p-2"
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
      {mode === 'demo' && session?.user && (
        <Button variant="secondary" onClick={() => setMode('live')}>
          Switch to my workspace to export or delete data
        </Button>
      )}
      {mode === 'demo' && !session?.user && (
        <p className="text-sm text-text-2">
          You are exploring synthetic sample data.{' '}
          <a className="inline-flex items-center gap-1 text-accent underline" href="/welcome">
            Connect a workspace <ExternalLink size={13} />
          </a>{' '}
          to manage your own data.
        </p>
      )}
    </div>
  );
}
