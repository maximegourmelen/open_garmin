import { useEffect, useRef, useState } from 'react';
import { SegmentGauge, ZoneBars } from '../../components/charts';
import { MetricRow, StatGrid, StatTile } from '../../components/data';
import { Card, Disclosure, Pill, Tabs } from '../../components/ui';
import {
  formatDistance,
  formatDuration,
  formatElevation,
  formatPace,
  formatSpeed,
} from '../../lib/format';
import type { ActivityDetail, Preferences } from '../../lib/types';

const EFFECT_SEGMENTS = ['No effect', 'Minor', 'Maintaining', 'Improving', 'Highly improving'].map(
  (label, i) => ({ label, color: `z${i + 1}` }),
);
const BENEFITS: Record<string, string> = {
  RECOVERY: 'Recovery',
  AEROBIC_BASE: 'Base',
  TEMPO: 'Tempo',
  LACTATE_THRESHOLD: 'Threshold',
  VO2MAX: 'VO2 max',
  ANAEROBIC_CAPACITY: 'Anaerobic',
  SPRINT: 'Sprint',
};

export function ActivityStats({
  activity,
  prefs,
}: {
  activity: ActivityDetail;
  prefs?: Preferences;
}) {
  const units = prefs?.units ?? 'metric';
  const paceSport = ['running', 'walking', 'hiking'].includes(activity.sport);
  const speed =
    activity.sport === 'swimming' && activity.average_speed
      ? `${Math.floor(100 / activity.average_speed / 60)}:${String(Math.round(100 / activity.average_speed) % 60).padStart(2, '0')} /100m`
      : paceSport
        ? formatPace(activity.average_speed, units)
        : formatSpeed(activity.average_speed, units);
  return (
    <StatGrid>
      <StatTile label="Distance" value={formatDistance(activity.distance, units)} />
      <StatTile label="Time" value={formatDuration(activity.duration)} />
      <StatTile
        label={paceSport || activity.sport === 'swimming' ? 'Avg pace' : 'Avg speed'}
        value={speed}
      />
      <StatTile label="Avg HR" value={activity.average_hr} unit="bpm" />
      <StatTile label="Elev gain" value={formatElevation(activity.elevation, units)} />
      <StatTile label="Steps" value={activity.steps} />
      <StatTile label="Effort points" value={activity.effort_points} />
      <StatTile label="Calories" value={activity.calories} />
    </StatGrid>
  );
}

