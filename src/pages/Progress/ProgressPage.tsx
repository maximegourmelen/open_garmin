import { useSearchParams } from 'react-router-dom';
import { Disclosure, EmptyState, ErrorState, Skeleton } from '../../components/ui';
import { RangeControl } from '../../components/ui/RangeControl';
import { PageHeader } from '../../layout/PageHeader';
import { usePreferences, useWorkspaceQuery } from '../../lib/queries';
import type { TrendsResponse } from '../../lib/types';
import { ConsistencyLoad } from './ConsistencyLoad';
import DeeperPanel from './DeeperPanel';
import { RecordsSection, ReportsSection } from './RecordsReports';
import { SignalsSection } from './SignalsSection';
import { VolumeSection } from './VolumeSection';

export default function ProgressPage() {
  const [params, setParams] = useSearchParams();
  const rawRange = params.get('range');
  const range = (['30D', '90D', '1Y'].includes(rawRange ?? '') ? rawRange : '30D') as
    '30D' | '90D' | '1Y';
  const query = useWorkspaceQuery<TrendsResponse>(['trends', range], `/trends?range=${range}`);
  const prefs = usePreferences();
  function setRange(value: string) {
    setParams((old) => {
      const next = new URLSearchParams(old);
      next.set('range', value);
      return next;
    });
  }
  return (
    <div className="space-y-10">
      <PageHeader
        title="Trends"
        pageId="trends"
        action={<RangeControl value={range} onChange={setRange} choices={['30D', '90D', '1Y']} />}
      />
      {query.isPending ? (
        <div role="status" aria-label="Loading Trends" className="space-y-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-72" />
          <Skeleton className="h-48" />
        </div>
      ) : query.isError ? (
        <ErrorState message={query.error.message} retry={() => void query.refetch()} />
      ) : !query.data || !query.data.volume.some((week) => week.minutes !== null) ? (
        <EmptyState
          title="Your trends start here"
          text="Sync your watch or explore sample data to see how your fitness changes."
        />
      ) : (
        <>
          <SignalsSection signals={query.data.signals} />
          <VolumeSection weeks={query.data.volume} units={prefs.data?.units ?? 'metric'} />
          <ConsistencyLoad data={query.data} />
          <RecordsSection records={query.data.records} units={prefs.data?.units ?? 'metric'} />
          <ReportsSection reports={query.data.reports} />
          <Disclosure id="trends-advanced" title="Show advanced analysis">
            <DeeperPanel />
          </Disclosure>
        </>
      )}
    </div>
  );
}
