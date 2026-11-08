import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Button, Dialog } from '../ui';
import { Pip } from './Pip';

export function Celebration({
  open,
  onClose,
  title,
  text,
  name = 'Pip',
  showPip = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  text: string;
  name?: string;
  showPip?: boolean;
}) {
  const launched = useRef(false);
  useEffect(() => {
    if (!open) {
      launched.current = false;
      return;
    }
    if (launched.current || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    launched.current = true;
    void confetti({
      particleCount: 65,
      spread: 65,
      origin: { y: 0.35 },
      colors: ['#2e9bff', '#ffc83d', '#34d399'],
      disableForReducedMotion: true,
    });
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()} title={title}>
      <div className="flex flex-col items-center gap-4 pb-3 text-center">
        {showPip && <Pip pose="cheer" size={140} name={name} />}
        <p className="max-w-sm text-text-2">{text}</p>
        <Button variant="primary" onClick={onClose}>
          Keep going
        </Button>
      </div>
    </Dialog>
  );
}
