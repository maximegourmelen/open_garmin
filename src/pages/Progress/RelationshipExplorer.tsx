import { useState } from 'react';
import { ScatterPlot } from '../../components/charts';
import { Card, EmptyState, ErrorState, Select, Skeleton } from '../../components/ui';
import { useRelationship } from '../../lib/queries';
import type { Range } from '../../lib/types';

const variables = [
  ['sleep_minutes', 'Sleep duration'],
  ['sleep_score', 'Sleep score'],
  ['hrv', 'HRV'],
  ['resting_hr', 'Resting heart rate'],
  ['bb_at_wake', 'Body Battery at wake'],
  ['stress_avg', 'Stress'],
  ['steps', 'Steps'],
  ['active_minutes', 'Active minutes'],
  ['effort_points', 'Effort points'],
  ['checkin_energy', 'Check-in energy'],
  ['checkin_mood', 'Check-in mood'],
].map(([value, label]) => ({ value, label }));
export function RelationshipExplorer({ range }: { range: Range }) {
  const [x, setX] = useState('sleep_minutes');
  const [y, setY] = useState('checkin_energy');
  const [lag, setLag] = useState(0);
  const relation = useRelationship(x, y, lag, range);
  return (
    <Card
      title="Relationships explorer"
      explainer={{
        what: 'Paired daily readings show how two values moved together.',
        why: 'Explore patterns in your own history.',
        source: 'Your Garmin and check-in data',
        method: 'relationship@1',
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          Compare
          <Select label="First value" value={x} onChange={setX} options={variables} />
        </label>
        <label className="space-y-1 text-sm">
          With
          <Select
            label="Second value"
            value={y}
            onChange={setY}
            options={variables.filter((item) => item.value !== x)}
          />
        </label>
        <label className="space-y-1 text-sm">
          Timing
          <Select
            label="Timing"
            value={String(lag)}
            onChange={(value) => setLag(Number(value))}
            options={[
              { value: '0', label: 'Same day' },
              { value: '1', label: 'Next day' },
            ]}
          />
        </label>
      </div>
      {relation.isPending ? (
        <Skeleton className="mt-4 h-48" />
      ) : relation.isError ? (
        <ErrorState message={relation.error.message} retry={() => void relation.refetch()} />
      ) : relation.data ? (
        <div className="mt-4">
          <p className="font-medium">{relation.data.words}</p>
          <p className="text-sm text-text-2">
            {relation.data.n} paired days
            {relation.data.rho !== null ? ` · Spearman ρ ${relation.data.rho}` : ''}
          </p>
          {relation.data.points.length ? (
            <ScatterPlot
              label={`${x} versus ${y}`}
              data={relation.data.points.map(([a, b]) => ({ x: a, y: b }))}
              xLabel={variables.find((item) => item.value === x)?.label}
              yLabel={variables.find((item) => item.value === y)?.label}
            />
          ) : (
            <EmptyState
              title="No paired days yet"
              text="More daily readings will make this comparison possible."
            />
          )}
          <p className="text-xs text-text-3">{relation.data.disclaimer}</p>
        </div>
      ) : null}
    </Card>
  );
}
