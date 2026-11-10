import { Dialog as RadixDialog, Popover as RadixPopover, Tooltip as RadixTooltip } from 'radix-ui';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { IconButton } from './Button';

export function Drawer({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <RadixDialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-screen min-h-[70vh] overflow-y-auto rounded-t-card border border-border bg-surface p-6 text-text shadow-lg dark:shadow-none md:inset-y-0 md:left-auto md:right-0 md:w-[440px] md:rounded-none">
          <header className="mb-6 flex items-center justify-between">
            <RadixDialog.Title className="type-heading">{title}</RadixDialog.Title>
            <RadixDialog.Close asChild>
              <IconButton label="Close drawer">
                <X size={16} />
              </IconButton>
            </RadixDialog.Close>
          </header>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export function Popover({ trigger, children }: { trigger: ReactNode; children: ReactNode }) {
  return (
    <RadixPopover.Root>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          sideOffset={8}
          className="z-50 max-w-xs rounded-control border border-border bg-surface p-4 type-body text-text shadow-lg dark:shadow-none"
        >
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}

export function Tooltip({ trigger, children }: { trigger: ReactNode; children: ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={400}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{trigger}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            sideOffset={6}
            className="z-50 rounded-control border border-border bg-surface px-2 py-1 type-caption text-text shadow-lg dark:shadow-none"
          >
            {children}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
