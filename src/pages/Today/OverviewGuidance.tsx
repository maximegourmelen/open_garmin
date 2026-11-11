import { Link } from 'react-router-dom';
import { Section } from '../../components/ui/Structure';
import type { OverviewResponse } from '../../lib/types';

export function OverviewGuidance({ data }: { data: OverviewResponse['today'] }) {
  return (
    <Section heading="Today" className="order-2 md:order-3 md:col-span-5">
      <div
        data-tour="guidance"
        className="rounded-card border border-border bg-surface p-5 md:min-h-[324px] md:p-6"
      >
        <h3 className="type-heading text-text">{data.title}</h3>
        <p className="mt-3 type-body text-text-2">{data.sentence}</p>
        {data.reasons.length > 0 && (
          <ul className="mt-5 space-y-2 border-t border-border pt-4 type-body text-text-2">
            {data.reasons.map((reason) => (
              <li key={reason.label}>
                {reason.label}: <strong className="font-medium text-text">{reason.value}</strong>
              </li>
            ))}
          </ul>
        )}
        <Link
          to="/guide/methods#today_suggestion@1"
          className="mt-5 inline-block type-body text-accent underline"
        >
          How this works
        </Link>
      </div>
    </Section>
  );
}
