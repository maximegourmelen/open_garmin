import { useEffect, useRef, useState } from 'react';
import { Pill } from '../../components/ui';
import { Section } from '../../components/ui/Structure';
import type { ActivityDetail } from '../../lib/types';

export function NoteEditor({
  activity,
  onSave,
}: {
  activity: ActivityDetail;
  onSave: (note: ActivityDetail['note']) => void;
}) {
  const [feel, setFeel] = useState<number | null>(activity.note.feel ?? activity.watch_feel);
  const [rpe, setRpe] = useState<number | null>(activity.note.rpe ?? activity.watch_rpe);
  const [tags, setTags] = useState(activity.note.tags);
  const [tagInput, setTagInput] = useState('');
  const [text, setText] = useState(activity.note.text);
  const initial = useRef(true);
  useEffect(() => {
    if (initial.current) {
      initial.current = false;
      return;
    }
    const timer = setTimeout(() => onSave({ text, rpe, feel, tags }), 800);
    return () => clearTimeout(timer);
  }, [text, rpe, feel, tags, onSave]);
  return (
    <Section heading="Notes">
      <div className="max-w-2xl space-y-3">
        <p className="mb-2 text-sm text-text-2">How did this session feel to you?</p>
        <div className="flex gap-2" role="group" aria-label="How it felt">
          {['Very hard', 'Hard', 'Okay', 'Good', 'Great'].map((label, index) => (
            <button
              type="button"
              key={label}
              aria-label={label}
              aria-pressed={feel === index + 1}
              onClick={() => setFeel(index + 1)}
              className={`flex size-9 items-center justify-center rounded-full type-body ${feel === index + 1 ? 'bg-accent-soft ring-2 ring-accent' : 'bg-surface-2'}`}
            >
              {index + 1}
            </button>
          ))}
        </div>
        <label className="mt-4 block text-sm text-text-2">
          Perceived effort: {rpe ?? '—'} of 10
          <input
            type="range"
            min="1"
            max="10"
            value={rpe ?? 5}
            onChange={(event) => setRpe(Number(event.target.value))}
            className="mt-2 w-full accent-accent"
          />
        </label>
        <div className="mt-3">
          <p className="text-sm text-text-2">Tags</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setTags((old) => old.filter((value) => value !== tag))}
              >
                <Pill>{tag} ×</Pill>
              </button>
            ))}
          </div>
          <input
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                const tag = tagInput.trim();
                if (tag && !tags.includes(tag)) setTags((old) => [...old, tag]);
                setTagInput('');
              }
            }}
            placeholder="Add a tag and press Enter"
            aria-label="Add a tag"
            className="mt-2 w-full rounded-control border border-border bg-surface-2 px-3 py-2 text-sm text-text"
          />
        </div>
        <label className="mt-3 block text-sm text-text-2">
          Your note
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={3}
            maxLength={5000}
            className="mt-1 w-full rounded-control border border-border bg-surface-2 p-3 text-sm text-text"
          />
        </label>
        <p className="text-xs text-text-3">Changes save automatically.</p>
      </div>
    </Section>
  );
}
