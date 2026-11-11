import { Popover as RadixPopover } from 'radix-ui';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui';
import type { TourStep } from '../../content/tour';

function bounds(element: Element): DOMRect {
  const box = element.getBoundingClientRect();
  const pad = 8;
  return new DOMRect(box.x - pad, box.y - pad, box.width + pad * 2, box.height + pad * 2);
}

function insideFixed(element: Element): boolean {
  for (let current: Element | null = element; current; current = current.parentElement) {
    if (getComputedStyle(current).position === 'fixed') return true;
  }
  return false;
}

export function TourOverlay({
  step,
  index,
  count,
  onBack,
  onNext,
  onSkip,
  onDemo,
}: {
  step: TourStep;
  index: number;
  count: number;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  onDemo?: () => void;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const anchor = useRef({
    getBoundingClientRect: () => rectRef.current ?? new DOMRect(0, 0, 0, 0),
  });
  useEffect(() => {
    const target =
      Array.from(document.querySelectorAll(`[data-tour="${step.target}"]`)).find(
        (item) => item.getBoundingClientRect().width > 0 && item.getBoundingClientRect().height > 0,
      ) ?? document.querySelector('main');
    if (!target) return;
    const measure = () => {
      const next = bounds(target);
      rectRef.current = next;
      setRect(next);
    };
    const observer = new ResizeObserver(measure);
    // Radix restores the previous scroll position when the prior step unmounts.
    // Align after that cleanup so a return to an earlier step cannot strand this popover offscreen.
    const timer = window.setTimeout(() => {
      if (window.innerWidth < 768 && !insideFixed(target)) {
        const top = target.getBoundingClientRect().top;
        window.scrollTo(0, window.scrollY + top - 88);
      } else {
        target.scrollIntoView({ block: 'center', inline: 'nearest' });
      }
      measure();
      observer.observe(target);
      window.addEventListener('resize', measure);
      window.addEventListener('scroll', measure, true);
    }, 50);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step.target]);
  return (
    <>
      {rect && (
        <svg
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-40 h-screen w-screen"
          width="100%"
          height="100%"
        >
          <defs>
            <mask id="tour-spotlight">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                rx={12}
                fill="black"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.62)" mask="url(#tour-spotlight)" />
          <rect
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={rect.height}
            rx={12}
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth={2}
          />
        </svg>
      )}
      {rect && (
        <RadixPopover.Root open modal onOpenChange={(open) => !open && onSkip()}>
          <RadixPopover.Anchor virtualRef={anchor} />
          <RadixPopover.Portal>
            <RadixPopover.Content
              side="bottom"
              align="start"
              sideOffset={18}
              collisionPadding={16}
              onEscapeKeyDown={onSkip}
              className="z-50 w-[min(330px,calc(100vw-32px))] rounded-card border border-border-strong bg-surface p-5 text-text shadow-lg outline-none dark:shadow-none"
            >
              <p className="type-caption text-text-2">
                {index + 1} of {count}
              </p>
              <RadixPopover.Title className="mt-2 type-heading">{step.title}</RadixPopover.Title>
              <RadixPopover.Description className="mt-2 type-body text-text-2">
                {step.text}
              </RadixPopover.Description>
              {onDemo && (
                <Button variant="secondary" size="sm" className="mt-4" onClick={onDemo}>
                  See a Sleep explanation
                </Button>
              )}
              <div className="mt-6 flex items-center justify-between gap-2">
                <Button variant="quiet" size="sm" onClick={onSkip}>
                  Skip tour
                </Button>
                <div className="flex gap-2">
                  {index > 0 && (
                    <Button size="sm" onClick={onBack}>
                      Back
                    </Button>
                  )}
                  <Button variant="primary" size="sm" onClick={onNext}>
                    {index === count - 1 ? 'Done' : 'Next'}
                  </Button>
                </div>
              </div>
            </RadixPopover.Content>
          </RadixPopover.Portal>
        </RadixPopover.Root>
      )}
    </>
  );
}
