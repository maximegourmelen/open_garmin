import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useWorkspace } from '../../app/workspace-context';
import { ConnectFlow } from '../../components/connection/ConnectFlow';
import { Button, Dialog, ErrorState, Select, Skeleton, useToast } from '../../components/ui';
import { Section } from '../../components/ui/Structure';
import { request } from '../../lib/api';
import type { StatusResponse } from '../../lib/types';
import { SettingsRow } from './SettingsRow';

export function ConnectionSection() {
  const { session, mode, setMode } = useWorkspace();
  const client = useQueryClient();
  const toast = useToast();
  const [connectOpen, setConnectOpen] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [busy, setBusy] = useState(false);
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
      toast({ message: days <= 3 ? 'Sync started' : `Importing the last ${days} days` });
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
  const status = live.data;
  return (
    <Section heading="Garmin connection">
      <div className="-mt-4">
        <SettingsRow
          label="Status"
          description={
            status?.connection.message ?? 'Your Garmin data stays private in this workspace.'
          }
        >
          <span className="type-body text-text">
            {status?.connection.connected
              ? 'Connected'
              : session?.user
                ? 'Not connected'
                : 'Sample workspace'}
          </span>
        </SettingsRow>
        {live.isPending && session?.user ? (
          <Skeleton className="h-20" />
        ) : live.isError ? (
          <ErrorState message={live.error.message} retry={() => void live.refetch()} />
        ) : (
          <>
            <SettingsRow label="Last sync">
              <span className="type-body">
                {status?.connection.last_success
                  ? new Date(status.connection.last_success).toLocaleString()
                  : 'Not yet'}
              </span>
            </SettingsRow>
            <SettingsRow label="Newest data">
              <span className="type-body">{status?.data_through ?? 'Not yet imported'}</span>
            </SettingsRow>
            <SettingsRow
              label="Key expiry"
              description="Personal API key expiry is set in Garmin Connect."
            >
              <span className="type-body">Check Garmin Connect</span>
            </SettingsRow>
          </>
        )}
        <SettingsRow
          label="Connection controls"
          description="Sync recent data, import history, or replace your key."
        >
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => setConnectOpen(true)}>
              {status?.connection.connected ? 'Replace key' : 'Connect Garmin'}
            </Button>
            {mode === 'demo' && session?.user && (
              <Button variant="quiet" onClick={() => setMode('live')}>
                Open my data
              </Button>
            )}
            {status?.connection.connected && (
              <>
                <Button variant="secondary" disabled={busy} onClick={() => void sync(3)}>
                  Sync now
                </Button>
                <Select
                  label="Import history"
                  value="history"
                  onChange={(value) => void sync(Number(value))}
                  options={[
                    { value: 'history', label: 'Import history' },
                    { value: '90', label: '90 days' },
                    { value: '365', label: '1 year' },
                  ]}
                />
                <Button variant="quiet" disabled={busy} onClick={() => setDisconnectOpen(true)}>
                  Disconnect
                </Button>
              </>
            )}
          </div>
        </SettingsRow>
      </div>
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
    </Section>
  );
}
