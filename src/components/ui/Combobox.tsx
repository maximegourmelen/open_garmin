import { useId, useState } from 'react';

export function Combobox({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const matches = options.filter((option) =>
    option.label.toLowerCase().includes(query.toLowerCase()),
  );
  const selected = options.find((option) => option.value === value);
  function choose(next: { value: string; label: string }) {
    onChange(next.value);
    setQuery('');
    setOpen(false);
  }
  return (
    <div className="relative grid gap-1 type-label text-text-2">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `${id}-${active}` : undefined}
        value={open ? query : (selected?.label ?? '')}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setActive((current) => Math.min(current + 1, matches.length - 1));
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((current) => Math.max(current - 1, 0));
          }
          if (event.key === 'Enter' && open && matches[active]) {
            event.preventDefault();
            choose(matches[active]);
          }
          if (event.key === 'Escape') {
            setOpen(false);
            setQuery('');
          }
        }}
        className="h-9 rounded-control border border-border-strong bg-surface px-3 type-body text-text"
      />
      {open && (
        <div
          id={`${id}-list`}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-control border border-border bg-surface p-1 shadow-lg dark:shadow-none"
        >
          {matches.length ? (
            matches.map((option, index) => (
              <button
                id={`${id}-${index}`}
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
                className="block w-full rounded-md px-3 py-2 text-left type-body text-text hover:bg-surface-2"
                data-active={index === active}
              >
                {option.label}
              </button>
            ))
          ) : (
            <p className="p-3 type-body text-text-3">No matches</p>
          )}
        </div>
      )}
    </div>
  );
}
