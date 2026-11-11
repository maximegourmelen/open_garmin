import { Activity, HeartPulse, LockKeyhole } from 'lucide-react';
import { Metric, MetricStrip } from '../../components/data/Metric';

const points = [
  { icon: Activity, text: 'Sleep, heart rate, HRV, stress and activities in one private place.' },
  { icon: HeartPulse, text: 'Every number compared with your own usual range.' },
  { icon: LockKeyhole, text: 'Runs on this computer. Your data never leaves it.' },
];

export function WelcomePreview() {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:gap-16">
      <div>
        <h1 className="type-title text-text">See your Garmin data clearly.</h1>
        <div className="mt-8 space-y-5">
          {points.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-3 type-body text-text-2">
              <Icon
                size={16}
                strokeWidth={1.5}
                className="mt-0.5 shrink-0 text-text"
                aria-hidden="true"
              />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
      <div
        className="min-w-0 rounded-card border border-border bg-surface p-5 shadow-sm lg:scale-[0.9] lg:p-7"
        aria-label="Preview of Overview with sample readings"
      >
        <p className="type-caption text-text-2">A look at your Overview</p>
        <h2 className="mt-2 type-heading text-text">Last night</h2>
        <div inert className="mt-5">
          <MetricStrip>
            <Metric id="sleep_duration" label="Sleep" value="7 h 15 min" />
            <Metric id="resting_hr" label="Resting HR" value={56} unit="bpm" />
            <Metric id="hrv" label="HRV" value={54} unit="ms" />
            <Metric id="body_battery" label="Body Battery" value={72} />
          </MetricStrip>
        </div>
        <p className="mt-4 type-caption text-text-2">Sample numbers for illustration</p>
      </div>
    </div>
  );
}
