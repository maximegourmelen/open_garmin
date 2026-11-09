import { ExternalLink, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card, EmptyState, ErrorState, Pill, Skeleton, SourceBadge } from '../../components/ui';
import { useMethods, useResearch } from '../../lib/queries';
import type { ResearchPaper, ResearchReview } from '../../lib/types';

type Filter = 'reviewed' | 'downloaded' | 'all';
function PaperCard({ paper, review }: { paper: ResearchPaper; review?: ResearchReview }) {
  return (
    <article className="rounded-card border border-border bg-surface p-5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Pill tone={review ? 'success' : 'neutral'}>
          {review
            ? 'Focused review'
            : paper.full_text_status === 'downloaded'
              ? 'Full text saved'
              : 'Candidate'}
        </Pill>
        <span className="text-xs text-text-3">
          {paper.year} · {paper.journal}
        </span>
      </div>
      <h3 className="font-semibold">{paper.title}</h3>
      <p className="mt-1 text-sm text-text-2">{paper.authors}</p>
      {review && (
        <div className="mt-3 space-y-2 text-sm">
          <p>
            <strong>Finding:</strong> {review.finding}
          </p>
          <p className="text-text-2">
            <strong>Limits:</strong> {review.limitations}
          </p>
          <p className="text-text-2">
            <strong>How we use it:</strong> {review.approved_use}
          </p>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium text-accent">
        {paper.pubmed_url && (
          <a
            href={paper.pubmed_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 underline"
          >
            PubMed <ExternalLink size={12} />
          </a>
        )}
        {paper.publisher_url && (
          <a
            href={paper.publisher_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 underline"
          >
            Publisher <ExternalLink size={12} />
          </a>
        )}
        {paper.pmcid && (
          <a
            href={`https://pmc.ncbi.nlm.nih.gov/articles/${encodeURIComponent(paper.pmcid)}/`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 underline"
          >
            PMC full text <ExternalLink size={12} />
          </a>
        )}
      </div>
    </article>
  );
}
export default function MethodsPage() {
  const methods = useMethods();
  const research = useResearch();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('reviewed');
  const [expanded, setExpanded] = useState<string | null>(null);
  const reviewed = useMemo(
    () => new Map(research.data?.reviews.map((item) => [item.paper_id, item]) ?? []),
    [research.data],
  );
  const papers = useMemo(
    () =>
      (research.data?.papers ?? [])
        .filter(
          (paper) =>
            (filter === 'all' ||
              (filter === 'downloaded' && paper.full_text_status === 'downloaded') ||
              (filter === 'reviewed' && reviewed.has(paper.id))) &&
            `${paper.title} ${paper.authors} ${paper.journal} ${paper.topics.join(' ')}`
              .toLowerCase()
              .includes(query.trim().toLowerCase()),
        )
        .slice(0, 100),
    [research.data, reviewed, filter, query],
  );
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Transparent by design
        </p>
        <h1 className="font-display text-3xl font-bold md:text-4xl">How it works</h1>
        <p className="mt-1 max-w-2xl text-text-2">
          See where your numbers come from, how they are calculated, and which research informs the
          app’s explanations.
        </p>
      </header>
      <div className="grid gap-3 md:grid-cols-3">
        <Card title="From Garmin">
          <div className="space-y-2">
            <SourceBadge source="garmin" />
            <p className="text-sm text-text-2">
              Readings and activity details reported by your Garmin device or account.
            </p>
          </div>
        </Card>
        <Card title="Calculated here">
          <div className="space-y-2">
            <SourceBadge source="calculated" />
            <p className="text-sm text-text-2">
              Simple formulas applied to your recorded data, with evidence windows and limits shown
              below.
            </p>
          </div>
        </Card>
        <Card title="Added by you">
          <div className="space-y-2">
            <SourceBadge source="user" />
            <p className="text-sm text-text-2">
              Your goals, notes and check-ins. They remain separate from device readings.
            </p>
          </div>
        </Card>
      </div>
      <section aria-labelledby="methods-heading">
        <h2 id="methods-heading" className="mb-3 font-display text-2xl font-bold">
          How each number is calculated
        </h2>
        {methods.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : methods.isError ? (
          <ErrorState message={methods.error.message} retry={() => void methods.refetch()} />
        ) : !methods.data?.length ? (
          <EmptyState
            title="No methods available"
            text="Method explanations will appear when the app server is ready."
          />
        ) : (
          <div className="space-y-2">
            {methods.data.map((item) => (
              <div
                key={`${item.id}@${item.version}`}
                className="rounded-tile border border-border bg-surface"
              >
                <button
                  aria-expanded={expanded === item.id}
                  onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left"
                >
                  <span>
                    <strong>{item.title}</strong>
                    <span className="mt-1 block text-sm text-text-2">{item.plain}</span>
                  </span>
                  <span className="shrink-0 text-xs text-text-3">v{item.version}</span>
                </button>
                {expanded === item.id && (
                  <div className="space-y-2 border-t border-border p-4 text-sm">
                    <p>
                      <strong>Formula:</strong>{' '}
                      <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-xs">
                        {item.formula}
                      </code>
                    </p>
                    <p>
                      <strong>Inputs:</strong> {item.inputs.join(', ')}
                    </p>
                    <p>
                      <strong>Minimum data:</strong> {item.minimum_data}
                    </p>
                    <p className="text-xs text-text-3">
                      Method ID: {item.id}@{item.version}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
      <section aria-labelledby="research-heading">
        <h2 id="research-heading" className="font-display text-2xl font-bold">
          Research library
        </h2>
        <p className="mt-1 text-sm text-text-2">
          Paper records and focused reviews behind the app’s interpretation. Discovery alone does
          not make a paper approved evidence.
        </p>
        <div className="my-4 flex flex-wrap gap-3">
          <label className="flex min-w-56 flex-1 items-center gap-2 rounded-control border border-border bg-surface-2 px-3">
            <Search size={16} />
            <input
              aria-label="Search research papers"
              placeholder="Search title, author, topic…"
              className="w-full bg-transparent py-2 text-sm outline-none"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <select
            aria-label="Research status"
            className="rounded-control border border-border bg-surface-2 px-3 py-2 text-sm"
            value={filter}
            onChange={(event) => setFilter(event.target.value as Filter)}
          >
            <option value="reviewed">Reviewed</option>
            <option value="downloaded">Full text saved</option>
            <option value="all">All candidates</option>
          </select>
        </div>
        {research.isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
          </div>
        ) : research.isError ? (
          <ErrorState message={research.error.message} retry={() => void research.refetch()} />
        ) : research.data ? (
          <>
            <p className="mb-3 text-xs text-text-3">
              {papers.length} shown · {research.data.papers.length} candidate records ·{' '}
              {research.data.reviews.length} focused reviews
            </p>
            {research.data.claims.length > 0 && (
              <div className="mb-4 grid gap-3 md:grid-cols-3">
                {research.data.claims.map((claim) => (
                  <Card key={claim.id} title={claim.title}>
                    <p className="text-sm text-text-2">{claim.summary}</p>
                    <p className="mt-2 text-xs text-text-3">
                      Supported by {claim.paper_ids.length} reviewed{' '}
                      {claim.paper_ids.length === 1 ? 'paper' : 'papers'}
                    </p>
                  </Card>
                ))}
              </div>
            )}
            {papers.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {papers.map((paper) => (
                  <PaperCard key={paper.id} paper={paper} review={reviewed.get(paper.id)} />
                ))}
              </div>
            ) : (
              <EmptyState title="No papers match" text="Try a different search or status filter." />
            )}
          </>
        ) : (
          <EmptyState
            title="Research is unavailable"
            text="Try again when the app server is ready."
          />
        )}
      </section>
      <p className="border-t border-border pt-4 text-xs text-text-3">
        Open Garmin is independent and not affiliated with Garmin. This information helps you
        understand your data and is not medical advice.
      </p>
    </div>
  );
}
