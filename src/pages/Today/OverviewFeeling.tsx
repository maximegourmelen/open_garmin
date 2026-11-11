import { useState } from 'react';
import { Section } from '../../components/ui/Structure';
import type { OverviewResponse } from '../../lib/types';

export function OverviewFeeling({
  data,
  onSave,
  saving,
}: {
  data: OverviewResponse['feeling_today'];
  onSave: (mood: number | null, note: string) => void;
  saving: boolean;
}) {
  const [mood, setMood] = useState<number | null>(data?.mood ?? null);
  const [note, setNote] = useState(data?.note ?? '');
  const [editing, setEditing] = useState(false);
  return (
    <Section heading="How do you feel today?" className="order-6 md:col-span-12">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Feeling today">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`Feeling ${value} of 5`}
            aria-pressed={mood === value}
            disabled={saving}
            onClick={() => {
              setMood(value);
              onSave(value, note);
            }}
            className="flex size-10 items-center justify-center rounded-control border border-border type-body tabular-nums text-text hover:border-accent aria-pressed:border-accent aria-pressed:bg-accent-soft"
          >
            {value}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setEditing((open) => !open)}
          className="ml-2 type-body text-accent underline"
        >
          {editing ? 'Close note' : 'Add note'}
        </button>
      </div>
      {editing && (
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSave(mood, note);
            setEditing(false);
          }}
        >
          <label className="sr-only" htmlFor="overview-note">
            Today’s note
          </label>
          <input
            id="overview-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={1000}
            placeholder="A short note for today"
            className="min-w-48 flex-1 rounded-control border border-border-strong bg-surface px-3 py-2 type-body text-text"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-control bg-accent px-4 py-2 type-body text-on-primary disabled:opacity-50"
          >
            Save note
          </button>
        </form>
      )}
    </Section>
  );
}
