import { Combobox, Select } from '../../components/ui';
import { Section } from '../../components/ui/Structure';
import type { Preferences } from '../../lib/types';
import { SettingsRow } from './SettingsRow';
import type { SettingsModel } from './settingsModel';

export function UnitsSection({ model }: { model: SettingsModel }) {
  const { draft, states, update } = model;
  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const known =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  const zones = [browserZone, ...known.filter((zone) => zone !== browserZone)].map(
    (zone, index) => ({
      value: zone,
      label: index === 0 ? `${zone} · browser` : zone,
    }),
  );
  return (
    <Section heading="Units and region">
      <div className="-mt-4">
        <SettingsRow
          label="Units"
          description="Distance, speed and elevation across the app."
          state={states.units}
        >
          <Select
            label="Units"
            value={draft.units}
            onChange={(value) => update('units', value as Preferences['units'])}
            options={[
              { value: 'metric', label: 'Metric · km, m' },
              { value: 'imperial', label: 'Imperial · mi, ft' },
            ]}
          />
        </SettingsRow>
        <SettingsRow
          label="Week starts on"
          description="Sets the weekly goal and report boundary."
          state={states.week_start}
        >
          <Select
            label="Week starts on"
            value={draft.week_start}
            onChange={(value) => update('week_start', value as Preferences['week_start'])}
            options={[
              { value: 'monday', label: 'Monday' },
              { value: 'sunday', label: 'Sunday' },
            ]}
          />
        </SettingsRow>
        <SettingsRow
          label="Time zone"
          description="Dates and weeks use this local time zone."
          state={states.timezone}
        >
          <div className="w-[240px] max-w-full text-left">
            <Combobox
              label="Time zone"
              hideLabel
              value={draft.timezone}
              onChange={(value) => update('timezone', value)}
              options={zones}
            />
          </div>
        </SettingsRow>
      </div>
    </Section>
  );
}
