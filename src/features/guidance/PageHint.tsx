import { useQueryClient } from '@tanstack/react-query';
import { Info } from 'lucide-react';
import { useState } from 'react';
import { useWorkspace } from '../../app/workspace-context';
import { Callout } from '../../components/ui/Structure';
import { useToast } from '../../components/ui/toast-context';
import { pageIntros, type PageId } from '../../content/pageIntros';
import { workspaceRequest } from '../../lib/api';
import { usePreferences } from '../../lib/queries';
import type { Preferences } from '../../lib/types';

export function PageHint({ id }: { id: PageId }) {
  const { mode } = useWorkspace();
  const prefs = usePreferences();
  const client = useQueryClient();
  const toast = useToast();
  const [reopened, setReopened] = useState(false);
  const [saving, setSaving] = useState(false);
  if (!prefs.data) return null;
  const intro = pageIntros[id];
  const dismissed = prefs.data.dismissed_hints?.includes(id) ?? false;
  const visible = !dismissed || reopened;
  const dismiss = async () => {
    if (saving) return;
    if (dismissed) {
      setReopened(false);
      return;
    }
    setSaving(true);
    try {
      const next: Preferences = {
        ...prefs.data!,
        dismissed_hints: [...(prefs.data!.dismissed_hints ?? []), id],
      };
      await workspaceRequest(mode, '/preferences', { method: 'PUT', body: JSON.stringify(next) });
      client.setQueryData([mode, 'preferences'], next);
      setReopened(false);
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : 'Could not save this hint' });
    } finally {
      setSaving(false);
    }
  };
  return visible ? (
    <Callout onDismiss={() => void dismiss()} dismissLabel="Got it">
      <div>
        <p className="font-medium text-text">How to read this page</p>
        {intro.bullets.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {intro.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2">{intro.description}</p>
        )}
      </div>
    </Callout>
  ) : (
    <button
      type="button"
      onClick={() => setReopened(true)}
      className="inline-flex items-center gap-1 type-caption text-text-2 hover:text-text"
    >
      <Info size={14} strokeWidth={1.5} aria-hidden="true" /> About this page
    </button>
  );
}
