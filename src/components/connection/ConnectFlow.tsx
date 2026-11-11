import { Eye, EyeOff, ExternalLink, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '../../app/workspace-context';
import { request, setCsrfToken } from '../../lib/api';
import type { Session } from '../../app/workspace-context';
import { Button } from '../ui';
import { Select } from '../ui/Controls';

const inputClass =
  'mt-1 w-full rounded-control border border-border-strong bg-surface-2 px-3 py-2 text-text';
export function ConnectFlow({ onConnected }: { onConnected: () => void }) {
  const { session, refreshSession, setMode } = useWorkspace();
  const client = useQueryClient();
  const [authMode, setAuthMode] = useState<'login' | 'register'>(() =>
    session?.registration_open ? 'register' : 'login',
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [region, setRegion] = useState<'com' | 'cn'>('com');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const keyFlow = Boolean(session?.user || session?.local_mode);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (keyFlow) {
        if (!session?.user) {
          const local = await request<Session>('/auth/local', { method: 'POST' });
          setCsrfToken(local.csrf_token);
          await refreshSession();
        }
        await request('/connection', {
          method: 'POST',
          body: JSON.stringify({ api_key: key.trim(), region }),
        });
        setKey('');
        setMode('live');
        void client.invalidateQueries();
        onConnected();
      } else {
        const signedIn = await request<Session>(`/auth/${authMode}`, {
          method: 'POST',
          body: JSON.stringify({ email, password, name: name || 'Athlete' }),
        });
        setCsrfToken(signedIn.csrf_token);
        setPassword('');
        await refreshSession();
        const status = await request<{ connection: { connected: boolean } }>('/status');
        if (status.connection.connected) {
          setMode('live');
          void client.invalidateQueries();
          onConnected();
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Connection failed. Try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <p className="type-body text-text-2">
        {keyFlow
          ? 'Connect with a revocable Personal API key. Your Garmin password is never needed.'
          : authMode === 'register'
            ? 'Create a private workspace, then connect Garmin.'
            : 'Sign in to your workspace to connect Garmin.'}
      </p>
      {!keyFlow ? (
        <>
          {authMode === 'register' && (
            <label className="block text-sm">
              Your name
              <input
                className={inputClass}
                autoComplete="given-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={120}
              />
            </label>
          )}
          <label className="block text-sm">
            Email
            <input
              className={inputClass}
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            Password
            <div className="relative">
              <input
                className={`${inputClass} pr-10`}
                type={visible ? 'text' : 'password'}
                autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={10}
                required
              />
              <button
                type="button"
                aria-label={visible ? 'Hide password' : 'Show password'}
                onClick={() => setVisible(!visible)}
                className="absolute right-2 top-3 rounded p-1"
              >
                {visible ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>
          <p className="text-sm text-text-2">
            {authMode === 'register' ? 'Already have a workspace?' : 'New here?'}{' '}
            <button
              type="button"
              className="text-accent underline"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setError('');
              }}
            >
              {authMode === 'register' ? 'Sign in' : 'Create a workspace'}
            </button>
          </p>
        </>
      ) : (
        <>
          <ol className="space-y-5 border-y border-border py-5 type-body text-text">
            <li>
              <span className="font-medium">1. Open the Garmin Connect key page.</span>
              <br />
              <a
                className="mt-1 inline-flex items-center gap-1 text-accent underline"
                href="https://connect.garmin.com/app/settings/personalApiToken"
                target="_blank"
                rel="noreferrer"
              >
                Open Garmin Connect <ExternalLink size={13} />
              </a>
              <details className="mt-1 type-caption text-text-2">
                <summary className="cursor-pointer">Why?</summary>
                <p className="mt-1">
                  This page lets you create a key without sharing your Garmin password.
                </p>
              </details>
            </li>
            <li>
              <span className="font-medium">2. Create a personal key.</span>
              <p className="mt-1 text-text-2">Choose an expiry and copy the key.</p>
              <details className="mt-1 type-caption text-text-2">
                <summary className="cursor-pointer">Why?</summary>
                <p className="mt-1">You can revoke or replace the key in Garmin Connect.</p>
              </details>
            </li>
            <li>
              <span className="font-medium">3. Paste it here.</span>
              <p className="mt-1 text-text-2">
                Recent readings import first; older history follows.
              </p>
              <details className="mt-1 type-caption text-text-2">
                <summary className="cursor-pointer">Why?</summary>
                <p className="mt-1">
                  Open Garmin uses the key to request your readings during sync.
                </p>
              </details>
            </li>
          </ol>
          <label className="block text-sm">
            Personal API key
            <input
              className={inputClass}
              type="password"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              minLength={16}
              required
            />
          </label>
          <div className="space-y-2 type-body">
            <p>Garmin account region</p>
            <Select
              label="Garmin account region"
              value={region}
              onChange={(value) => setRegion(value as 'com' | 'cn')}
              options={[
                { value: 'com', label: 'Global · garmin.com' },
                { value: 'cn', label: 'China · garmin.cn' },
              ]}
            />
          </div>
          <p className="flex items-center gap-2 text-xs text-text-2">
            <ShieldCheck size={16} />
            Stored encrypted on this computer. You can remove it any time.
          </p>
        </>
      )}
      {error && (
        <p role="alert" className="rounded-control bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy} className="w-full">
        {busy
          ? 'Working…'
          : keyFlow
            ? 'Connect Garmin'
            : authMode === 'register'
              ? 'Create workspace'
              : 'Sign in'}
      </Button>
    </form>
  );
}
