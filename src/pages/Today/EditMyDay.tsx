import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { GripVertical } from 'lucide-react';
import { useState } from 'react';
import { Button, Dialog, Switch } from '../../components/ui';
import { CARD_LABELS } from './card-labels';

function SortableCard({
  id,
  enabled,
  onToggle,
}: {
  id: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
      }}
      className="flex items-center gap-2 rounded-control border border-border bg-surface-2 p-2"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Move ${CARD_LABELS[id]}`}
        className="touch-none rounded p-2 text-text-3 hover:text-text"
      >
        <GripVertical size={18} />
      </button>
      <span className="flex-1 text-sm font-medium">{CARD_LABELS[id]}</span>
      <Switch label={`Show ${CARD_LABELS[id]}`} checked={enabled} onChange={onToggle} />
    </div>
  );
}

export function EditMyDay({
  open,
  onClose,
  initial,
  onSave,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  initial: string[];
  onSave: (cards: string[]) => void;
  saving?: boolean;
}) {
  const [order, setOrder] = useState(() => [
    ...initial,
    ...Object.keys(CARD_LABELS).filter((id) => !initial.includes(id)),
  ]);
  const [enabled, setEnabled] = useState(() => new Set(initial));
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id)
      setOrder((old) =>
        arrayMove(old, old.indexOf(String(active.id)), old.indexOf(String(over.id))),
      );
  };
  const toggle = (id: string) =>
    setEnabled((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Edit My Day"
      description="Drag cards into the order you like and choose what appears."
    >
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
            {order.map((id) => (
              <SortableCard
                key={id}
                id={id}
                enabled={enabled.has(id)}
                onToggle={() => toggle(id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          disabled={saving}
          onClick={() => onSave(order.filter((id) => enabled.has(id)))}
        >
          {saving ? 'Saving…' : 'Save layout'}
        </Button>
      </div>
    </Dialog>
  );
}
