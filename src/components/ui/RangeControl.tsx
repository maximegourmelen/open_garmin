import { cn } from '../../lib/cn';

const standard = ['7D', '30D', '90D', '1Y'] as const;

export function RangeControl({
  value,
  onChange,
  includeAll = false,
}: {
  value: string;
  onChange: (value: string) => void;
  includeAll?: boolean;
}) {
  const options = includeAll ? [...standard, 'All'] : [...standard];
  function select(next: string) {
    const url = new URL(window.location.href);
    url.searchParams.set('range', next);
    window.history.replaceState(null, '', url);
    onChange(next);
  }
  return (
    <div
      role="group"
      aria-label="Date range"
      className="inline-flex rounded-control bg-surface-2 p-1"
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => select(option)}
          className={cn(
            'h-8 rounded-md px-3 type-label text-text-2',
            value === option && 'bg-surface text-text shadow-sm',
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
