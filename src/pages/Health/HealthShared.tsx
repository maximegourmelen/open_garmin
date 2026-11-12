import { Children } from 'react';
import { Link } from 'react-router-dom';
import { MetricLabel } from '../../components/data/Metric';
import { SourceBadge } from '../../components/ui/SourceBadge';
import { Panel, Section } from '../../components/ui/Structure';
import { glossary, type MetricId } from '../../content/glossary';
import type { Source } from '../../lib/types';

export function HealthMetrics({ children }: { children: React.ReactNode }) {
  return (
    <div role="group" aria-label="Key metrics">
      <Panel
        className={`grid grid-cols-2 gap-6 md:grid-cols-3 ${Children.toArray(children).length <= 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-5'}`}
      >
        {children}
      </Panel>
    </div>
  );
}

export function HealthMeaning({ id, source = 'garmin' }: { id: MetricId; source?: Source }) {
  const entry = glossary[id];
  return (
    <Section heading="What this means">
      <p className="max-w-[72ch] type-body text-text-2">{entry.howToRead}</p>
      <div className="flex items-center gap-3">
        <MetricLabel id={id} label={`Learn more about ${entry.title}`} />
        <SourceBadge source={source} />
      </div>
      {'methodId' in entry && entry.methodId && (
        <Link
          to={`/guide/methods#${entry.methodId}`}
          className="type-body text-accent hover:underline"
        >
          How it is calculated
        </Link>
      )}
    </Section>
  );
}
