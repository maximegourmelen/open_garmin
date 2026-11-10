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
          className="min-h-8 rounded-md px-3 type-label text-text-2 data-[state=on]:bg-surface data-[state=on]:text-text"
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
    <label className="flex items-center justify-between gap-4 type-body text-text">
      <span>{label}</span>
      <RadixSwitch.Root
        checked={checked}
        onCheckedChange={onChange}
        aria-label={label}
        className="relative h-6 w-11 rounded-full bg-border-strong transition-colors data-[state=checked]:bg-accent"
      >
        <RadixSwitch.Thumb className="block size-4 translate-x-1 rounded-full bg-surface transition-transform data-[state=checked]:translate-x-6" />
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
        className="inline-flex h-9 items-center justify-between gap-3 rounded-control border border-border-strong bg-surface px-3 type-body text-text"
      >
        <RadixSelect.Value />
        <RadixSelect.Icon>
          <ChevronDown size={16} />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          className="z-50 overflow-hidden rounded-control border border-border-strong bg-surface p-1 text-text shadow-lg dark:shadow-none"
          position="popper"
          sideOffset={4}
        >
          <RadixSelect.Viewport>
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                className="relative flex min-h-9 cursor-pointer items-center rounded-md px-3 pr-8 type-body outline-none data-[highlighted]:bg-surface-2"
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
        className="flex gap-4 overflow-x-auto border-b border-border"
      >
        {tabs.map((tab) => (
          <RadixTabs.Trigger
            key={tab.value}
            value={tab.value}
            className="min-h-10 whitespace-nowrap border-b-2 border-transparent px-1 type-body text-text-2 data-[state=active]:border-text data-[state=active]:text-text"
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
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <RadixDialog.Content
          className={cn(
            'fixed inset-x-4 top-1/2 z-50 max-h-[90vh] -translate-y-1/2 overflow-y-auto rounded-card border border-border-strong bg-surface p-6 text-text shadow-lg dark:shadow-none sm:left-1/2 sm:w-[min(92vw,480px)] sm:-translate-x-1/2',
            className,
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <RadixDialog.Title className="type-heading">{title}</RadixDialog.Title>
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
