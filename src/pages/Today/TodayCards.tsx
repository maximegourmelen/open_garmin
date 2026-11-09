import {
  BatteryMedium,
  CalendarDays,
  Flame,
  Footprints,
  Heart,
  HeartPulse,
  Map,
  Moon,
  Sparkles,
  Sun,
} from 'lucide-react';
import { useState } from 'react';
import { Pip } from '../../components/companion';
import { RingGauge, RouteMap, Sparkline, StageBar, WeekDots } from '../../components/charts';
import { BigNumber } from '../../components/data';
import { Button, Card, Pill, ProgressBar } from '../../components/ui';
import { formatDistance, formatDuration, formatNumber } from '../../lib/format';
import type { Preferences, TodayResponse } from '../../lib/types';

type Props = {
  data: TodayResponse;
  mode: 'demo' | 'live';
  prefs?: Preferences;
  onCheckin: (value: {
    mood: number | null;
    energy: number | null;
    soreness: number | null;
    note: string;
  }) => void;
  checkinSaving?: boolean;
};

function CheckInCard({
  data,
  onSave,
  saving,
}: {
  data: TodayResponse['checkin'];
  onSave: Props['onCheckin'];
  saving?: boolean;
}) {
  const [mood, setMood] = useState<number | null>(data?.mood ?? null);
  const [energy, setEnergy] = useState<number | null>(data?.energy ?? null);
  const [soreness, setSoreness] = useState<number | null>(data?.soreness ?? null);
  const [note, setNote] = useState(data?.note ?? '');
  return (
    <Card title="Check-in" icon={Heart} source="user">
      <p className="mb-3 text-sm text-text-2">How are you feeling today?</p>
      <div className="flex gap-2" role="group" aria-label="Mood">
        {['Very low', 'Low', 'Okay', 'Good', 'Great'].map((label, i) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            aria-pressed={mood === i + 1}
            title={label}
            onClick={() => setMood(i + 1)}
            className={`flex size-9 items-center justify-center rounded-full text-xl ${mood === i + 1 ? 'bg-accent-soft ring-2 ring-accent' : 'bg-surface-2'}`}
          >
            {['😫', '😕', '😐', '🙂', '😄'][i]}
          </button>
        ))}
      </div>
      <label className="mt-4 block text-xs font-medium text-text-2">
        Energy: {energy ?? '—'} of 5
        <input
          type="range"
          min="1"
          max="5"
          value={energy ?? 3}
          onChange={(event) => setEnergy(Number(event.target.value))}
          className="mt-2 w-full accent-accent"
        />
      </label>
      <div className="mt-3">
        <p className="text-xs font-medium text-text-2">Soreness</p>
        <div className="mt-1 flex gap-2">
          {['None', 'Some', 'A lot'].map((label, i) => (
            <button
              key={label}
              type="button"
              aria-pressed={soreness === i}
              onClick={() => setSoreness(i)}
              className={`rounded-full px-3 py-1 text-xs ${soreness === i ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-text-2'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <label className="mt-3 block text-xs text-text-2">
        Anything else?
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={1000}
          rows={2}
          className="mt-1 w-full rounded-control border border-border bg-surface-2 p-2 text-sm text-text"
        />
      </label>
      <Button
        size="sm"
        variant="primary"
        className="mt-2"
        disabled={saving}
        onClick={() => onSave({ mood, energy, soreness, note })}
      >
        Save check-in
      </Button>
    </Card>
  );
}

export function TodayCard({
  id,
  data,
  mode,
  prefs,
  onCheckin,
  checkinSaving,
}: Props & { id: string }) {
  const sampleSource = mode === 'demo' ? ('demo' as const) : ('garmin' as const);
  switch (id) {
    case 'week':
      return (
        <Card
          title="This week"
          icon={CalendarDays}
          source={sampleSource}
          explainer={{
            what: 'Active minutes count moderate movement, with vigorous minutes counting double.',
            why: 'They show how your week is adding up.',
            source: 'Garmin intensity minutes or activity duration',
            method: data.week.method,
          }}
        >
          <div className="flex items-center gap-4">
            <RingGauge
              label="Weekly active minutes"
              value={data.week.minutes}
              max={data.week.goal || 1}
              size={96}
              sublabel={`${Math.round(data.week.pct ?? 0)}% of goal`}
            />
            <div>
              <BigNumber value={Math.round(data.week.minutes)} unit="min" size="lg" />
              <p className="text-xs text-text-2">
                of {data.week.goal} min · {data.week.sessions} of {data.week.sessions_goal} sessions
              </p>
            </div>
          </div>
          <div className="mt-4">
            <WeekDots
              days={data.week.by_day.map((day) => ({
                date: day.date,
                sports: day.sports,
                isToday: day.is_today,
                isFuture: day.is_future,
              }))}
            />
          </div>
          <p className="mt-3 text-sm text-text-2">{data.week.sentence}</p>
        </Card>
      );
    case 'suggestion':
      return (
        <Card
          title="Today's suggestion"
          icon={Sun}
          source="calculated"
          explainer={{
            what: 'A friendly suggestion based on recent sleep, recovery, activity, and your check-in.',
            why: 'It helps you choose a pace for today.',
            source: 'Open Garmin rules',
            method: data.suggestion.method,
          }}
        >
          <div className="flex items-start gap-3">
            <Pip pose={data.suggestion.pose} size={72} />
            <div>
              <h3 className="font-semibold">{data.suggestion.title}</h3>
              <p className="mt-1 text-sm text-text-2">{data.suggestion.text}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {data.suggestion.signals.map((signal) => (
              <Pill
                key={signal.id}
                tone={
                  signal.state === 'good'
                    ? 'success'
                    : signal.state === 'low'
                      ? 'warning'
                      : 'neutral'
                }
              >
                {signal.label}: {signal.value_text}
              </Pill>
            ))}
          </div>
          <p className="mt-3 text-xs text-text-3">{data.suggestion.footnote}</p>
        </Card>
      );
    case 'streak':
      return (
        <Card
          title="Streak"
          icon={Flame}
          href="/journey"
          source="calculated"
          explainer={{
            what: 'Consecutive weeks when you met your minutes or sessions goal.',
            why: 'Consistency matters, and rest days are welcome.',
            source: 'Open Garmin from weekly activity',
            method: data.streak.method,
          }}
        >
          <BigNumber
            value={data.streak.current}
            unit={data.streak.current === 1 ? 'week' : 'weeks'}
            size="xl"
          />
          <p className="mt-2 text-sm text-text-2">
            {data.streak.at_risk
              ? `${Math.ceil(data.streak.remaining_minutes)} more minutes keeps your streak going.`
              : `Your longest streak is ${data.streak.longest} weeks.`}
          </p>
        </Card>
      );
    case 'sleep':
      return (
        <Card
          title="Sleep"
          icon={Moon}
          href="/health/sleep"
          source={sampleSource}
          explainer={{
            what: 'How long you slept last night, including your stages.',
            why: 'Regular sleep helps you recover.',
            source: 'Garmin sleep data',
          }}
        >
          <BigNumber
            value={data.sleep?.minutes == null ? null : formatDuration(data.sleep.minutes * 60)}
            size="lg"
          />
          {data.sleep && (
            <StageBar
              stages={['deep', 'light', 'rem', 'awake'].map((key) => ({
                key,
                label: key[0].toUpperCase() + key.slice(1),
                minutes: data.sleep!.stages[key] ?? 0,
                color: `sleep-${key}`,
              }))}
            />
          )}
          <p className="mt-3 text-sm text-text-2">
            {data.sleep?.sentence ?? 'Sleep details will appear here.'}
          </p>
        </Card>
      );
    case 'body_battery':
      return (
        <Card
          title="Body Battery"
          icon={BatteryMedium}
          href="/health/energy"
          source={sampleSource}
          explainer={{
            what: 'Garmin’s estimate of your current energy from 0 to 100.',
            why: 'Compare it with your own usual pattern.',
            source: 'Garmin Body Battery',
          }}
        >
          <div className="flex items-center gap-4">
            <RingGauge
              label="Body Battery"
              value={data.body_battery?.latest ?? null}
              max={100}
              color="bb-level"
              size={64}
            />
            <div className="text-sm text-text-2">
              <p>Charged +{data.body_battery?.charged ?? '—'}</p>
              <p>Drained −{data.body_battery?.drained ?? '—'}</p>
            </div>
          </div>
          <p className="mt-2 text-sm text-text-2">
            {data.body_battery?.sentence ?? 'Your watch has not reported this yet.'}
          </p>
        </Card>
      );
    case 'resting_hr':
      return (
        <Card
          title="Resting heart rate"
          icon={Heart}
          href="/health/heart"
          source={sampleSource}
          explainer={{
            what: 'Your lowest steady heart rate during the day.',
            why: 'It may slowly change as your fitness changes; compare only with yourself.',
            source: 'Garmin watch',
          }}
        >
          <div className="flex items-center justify-between">
            <BigNumber value={data.resting_hr?.value} unit="bpm" size="lg" />
            <Sparkline
              values={data.resting_hr?.spark ?? []}
              label="Resting heart rate over four weeks"
            />
          </div>
          <p className="mt-2 text-sm text-text-2">
            {data.resting_hr?.sentence ?? 'This appears when your watch reports it.'}
          </p>
        </Card>
      );
    case 'checkin':
      return <CheckInCard data={data.checkin} onSave={onCheckin} saving={checkinSaving} />;
    case 'latest_activity':
      return (
        <Card
          title="Latest activity"
          icon={Map}
          href={data.latest_activity ? `/activities/${data.latest_activity.id}` : '/activities'}
          source={sampleSource}
        >
          {data.latest_activity ? (
            <>
              <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                {data.latest_activity.route_preview && (
                  <RouteMap
                    points={data.latest_activity.route_preview.map(([lat, lon]) => ({ lat, lon }))}
                  />
                )}
                <div>
                  <h3 className="font-semibold">{data.latest_activity.name}</h3>
                  <p className="mt-1 text-xs text-text-2">{data.latest_activity.date}</p>
                  <p className="mt-2 text-sm">
                    {formatDistance(data.latest_activity.distance, prefs?.units)} ·{' '}
                    {formatDuration(data.latest_activity.duration)}
                  </p>
                  <p className="mt-2 text-sm text-text-2">{data.latest_activity.summary.text}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-text-2">Your next activity will appear here.</p>
          )}
        </Card>
      );
    case 'next_milestone':
      return (
        <Card title="Next milestone" icon={Sparkles} href="/journey" source="calculated">
          {data.next_milestone ? (
            <>
              <h3 className="font-semibold">{data.next_milestone.title}</h3>
              <p className="mb-3 text-sm text-text-2">{data.next_milestone.description}</p>
              {data.next_milestone.progress && (
                <>
                  <ProgressBar
                    label={data.next_milestone.title}
                    value={data.next_milestone.progress.current}
                    max={data.next_milestone.progress.target}
                    color="celebrate"
                  />
                  <p className="mt-2 text-xs text-text-2">
                    {data.next_milestone.progress.current} of {data.next_milestone.progress.target}{' '}
                    {data.next_milestone.progress.unit}
                  </p>
                </>
              )}
            </>
          ) : (
            <p className="text-sm text-text-2">Keep moving and see what you unlock.</p>
          )}
        </Card>
      );
    case 'insights':
      return (
        <Card title="Things I noticed" icon={Sparkles} href="/progress" source="calculated">
          <div className="space-y-3">
            {data.insights.length ? (
              data.insights.map((insight) => (
                <div
                  key={insight.id}
                  className="border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <h3 className="text-sm font-semibold">{insight.title}</h3>
                  <p className="mt-1 text-sm text-text-2">{insight.body}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-text-2">
                More observations will appear as data builds up.
              </p>
            )}
          </div>
        </Card>
      );
    case 'steps':
      return (
        <Card title="Steps" icon={Footprints} href="/health/steps" source={sampleSource}>
          <BigNumber
            value={data.steps?.value == null ? null : formatNumber(data.steps.value)}
            size="lg"
          />
          {data.steps?.goal && (
            <div className="mt-3">
              <ProgressBar label="Steps goal" value={data.steps.value ?? 0} max={data.steps.goal} />
            </div>
          )}
        </Card>
      );
    case 'hrv':
      return (
        <Card title="HRV" icon={HeartPulse} href="/health/heart" source={sampleSource}>
          <BigNumber value={data.hrv?.value} unit="ms" size="lg" />
          <p className="mt-2 text-sm text-text-2">
            {data.hrv?.sentence ?? 'Your watch has not reported this yet.'}
          </p>
        </Card>
      );
    case 'journey':
      return (
        <Card title="Your journey" icon={Map} href="/journey" source="user">
          <h3 className="font-semibold">{data.journey?.name ?? 'Choose a journey'}</h3>
          <p className="mt-2 text-sm text-text-2">
            {data.journey ? 'See your next small step.' : 'A journey can help you build a routine.'}
          </p>
        </Card>
      );
    case 'stress':
      return (
        <Card title="Stress" icon={HeartPulse} href="/health/stress" source={sampleSource}>
          <p className="text-sm text-text-2">
            See how your stress and rest changed through the day.
          </p>
        </Card>
      );
    default:
      return null;
  }
}
