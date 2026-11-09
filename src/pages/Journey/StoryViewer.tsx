import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Dialog as RadixDialog } from 'radix-ui';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../../app/workspace-context';
import { Pip } from '../../components/companion';
import { Button, ErrorState, Skeleton } from '../../components/ui';
import { workspaceRequest } from '../../lib/api';
import { useRecap } from '../../lib/queries';
import type { Pose } from '../../lib/types';

export function StoryViewer({ week, onClose }: { week: string; onClose: () => void }) {
  const { mode } = useWorkspace();
  const queryClient = useQueryClient();
  const recap = useRecap(week);
  const [index, setIndex] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const markSeen = useMutation({
    mutationFn: () => workspaceRequest(mode, `/recaps/${week}/seen`, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [mode, 'journey'] });
      void queryClient.invalidateQueries({ queryKey: [mode, 'status'] });
      void queryClient.invalidateQueries({ queryKey: [mode, 'today'] });
    },
  });
  useEffect(() => {
    if (recap.data && !recap.data.seen && !markSeen.isPending && !markSeen.isSuccess)
      markSeen.mutate();
  }, [recap.data, markSeen]);
  const slides = recap.data?.slides ?? [];
  const slide = slides[index];
  const next = () => setIndex((i) => Math.min(slides.length - 1, i + 1));
  const previous = () => setIndex((i) => Math.max(0, i - 1));
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setIndex((i) => Math.min(slides.length - 1, i + 1));
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slides.length]);
  return (
    <RadixDialog.Root open onOpenChange={(open) => !open && onClose()}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <RadixDialog.Content
          className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-gradient-to-br from-accent-soft via-bg to-surface text-text outline-none"
          onTouchStart={(event) => {
            touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
          }}
          onTouchEnd={(event) => {
            if (!touchStart.current) return;
            const dx = event.changedTouches[0].clientX - touchStart.current.x;
            const dy = event.changedTouches[0].clientY - touchStart.current.y;
            if (dy > 100 && Math.abs(dy) > Math.abs(dx)) onClose();
            else if (dx < -60) next();
            else if (dx > 60) previous();
            touchStart.current = null;
          }}
        >
          <RadixDialog.Title className="sr-only">Your week in stories</RadixDialog.Title>
          <RadixDialog.Description className="sr-only">
            Weekly recap for {week}. Use arrow keys or the next and previous buttons.
          </RadixDialog.Description>
          <div className="mx-auto flex w-full max-w-3xl items-center gap-1 px-4 pt-4">
            {slides.map((item, i) => (
              <span
                key={`${item.kind}-${i}`}
                aria-label={`Slide ${i + 1} of ${slides.length}`}
                className={`h-1 flex-1 rounded-full ${i <= index ? 'bg-accent' : 'bg-border-strong'}`}
              />
            ))}
            <RadixDialog.Close asChild>
              <button aria-label="Close story" className="ml-3 rounded-full p-2 hover:bg-surface-3">
                <X size={22} />
              </button>
            </RadixDialog.Close>
          </div>
          {recap.isPending ? (
            <div className="m-auto w-full max-w-md space-y-5 p-6">
              <Skeleton className="mx-auto size-40" />
              <Skeleton className="h-24" />
            </div>
          ) : recap.isError ? (
            <div className="m-auto max-w-md">
              <ErrorState message={recap.error.message} retry={() => void recap.refetch()} />
            </div>
          ) : !slide ? (
            <div className="m-auto text-center">This week has no story slides yet.</div>
          ) : (
            <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-5 px-12 text-center">
              <Pip
                pose={slide.pose ?? ((slide.kind === 'goal' ? 'cheer' : 'wave') as Pose)}
                size={140}
              />
              <p className="text-xs font-semibold uppercase tracking-widest text-accent">
                {slide.title ?? slide.kind.replace('_', ' ')} · {index + 1} / {slides.length}
              </p>
              {slide.big && (
                <p className="font-display text-4xl font-bold md:text-6xl">{slide.big}</p>
              )}
              {slide.kind === 'goal' && slide.pct !== undefined && (
                <p className="font-display text-5xl font-bold text-accent">{slide.pct}%</p>
              )}
              <p className="max-w-xl text-lg text-text-2 md:text-2xl">{slide.text}</p>
              {slide.activity_id && (
                <Link
                  to={`/activities/${slide.activity_id}`}
                  onClick={onClose}
                  className="font-medium text-accent underline"
                >
                  See this activity
                </Link>
              )}
              <button
                aria-label="Previous slide"
                onClick={previous}
                disabled={index === 0}
                className="absolute left-1 rounded-full p-2 hover:bg-surface-3 disabled:opacity-30"
              >
                <ChevronLeft />
              </button>
              <button
                aria-label="Next slide"
                onClick={index === slides.length - 1 ? onClose : next}
                className="absolute right-1 rounded-full p-2 hover:bg-surface-3"
              >
                <ChevronRight />
              </button>
            </div>
          )}
          {slide && (
            <div className="mx-auto flex w-full max-w-3xl justify-between px-6 pb-6">
              <Button variant="secondary" onClick={previous} disabled={index === 0}>
                Back
              </Button>
              <Button onClick={index === slides.length - 1 ? onClose : next}>
                {index === slides.length - 1 ? 'Done' : 'Next'}
              </Button>
            </div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
