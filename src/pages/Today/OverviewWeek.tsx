import { Link } from 'react-router-dom';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Section } from '../../components/ui/Structure';
import { formatDurationSummary } from '../../lib/format';
import type { OverviewResponse } from '../../lib/types';

export function OverviewWeek({ data }: { data: OverviewResponse['week'] }) {
  const active = data.active_minutes;
  const percent =
    active === null || !data.goal_minutes ? null : Math.round((active / data.goal_minutes) * 100);
  const labels = new Date(`${data.start}T12:00:00`).getDay() === 0 ? 'SMTWTFS' : 'MTWTFSS';
  return (
    <Section heading="This week" className="order-3 md:order-2 md:col-span-7">
      <div
        data-tour="week"
        className="space-y-5 rounded-card border border-border bg-surface p-5 md:min-h-[324px] md:p-6"
      >
        <div className="flex items-baseline justify-between gap-4">
          <p className="type-heading text-text tabular-nums">
            {active === null ? '—' : Math.round(active)}{' '}
            <span className="type-body font-normal text-text-2">
              / {data.goal_minutes} active minutes
            </span>
          </p>
          <span className="type-body tabular-nums text-text-2">
            {percent === null ? '—' : `${percent}%`}
          </span>
        </div>
        <ProgressBar
          value={active ?? 0}
          max={data.goal_minutes || 1}
          label="Active minutes towards weekly goal"
        />
        <p className="type-body text-text-2">
          {data.activity_count} of {data.goal_activities} activities ·{' '}
          {formatDurationSummary(data.activity_seconds)} recorded
        </p>
        <div
          className="flex h-16 items-end gap-2"
          role="img"
          aria-label="Daily active minutes this week"
        >
          {data.daily_active_minutes.map((minutes, index) => (
            <div key={index} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span
                title={minutes === null ? 'No reading' : `${Math.round(minutes)} active minutes`}
                className="w-full max-w-8 rounded-sm bg-data-1"
                style={{
                  height:
                    minutes === null
                      ? 2
                      : Math.max(
                          2,
                          Math.min(48, (minutes / Math.max(1, data.goal_minutes / 7)) * 40),
                        ),
                }}
              />
              <span className="type-caption text-text-3">{labels[index]}</span>
            </div>
          ))}
        </div>
        <Link to="/trends" className="inline-block type-body text-accent underline">
          See weekly trends
        </Link>
      </div>
    </Section>
  );
}
