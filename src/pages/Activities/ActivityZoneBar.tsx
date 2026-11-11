import { Tooltip } from '../../components/ui/Overlays';

export function ActivityZoneBar({ values }: { values: (number | null)[] | null }) {
  if (!values?.some((value) => value !== null && value > 0)) return null;
  const total = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  return (
    <Tooltip
      trigger={
        <button type="button" aria-label="Heart rate zone mix" className="block w-16 py-2">
          <span className="flex h-1.5 overflow-hidden rounded-sm bg-surface-3">
            {values.map((value, i) => (
              <span
                key={i}
                style={{
                  width: `${total ? ((value ?? 0) / total) * 100 : 0}%`,
                  background: `var(--z${i + 1})`,
                }}
              />
            ))}
          </span>
        </button>
      }
    >
      <span>Heart rate zones: Z1 easy → Z5 maximum</span>
    </Tooltip>
  );
}
