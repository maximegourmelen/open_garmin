import { Info } from 'lucide-react';
import { Popover } from 'radix-ui';
import { Link } from 'react-router-dom';

export function Explainer({
  title,
  what,
  why,
  source,
  method,
}: {
  title: string;
  what: string;
  why: string;
  source: string;
  method?: string;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger
        className="inline-flex size-8 items-center justify-center rounded-full text-text-3 hover:bg-surface-3 hover:text-text"
        aria-label={`About ${title}`}
      >
        <Info size={16} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          className="z-50 w-72 rounded-tile border border-border-strong bg-surface-2 p-4 text-sm text-text shadow-xl"
        >
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-2 text-text-2">{what}</p>
          <p className="mt-2 text-text-2">{why}</p>
          <p className="mt-2 text-xs text-text-3">Source: {source}</p>
          {method && (
            <Link to={`/methods#${method}`} className="mt-3 inline-block font-medium text-accent">
              How it's calculated
            </Link>
          )}
          <Popover.Arrow className="fill-surface-2" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
