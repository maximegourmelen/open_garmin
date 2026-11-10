import { Slider as RadixSlider } from 'radix-ui';
import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'children'> & { label: string };

export function Input({ label, className, id, ...props }: InputProps) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <label htmlFor={inputId} className="grid gap-1 type-label text-text-2">
      {label}
      <input
        id={inputId}
        className={cn(
          'h-9 rounded-control border border-border-strong bg-surface px-3 type-body text-text outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
          className,
        )}
        {...props}
      />
    </label>
  );
}

export function NumberInput({ label, min, max, step = 1, ...props }: InputProps) {
  return (
    <Input
      type="number"
      label={label}
      min={min}
      max={max}
      step={step}
      inputMode="decimal"
      {...props}
    />
  );
}

export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="grid gap-2 type-label text-text-2">
      <div className="flex justify-between">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <RadixSlider.Root
        aria-label={label}
        value={[value]}
        onValueChange={([next]) => onChange(next)}
        min={min}
        max={max}
        step={step}
        className="relative flex h-9 w-full touch-none items-center"
      >
        <RadixSlider.Track className="relative h-1 w-full rounded-full bg-surface-2">
          <RadixSlider.Range className="absolute h-full rounded-full bg-accent" />
        </RadixSlider.Track>
        <RadixSlider.Thumb
          aria-label={label}
          className="block size-4 rounded-full border-2 border-accent bg-surface shadow-sm"
        />
      </RadixSlider.Root>
    </div>
  );
}
