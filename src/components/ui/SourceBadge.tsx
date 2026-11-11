import { Calculator, Pencil, Watch } from 'lucide-react';
import { Tooltip } from 'radix-ui';
import type { Source } from '../../lib/types';

const details = {
  garmin: { label: 'Garmin', text: 'Measured by your Garmin watch', icon: Watch },
  calculated: {
    label: 'Calculated',
    text: 'Calculated by Open Garmin from your data — tap ⓘ to see how',
    icon: Calculator,
  },
  user: { label: 'You', text: 'Entered by you', icon: Pencil },
  demo: { label: 'Synthetic', text: 'Fictional data for exploring the app', icon: Watch },
  imported_fit: { label: 'Imported FIT', text: 'Read from an imported FIT file', icon: Watch },
};

export function SourceBadge({ source }: { source: Source }) {
  const item = details[source];
  const Icon = item.icon;
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span
            className="inline-flex cursor-help items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-1 text-[11px] font-medium text-text-2"
            tabIndex={0}
          >
            <Icon size={12} aria-hidden="true" />
            {item.label}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            sideOffset={5}
            className="z-50 max-w-56 rounded-control border border-border-strong bg-surface-3 px-3 py-2 text-xs text-text shadow-lg"
          >
            {item.text}
            <Tooltip.Arrow className="fill-surface-3" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
