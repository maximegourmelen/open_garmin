import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui';
import { useMethods } from '../../lib/queries';
import type { Method } from '../../lib/types';

const usualRange: Method = {
  id: 'common.usual_range',
  version: 0,
  title: 'Your usual range',
  plain: 'A personal band around your recent readings.',
  formula: 'Median of the last 30 readings ± 1.5 × 1.4826 × median absolute deviation.',
  inputs: ['up to 30 recent daily readings'],
  minimum_data: '14 readings',
};

function MethodSection({ method }: { method: Method }) {
  const key = method.version ? `${method.id}@${method.version}` : method.id;
  return (
    <section
      id={key}
      aria-labelledby={`${key}-title`}
      className="scroll-mt-8 border-b border-border py-6 first:pt-0"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={`${key}-title`} className="type-heading text-text">
          {method.title}
        </h3>
        {method.version > 0 && (
          <span className="type-caption text-text-2">Version {method.version}</span>
        )}
      </div>
      <p className="mt-2 type-body text-text-2">{method.plain}</p>
      <div className="mt-4 rounded-control bg-surface-2 p-4">
        <p className="type-caption text-text-2">Calculation</p>
        <code className="mt-2 block whitespace-pre-wrap type-body text-text">{method.formula}</code>
      </div>
      <dl className="mt-4 grid gap-3 type-body sm:grid-cols-2">
        <div>
          <dt className="text-text-2">Inputs</dt>
          <dd className="mt-1 text-text">{method.inputs.join(', ')}</dd>
        </div>
        <div>
          <dt className="text-text-2">Minimum data</dt>
          <dd className="mt-1 text-text">{method.minimum_data}</dd>
        </div>
      </dl>
    </section>
  );
}

export function GuideMethods() {
  const methods = useMethods();
  const { hash } = useLocation();
  useEffect(() => {
    if (!methods.data || !hash) return;
    const id = decodeURIComponent(hash.slice(1));
    const frame = requestAnimationFrame(() =>
      document.getElementById(id)?.scrollIntoView({ block: 'start' }),
    );
    return () => cancelAnimationFrame(frame);
  }, [hash, methods.data]);
  if (methods.isPending)
    return (
      <div role="status" aria-label="Loading methods" className="space-y-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  if (methods.isError)
    return <ErrorState message={methods.error.message} retry={() => void methods.refetch()} />;
  if (!methods.data?.length)
    return (
      <EmptyState
        title="No methods available"
        text="Method explanations will appear when the app server is ready."
      />
    );
  return (
    <div>
      {[usualRange, ...methods.data].map((method) => (
        <MethodSection key={`${method.id}@${method.version}`} method={method} />
      ))}
    </div>
  );
}
