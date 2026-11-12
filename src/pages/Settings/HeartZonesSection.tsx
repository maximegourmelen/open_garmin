import { Select } from '../../components/ui';
import { Section } from '../../components/ui/Structure';
import type { Preferences } from '../../lib/types';
import { SettingsRow } from './SettingsRow';
import type { SettingsModel } from './settingsModel';

const names = ['Warm-up', 'Easy', 'Aerobic', 'Threshold', 'Maximum'];
const floors = [50, 60, 70, 80, 90];

export function HeartZonesSection({ model }: { model: SettingsModel }) {
  const { draft, states, update } = model;
  return (
    <Section heading="Heart-rate zones" description="Garmin zone times are used when available.">
      <div className="-mt-4">
        <SettingsRow
          label="Source"
          description="Choose the zones from your watch or calculate them from your maximum heart rate."
          state={states.zone_source}
        >
          <Select
            label="Heart-rate zone source"
            value={draft.zone_source}
            onChange={(value) =>
              update(
                'zone_source',
                value as Preferences['zone_source'],
                value === 'custom' && draft.max_hr === null,
              )
            }
            options={[
              { value: 'garmin', label: 'From your watch' },
              { value: 'custom', label: 'Custom' },
            ]}
          />
        </SettingsRow>
        {draft.zone_source === 'custom' && (
          <SettingsRow
            label="Maximum heart rate"
            description="Use a measured value when you have one. Garmin can estimate this in your profile."
            state={states.max_hr}
          >
            <input
              aria-label="Maximum heart rate"
              className="h-9 w-28 rounded-control border border-border-strong bg-surface px-3 text-right type-body text-text"
              type="number"
              min={120}
              max={230}
              placeholder="bpm"
              value={draft.max_hr ?? ''}
              onChange={(event) =>
                update('max_hr', event.target.value ? Number(event.target.value) : null, true)
              }
            />
          </SettingsRow>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse type-body">
          <caption className="sr-only">Heart-rate zone preview</caption>
          <thead>
            <tr className="border-b border-border text-left text-text-2">
              <th className="py-2 font-normal">Zone</th>
              <th className="py-2 font-normal">Name</th>
              <th className="py-2 font-normal">Range</th>
            </tr>
          </thead>
          <tbody>
            {names.map((name, index) => (
              <tr key={name} className="border-b border-border">
                <th scope="row" className="py-2 text-left font-normal">
                  Z{index + 1}
                </th>
                <td className="py-2">{name}</td>
                <td className="py-2 tabular-nums">
                  {draft.zone_source === 'custom' && draft.max_hr
                    ? `${Math.round((draft.max_hr * floors[index]) / 100)}–${index === 4 ? draft.max_hr : Math.round((draft.max_hr * floors[index + 1]) / 100) - 1} bpm`
                    : `${floors[index]}–${index === 4 ? 100 : floors[index + 1]}% max`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
