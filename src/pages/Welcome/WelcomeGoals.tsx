import { Select } from '../../components/ui/Controls';

const inputClass =
  'mt-1 h-10 w-full rounded-control border border-border-strong bg-surface px-3 text-text';

export function WelcomeGoals({
  minutes,
  sessions,
  units,
  weekStart,
  suggestionReason,
  onMinutes,
  onSessions,
  onUnits,
  onWeekStart,
}: {
  minutes: number;
  sessions: number;
  units: 'metric' | 'imperial';
  weekStart: 'monday' | 'sunday';
  suggestionReason: string;
  onMinutes: (value: number) => void;
  onSessions: (value: number) => void;
  onUnits: (value: 'metric' | 'imperial') => void;
  onWeekStart: (value: 'monday' | 'sunday') => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="type-title text-text">Set a comfortable weekly goal.</h1>
        <p className="mt-2 type-body text-text-2">You can change this any time in Settings.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="type-body text-text">
          <label htmlFor="welcome-minutes">Active minutes per week</label>
          <input
            id="welcome-minutes"
            aria-describedby="welcome-minutes-reason"
            type="number"
            min={0}
            max={10080}
            step={5}
            value={minutes}
            onChange={(event) => onMinutes(Number(event.target.value))}
            className={inputClass}
          />
          <p id="welcome-minutes-reason" className="mt-1 type-caption text-text-2">
            {suggestionReason}
          </p>
        </div>
        <div className="type-body text-text">
          <label htmlFor="welcome-sessions">Activities per week</label>
          <input
            id="welcome-sessions"
            type="number"
            min={0}
            max={14}
            step={1}
            value={sessions}
            onChange={(event) => onSessions(Number(event.target.value))}
            className={inputClass}
          />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="type-body text-text">Units</p>
          <Select
            label="Units"
            value={units}
            onChange={(value) => onUnits(value as 'metric' | 'imperial')}
            options={[
              { value: 'metric', label: 'Metric' },
              { value: 'imperial', label: 'Imperial' },
            ]}
          />
        </div>
        <div className="space-y-2">
          <p className="type-body text-text">Week starts</p>
          <Select
            label="Week starts"
            value={weekStart}
            onChange={(value) => onWeekStart(value as 'monday' | 'sunday')}
            options={[
              { value: 'monday', label: 'Monday' },
              { value: 'sunday', label: 'Sunday' },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
