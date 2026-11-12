import { Select } from '../../components/ui';
import { Section } from '../../components/ui/Structure';
import type { Preferences } from '../../lib/types';
import { SettingsRow } from './SettingsRow';
import type { SettingsModel } from './settingsModel';

const inputClass =
  'h-9 w-28 rounded-control border border-border-strong bg-surface px-3 text-right type-body text-text';

export function GoalsSection({ model }: { model: SettingsModel }) {
  const { draft, states, update } = model;
  return (
    <Section heading="Goals" className="scroll-mt-8">
      <div className="-mt-4">
        <SettingsRow
          label="Weekly active minutes"
          description="Vigorous minutes count twice."
          state={states.weekly_minutes}
        >
          <input
            aria-label="Weekly active minutes"
            className={inputClass}
            type="number"
            min={0}
            max={10080}
            value={draft.weekly_minutes}
            onChange={(event) => update('weekly_minutes', Number(event.target.value), true)}
          />
        </SettingsRow>
        <SettingsRow
          label="Activities per week"
          description="A separate goal for your recorded activities."
          state={states.weekly_sessions}
        >
          <input
            aria-label="Activities per week"
            className={inputClass}
            type="number"
            min={0}
            max={14}
            value={draft.weekly_sessions}
            onChange={(event) => update('weekly_sessions', Number(event.target.value), true)}
          />
        </SettingsRow>
        <SettingsRow
          label="Daily steps goal"
          description="Use Garmin's adaptive goal or set your own."
          state={states.steps_goal_source}
        >
          <Select
            label="Daily steps goal source"
            value={draft.steps_goal_source}
            onChange={(value) =>
              update('steps_goal_source', value as Preferences['steps_goal_source'])
            }
            options={[
              { value: 'garmin', label: "Use Garmin's" },
              { value: 'custom', label: 'Custom number' },
            ]}
          />
        </SettingsRow>
        {draft.steps_goal_source === 'custom' && (
          <SettingsRow
            label="Custom step goal"
            description="Steps per day."
            state={states.steps_goal}
          >
            <input
              aria-label="Custom step goal"
              className={inputClass}
              type="number"
              min={1}
              max={100000}
              value={draft.steps_goal}
              onChange={(event) => update('steps_goal', Number(event.target.value), true)}
            />
          </SettingsRow>
        )}
      </div>
    </Section>
  );
}
