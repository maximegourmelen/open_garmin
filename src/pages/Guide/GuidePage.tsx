import { Link, Navigate, useParams } from 'react-router-dom';
import {
  guideDisclaimer,
  guideTopicIds,
  guideTopics,
  type GuideTopicId,
} from '../../content/guide';
import { PageHeader } from '../../layout/PageHeader';
import { GuideMethods } from './GuideMethods';
import { GuideMetrics } from './GuideMetrics';
import { GuideResearch } from './GuideResearch';

function isTopic(value: string | undefined): value is GuideTopicId {
  return value !== undefined && guideTopicIds.includes(value as GuideTopicId);
}

export default function GuidePage() {
  const { topic } = useParams();
  if (topic && !isTopic(topic)) return <Navigate to="/guide" replace />;
  const current = isTopic(topic) ? topic : 'getting-started';
  const content = guideTopics[current];
  return (
    <div className="space-y-8">
      <PageHeader title="Guide" pageId="guide" />
      <div className="grid gap-8 md:grid-cols-[220px_minmax(0,1fr)] md:gap-10">
        <nav aria-label="Guide topics" className="min-w-0 md:border-r md:border-border md:pr-5">
          <ul className="flex gap-1 overflow-x-auto pb-2 md:block md:space-y-1 md:overflow-visible md:pb-0">
            {guideTopicIds.map((id) => (
              <li key={id} className="shrink-0 md:shrink">
                <Link
                  to={id === 'getting-started' ? '/guide' : `/guide/${id}`}
                  aria-current={id === current ? 'page' : undefined}
                  className="block rounded-control px-3 py-2 type-body text-text-2 hover:bg-surface-2 hover:text-text aria-[current=page]:bg-surface-2 aria-[current=page]:font-medium aria-[current=page]:text-text"
                >
                  {guideTopics[id].title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="min-w-0 max-w-[72ch] pb-8">
          <header className="mb-8">
            <h2 className="type-section text-text">{content.title}</h2>
            <p className="mt-2 type-body text-text-2">{content.summary}</p>
          </header>
          <div className="space-y-4 type-body text-text-2">
            {content.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {'bullets' in content && content.bullets && (
              <ul className="list-disc space-y-2 pl-5">
                {content.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            )}
          </div>
          {current === 'getting-started' && (
            <div className="mt-6 flex flex-wrap gap-4 type-body">
              <Link to="/?tour=1" className="font-medium text-accent underline">
                Take the tour
              </Link>
              <Link to="/settings?section=connection" className="font-medium text-accent underline">
                Connect Garmin
              </Link>
            </div>
          )}
          {current === 'connecting-garmin' && (
            <Link
              to="/settings?section=connection"
              className="mt-6 inline-block type-body font-medium text-accent underline"
            >
              Open connection settings
            </Link>
          )}
          {current === 'privacy' && (
            <Link
              to="/settings?section=data"
              className="mt-6 inline-block type-body font-medium text-accent underline"
            >
              Open data settings
            </Link>
          )}
          <div className="mt-8">
            {current === 'metrics' && <GuideMetrics />}
            {current === 'methods' && <GuideMethods />}
            {current === 'research' && <GuideResearch />}
          </div>
          <p className="mt-12 border-t border-border pt-5 type-caption text-text-2">
            {guideDisclaimer}
          </p>
        </article>
      </div>
    </div>
  );
}