export function EffortSection({ activity }: { activity: ActivityDetail }) {
  const benefit = activity.te_label
    ? (BENEFITS[activity.te_label] ?? activity.te_label.toLowerCase().replaceAll('_', ' '))
    : null;
  return (
    <Card
      title="How hard was it?"

      explainer={{
        what: 'Heart rate zones describe how hard your heart was working.',
        why: 'Easy and hard minutes both have a place in training.',
        source: 'Garmin heart rate and training effect',
        method: 'effort_points@1',
      }}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          {activity.zone_details?.minutes ? (
            <ZoneBars minutes={activity.zone_details.minutes} />
          ) : (
            <p className="text-sm text-text-2">
              Heart rate zones were not available for this session.
            </p>
          )}
        </div>
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">Aerobic training effect</p>
            <SegmentGauge
              label="Aerobic training effect"
              value={activity.aerobic_te}
              segments={EFFECT_SEGMENTS}
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Anaerobic training effect</p>
            <SegmentGauge
              label="Anaerobic training effect"
              value={activity.anaerobic_te}
              segments={EFFECT_SEGMENTS}
            />
          </div>
          {benefit && (
            <p className="text-sm text-text-2">
              Primary benefit: <span className="font-semibold capitalize text-text">{benefit}</span>
            </p>
          )}
          {activity.body_battery_impact != null && (
            <p className="text-sm text-text-2">
              Body Battery impact: {activity.body_battery_impact > 0 ? '+' : ''}
              {activity.body_battery_impact}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

export function SplitTabs({
  activity,
  units,
}: {
  activity: ActivityDetail;
  units: 'metric' | 'imperial';
}) {
  const [tab, setTab] = useState('splits');
  const splits = units === 'metric' ? activity.splits_km : activity.splits_mi;
  return (
    <Card title={activity.sport === 'strength' ? 'Exercises' : 'Splits and laps'}>
      <Tabs
        value={tab}
        onChange={setTab}
        label="Activity breakdown"
        tabs={
          activity.sport === 'strength'
            ? [
                { value: 'sets', label: 'Sets' },
                { value: 'laps', label: 'Laps' },
              ]
            : [
                { value: 'splits', label: `Splits (${units === 'metric' ? 'km' : 'mi'})` },
                { value: 'laps', label: 'Watch laps' },
              ]
        }
      />
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[400px] text-left text-sm">
          <thead>
            <tr className="text-text-3">
              <th className="py-2">#</th>
              <th>Time</th>
              <th>{tab === 'sets' ? 'Exercise' : 'Pace'}</th>
              <th>HR</th>
              <th>Elevation</th>
            </tr>
          </thead>
          <tbody>
            {tab === 'splits'
              ? splits.map((split) => (
                  <tr key={split.index} className="border-t border-border">
                    <td className="py-2">{split.index}</td>
                    <td>{formatDuration(split.time_s)}</td>
                    <td>
                      {split.pace_s == null
                        ? '—'
                        : `${Math.floor(split.pace_s / 60)}:${String(Math.round(split.pace_s) % 60).padStart(2, '0')}`}
                      {split.partial && <span className="ml-1 text-xs text-text-3">partial</span>}
                    </td>
                    <td>{split.avg_hr ?? '—'}</td>
                    <td>
                      {split.elev_gain_m == null ? '—' : `+${Math.round(split.elev_gain_m)}m`}
                    </td>
                  </tr>
                ))
              : tab === 'laps'
                ? activity.laps.map((lap, index) => (
                    <tr key={index} className="border-t border-border">
                      <td className="py-2">{index + 1}</td>
                      <td>
                        {formatDuration(typeof lap.duration === 'number' ? lap.duration : null)}
                      </td>
                      <td>{formatPace(typeof lap.speed === 'number' ? lap.speed : null, units)}</td>
                      <td>{String(lap.hr ?? '—')}</td>
                      <td>{String(lap.elevation ?? '—')}</td>
                    </tr>
                  ))
                : activity.sets.map((set, index) => (
                    <tr key={index} className="border-t border-border">
                      <td className="py-2">{index + 1}</td>
                      <td>
                        {formatDuration(typeof set.duration === 'number' ? set.duration : null)}
                      </td>
                      <td>{String(set.exercise ?? 'Set')}</td>
                      <td>{String(set.reps ?? '—')} reps</td>
                      <td>{String(set.weight ?? '—')}</td>
                    </tr>
                  ))}
          </tbody>
        </table>
        {((tab === 'splits' && !splits.length) ||
          (tab === 'laps' && !activity.laps.length) ||
          (tab === 'sets' && !activity.sets.length)) && (
          <p className="py-4 text-sm text-text-2">No {tab} data was recorded.</p>
        )}
      </div>
    </Card>
  );
}

export function NoteEditor({
  activity,
  onSave,
}: {
  activity: ActivityDetail;
  onSave: (note: ActivityDetail['note']) => void;
}) {
  const [feel, setFeel] = useState<number | null>(activity.note.feel ?? activity.watch_feel);
  const [rpe, setRpe] = useState<number | null>(activity.note.rpe ?? activity.watch_rpe);
  const [tags, setTags] = useState(activity.note.tags);
  const [tagInput, setTagInput] = useState('');
  const [text, setText] = useState(activity.note.text);
  const initial = useRef(true);
  useEffect(() => {
    if (initial.current) {
      initial.current = false;
      return;
    }
    const timer = setTimeout(() => onSave({ text, rpe, feel, tags }), 800);
    return () => clearTimeout(timer);
  }, [text, rpe, feel, tags, onSave]);
  return (
    <Card title="How did it feel?">
      <p className="mb-2 text-sm text-text-2">How did this session feel to you?</p>
      <div className="flex gap-2" role="group" aria-label="How it felt">
        {['Very hard', 'Hard', 'Okay', 'Good', 'Great'].map((label, index) => (
          <button
            type="button"
            key={label}
            aria-label={label}
            aria-pressed={feel === index + 1}
            onClick={() => setFeel(index + 1)}
            className={`flex size-9 items-center justify-center rounded-full text-xl ${feel === index + 1 ? 'bg-accent-soft ring-2 ring-accent' : 'bg-surface-2'}`}
          >
            {['😫', '😕', '😐', '🙂', '😄'][index]}
          </button>
        ))}
      </div>
      <label className="mt-4 block text-sm text-text-2">
        Effort: {rpe ?? '—'} of 10
        <input
          type="range"
          min="1"
          max="10"
          value={rpe ?? 5}
          onChange={(event) => setRpe(Number(event.target.value))}
          className="mt-2 w-full accent-accent"
        />
      </label>
      <div className="mt-3">
        <p className="text-sm text-text-2">Tags</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setTags((old) => old.filter((value) => value !== tag))}
            >
              <Pill>{tag} ×</Pill>
            </button>
          ))}
        </div>
        <input
          value={tagInput}
          onChange={(event) => setTagInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              const tag = tagInput.trim();
              if (tag && !tags.includes(tag)) setTags((old) => [...old, tag]);
              setTagInput('');
            }
          }}
          placeholder="Add a tag and press Enter"
          aria-label="Add a tag"
          className="mt-2 w-full rounded-control border border-border bg-surface-2 px-3 py-2 text-sm text-text"
        />
      </div>
      <label className="mt-3 block text-sm text-text-2">
        Your note
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          maxLength={5000}
          className="mt-1 w-full rounded-control border border-border bg-surface-2 p-3 text-sm text-text"
        />
      </label>
      <p className="text-xs text-text-3">Changes save automatically.</p>
    </Card>
  );
}

export function DeeperSection({ activity }: { activity: ActivityDetail }) {
  return (
    <Disclosure id={`activity-${activity.id}`}>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="mb-2 font-semibold">Efficiency</h3>
          <MetricRow label="Efficiency factor" value={activity.efficiency?.ef} />
          <MetricRow
            label="Pace / HR decoupling"
            value={activity.efficiency?.decoupling_pct}
            unit="%"
          />
          <h3 className="mb-2 mt-4 font-semibold">Running form</h3>
          {activity.running_form ? (
            Object.entries(activity.running_form).map(([key, value]) => (
              <MetricRow key={key} label={key.replaceAll('_', ' ')} value={value} />
            ))
          ) : (
            <p className="text-sm text-text-2">No running form samples.</p>
          )}
        </div>
        <div>
          <h3 className="mb-2 font-semibold">Best efforts</h3>
          {activity.best_efforts.length ? (
            activity.best_efforts.map((effort) => (
              <MetricRow
                key={effort.kind}
                label={effort.label}
                value={formatDuration(effort.time_s)}
              />
            ))
          ) : (
            <p className="text-sm text-text-2">No best efforts calculated.</p>
          )}
          <h3 className="mb-2 mt-4 font-semibold">Watch metrics</h3>
          {activity.session_metrics.map((metric) => (
            <MetricRow
              key={metric.name}
              label={metric.name}
              value={metric.value}
              unit={metric.unit}
            />
          ))}
        </div>
      </div>
    </Disclosure>
  );
}
