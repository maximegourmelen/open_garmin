import { ArrowUpRight } from 'lucide-react';
import { glossary, metricIds } from '../../content/glossary';
import { useMetricDrawer } from '../../features/metric-drawer/metric-drawer-context';

export function GuideMetrics() {
  const openMetric = useMetricDrawer();
  return (
    <div className="divide-y divide-border border-y border-border">
      {metricIds.map((id) => {
        const entry = glossary[id];
        return (
          <button
            key={id}
            type="button"
            onClick={() => openMetric?.(id)}
            className="flex w-full items-start justify-between gap-4 py-4 text-left hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span>
              <span className="block font-medium text-text">{entry.title}</span>
              <span className="mt-1 block type-body text-text-2">{entry.what}</span>
            </span>
            <ArrowUpRight
              className="mt-1 shrink-0"
              size={16}
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}
