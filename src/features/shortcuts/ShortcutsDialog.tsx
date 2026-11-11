import { Dialog } from '../../components/ui/Controls';
import { Kbd } from '../../components/ui/Button';

const shortcuts = [
  ['Open search', '⌘K / Ctrl K'],
  ['Overview', 'g o'],
  ['Activities', 'g a'],
  ['Health', 'g h'],
  ['Trends', 'g t'],
  ['Settings', 'g s'],
  ['Previous / next activity', '[ / ]'],
  ['Keyboard shortcuts', '?'],
  ['Close dialog', 'Esc'],
] as const;

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Keyboard shortcuts">
      <dl className="grid gap-3">
        {shortcuts.map(([label, keys]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0"
          >
            <dt className="type-body text-text-2">{label}</dt>
            <dd>
              <Kbd>{keys}</Kbd>
            </dd>
          </div>
        ))}
      </dl>
    </Dialog>
  );
}
