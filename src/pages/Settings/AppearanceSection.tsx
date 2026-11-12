import { Switch } from '../../components/ui';
import { Section } from '../../components/ui/Structure';
import { SettingsRow } from './SettingsRow';
import type { SettingsModel } from './settingsModel';

const themes = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Match system' },
] as const;

export function AppearanceSection({ model }: { model: SettingsModel }) {
  const { draft, states, update } = model;
  return (
    <Section heading="Appearance">
      <div className="-mt-4">
        <SettingsRow
          label="Theme"
          description="Choose how Open Garmin looks on this device."
          state={states.theme}
        >
          <div role="group" aria-label="Theme" className="flex gap-2">
            {themes.map((choice) => (
              <button
                key={choice.value}
                type="button"
                aria-pressed={draft.theme === choice.value}
                onClick={() => update('theme', choice.value)}
                className={`min-w-0 flex-1 rounded-control border p-2 text-center type-caption ${draft.theme === choice.value ? 'border-accent text-text' : 'border-border text-text-2'}`}
              >
                <span
                  className="mb-2 block h-10 rounded-sm border border-border"
                  style={{
                    background:
                      choice.value === 'light'
                        ? 'var(--preview-light-bg)'
                        : choice.value === 'dark'
                          ? 'var(--preview-dark-bg)'
                          : 'linear-gradient(90deg, var(--preview-light-bg) 50%, var(--preview-dark-bg) 50%)',
                  }}
                >
                  <span
                    className="mx-2 mt-2 block h-2 rounded-sm"
                    style={{
                      background:
                        choice.value === 'dark'
                          ? 'var(--preview-dark-surface)'
                          : 'var(--preview-light-surface)',
                    }}
                  />
                </span>
                {choice.label}
              </button>
            ))}
          </div>
        </SettingsRow>
        <SettingsRow
          label="Reduce motion"
          description="Avoid animated transitions and chart motion."
          state={states.reduce_motion}
        >
          <Switch
            label="Reduce motion"
            checked={draft.reduce_motion}
            onChange={(value) => update('reduce_motion', value)}
          />
        </SettingsRow>
      </div>
    </Section>
  );
}
