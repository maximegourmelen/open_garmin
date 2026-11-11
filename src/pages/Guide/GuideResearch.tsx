import { ExternalLink, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui';
import { Select } from '../../components/ui/Controls';
import { useResearch } from '../../lib/queries';

type Filter = 'reviewed' | 'downloaded' | 'all';

export function GuideResearch() {
  const research = useResearch();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('reviewed');
  const reviews = useMemo(
    () => new Map(research.data?.reviews.map((item) => [item.paper_id, item]) ?? []),
    [research.data],
  );
  const papers = (research.data?.papers ?? [])
    .filter((paper) => {
      const matchesStatus =
        filter === 'all' ||
        (filter === 'downloaded' && paper.full_text_status === 'downloaded') ||
        (filter === 'reviewed' && reviews.has(paper.id));
      const matchesText =
        `${paper.title} ${paper.authors} ${paper.journal} ${paper.topics.join(' ')}`
          .toLowerCase()
          .includes(query.trim().toLowerCase());
      return matchesStatus && matchesText;
    })
    .slice(0, 100);
  return (
    <div className="space-y-6">
      {Boolean(research.data?.claims.length) && (
        <section className="space-y-4" aria-label="Research claims">
          <h3 className="type-heading">Claims we use</h3>
          {research.data?.claims.map((claim) => (
            <div key={claim.id} className="border-b border-border pb-4">
              <h4 className="font-medium text-text">{claim.title}</h4>
              <p className="mt-1 type-body text-text-2">{claim.summary}</p>
              <p className="mt-1 type-caption text-text-2">
                {claim.paper_ids.length} reviewed{' '}
                {claim.paper_ids.length === 1 ? 'paper' : 'papers'}
              </p>
            </div>
          ))}
        </section>
      )}
      <section aria-label="Research papers">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="flex min-w-56 flex-1 items-center gap-2 rounded-control border border-border-strong bg-surface px-3">
            <Search size={16} aria-hidden="true" />
            <input
              aria-label="Search research papers"
              placeholder="Search title, author or topic"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent py-2 type-body text-text outline-none"
            />
          </label>
          <Select
            label="Research status"
            value={filter}
            onChange={(value) => setFilter(value as Filter)}
            options={[
              { value: 'reviewed', label: 'Reviewed' },
              { value: 'downloaded', label: 'Full text saved' },
              { value: 'all', label: 'All candidates' },
            ]}
          />
        </div>
        {research.isPending ? (
          <div role="status" aria-label="Loading research">
            <Skeleton className="h-40" />
          </div>
        ) : research.isError ? (
          <ErrorState message={research.error.message} retry={() => void research.refetch()} />
        ) : papers.length ? (
          <div className="overflow-x-auto rounded-control border border-border">
            <table className="w-full min-w-[660px] border-collapse text-left type-body">
              <caption className="sr-only">Research papers and focused reviews</caption>
              <thead className="bg-surface-2 text-text-2">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Study
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Year
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Finding and limits
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Source
                  </th>
                </tr>
              </thead>
              <tbody>
                {papers.map((paper) => {
                  const review = reviews.get(paper.id);
                  const url =
                    paper.pubmed_url ??
                    paper.publisher_url ??
                    (paper.pmcid
                      ? `https://pmc.ncbi.nlm.nih.gov/articles/${encodeURIComponent(paper.pmcid)}/`
                      : null);
                  return (
                    <tr key={paper.id} className="border-t border-border align-top">
                      <td className="px-4 py-3">
                        <strong className="font-medium text-text">{paper.title}</strong>
                        <span className="mt-1 block type-caption text-text-2">
                          {paper.authors} · {paper.journal}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-text-2">{paper.year}</td>
                      <td className="px-4 py-3 text-text-2">
                        {review
                          ? 'Reviewed'
                          : paper.full_text_status === 'downloaded'
                            ? 'Full text saved'
                            : 'Candidate'}
                      </td>
                      <td className="px-4 py-3 text-text-2">
                        {review ? (
                          <>
                            <p>{review.finding}</p>
                            <p className="mt-1 type-caption">Limit: {review.limitations}</p>
                          </>
                        ) : (
                          'Awaiting focused review'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-accent underline"
                          >
                            Open <ExternalLink size={14} aria-hidden="true" />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No papers match" text="Try a different search or status filter." />
        )}
        {research.data && (
          <p className="mt-3 type-caption text-text-2">
            {papers.length} shown · {research.data.papers.length} candidate records ·{' '}
            {research.data.reviews.length} focused reviews
          </p>
        )}
      </section>
    </div>
  );
}
