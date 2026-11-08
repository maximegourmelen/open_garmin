import { Check, ChevronDown, X } from 'lucide-react';
import {
  Dialog as RadixDialog,
  Select as RadixSelect,
  Switch as RadixSwitch,
  Tabs as RadixTabs,
  ToggleGroup,
} from 'radix-ui';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { IconButton } from './Button';

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(next) => next && onChange(next as T)}
      aria-label={label}
      className="inline-flex rounded-control bg-surface-2 p-1"
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          className="min-h-8 rounded-lg px-3 text-sm font-medium text-text-2 transition-colors data-[state=on]:bg-surface-3 data-[state=on]:text-text"
        >
          {option.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center justify-between gap-4 text-sm text-text">
      <span>{label}</span>
      <RadixSwitch.Root
        checked={checked}
        onCheckedChange={onChange}
        aria-label={label}
        className="relative h-7 w-12 rounded-full bg-surface-3 transition-colors data-[state=checked]:bg-accent"
      >
        <RadixSwitch.Thumb className="block size-5 translate-x-1 rounded-full bg-white transition-transform data-[state=checked]:translate-x-6" />
      </RadixSwitch.Root>
    </label>
  );
}

export function Select({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <RadixSelect.Root value={value} onValueChange={onChange}>
      <RadixSelect.Trigger
        aria-label={label}
        className="inline-flex min-h-10 items-center justify-between gap-3 rounded-control border border-border-strong bg-surface-2 px-3 text-sm text-text"
      >
        <RadixSelect.Value />
        <RadixSelect.Icon>
          <ChevronDown size={16} />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          className="z-50 overflow-hidden rounded-control border border-border-strong bg-surface-2 p-1 text-text shadow-xl"
          position="popper"
          sideOffset={4}
        >
          <RadixSelect.Viewport>
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                className="relative flex min-h-9 cursor-pointer items-center rounded-lg px-3 pr-8 text-sm outline-none data-[highlighted]:bg-surface-3"
              >
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="absolute right-2">
                  <Check size={16} />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}

export function Tabs({
  value,
  onChange,
  tabs,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  tabs: { value: string; label: string }[];
  label: string;
}) {
  return (
    <RadixTabs.Root value={value} onValueChange={onChange}>
      <RadixTabs.List
        aria-label={label}
        className="flex gap-1 overflow-x-auto border-b border-border"
      >
        {tabs.map((tab) => (
          <RadixTabs.Trigger
            key={tab.value}
            value={tab.value}
            className="min-h-10 whitespace-nowrap border-b-2 border-transparent px-3 text-sm text-text-2 data-[state=active]:border-accent data-[state=active]:text-text"
          >
            {tab.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
    </RadixTabs.Root>
  );
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <RadixDialog.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-card border border-border-strong bg-surface p-5 text-text shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[min(92vw,560px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-card',
            className,
          )}
        >
          <div
            className="mx-auto mb-4 h-1 w-10 rounded-full bg-border-strong sm:hidden"
            aria-hidden="true"
          />
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <RadixDialog.Title className="text-xl font-bold">{title}</RadixDialog.Title>
              {description && (
                <RadixDialog.Description className="mt-1 text-sm text-text-2">
                  {description}
                </RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close asChild>
              <IconButton label="Close dialog">
                <X size={18} />
              </IconButton>
            </RadixDialog.Close>
          </div>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export const Sheet = Dialog;
