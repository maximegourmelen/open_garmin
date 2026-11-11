import { Link } from 'react-router-dom';
import { Section } from '../../components/ui/Structure';
import {
  formatDateList,
  formatDistance,
  formatDurationClock,
  formatHeartRate,
  formatPace,
  formatSpeed,
} from '../../lib/format';
import type { Units } from '../../lib/format';
import type { OverviewResponse } from '../../lib/types';

export function OverviewRecent({
  activities,
  date,
  units,
}: {
  activities: OverviewResponse['recent_activities'];
  date: string;
  units: Units;
}) {
  return (
    <Section
      heading="Recent activities"
      action={
        <Link to="/activities" className="type-body text-accent underline">
          View all
        </Link>
      }
      className="order-4 md:col-span-12"
    >
      {activities.length ? (
        <>
          <ul className="border-t border-border sm:hidden">
            {activities.map((activity) => (
              <li key={activity.id} className="border-b border-border py-4">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    to={`/activities/${activity.id}`}
                    className="font-medium text-text hover:text-accent"
                  >
                    {activity.name}
                  </Link>
                  <span className="shrink-0 type-body text-text-2">
                    {formatDateList(activity.date, date, activity.start?.slice(11, 16))}
                  </span>
                </div>
                <p className="mt-1 type-caption tabular-nums text-text-2">
                  {formatDistance(activity.distance, units, true)} ·{' '}
                  {formatDurationClock(activity.duration)}
                </p>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto border-t border-border sm:block">
            <table className="w-full min-w-[630px] border-collapse text-left type-body">
              <caption className="sr-only">Three most recent activities</caption>
              <thead>
                <tr className="border-b border-border text-text-3">
                  <th className="py-3 font-normal" scope="col">
                    Activity
                  </th>
                  <th className="py-3 font-normal" scope="col">
                    Date
                  </th>
                  <th className="py-3 text-right font-normal" scope="col">
                    Distance
                  </th>
                  <th className="py-3 text-right font-normal" scope="col">
                    Time
                  </th>
                  <th className="py-3 text-right font-normal" scope="col">
                    Pace / speed
                  </th>
                  <th className="py-3 text-right font-normal" scope="col">
                    Avg HR
                  </th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity) => (
                  <tr key={activity.id} className="border-b border-border">
                    <td className="py-4 pr-4">
                      <Link
                        to={`/activities/${activity.id}`}
                        className="font-medium text-text hover:text-accent"
                      >
                        {activity.name}
                      </Link>
                    </td>
                    <td className="py-4 text-text-2">
                      {formatDateList(activity.date, date, activity.start?.slice(11, 16))}
                    </td>
                    <td className="py-4 text-right tabular-nums text-text-2">
                      {formatDistance(activity.distance, units, true)}
                    </td>
                    <td className="py-4 text-right tabular-nums text-text-2">
                      {formatDurationClock(activity.duration)}
                    </td>
                    <td className="py-4 text-right tabular-nums text-text-2">
                      {['running', 'walking', 'hiking'].includes(activity.sport)
                        ? formatPace(activity.average_speed, units)
                        : formatSpeed(activity.average_speed, units)}
                    </td>
                    <td className="py-4 text-right tabular-nums text-text-2">
                      {formatHeartRate(activity.average_hr)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="border-t border-border py-5 type-body text-text-2">
          Activities will appear here after your first sync. You can explore the sample workspace in
          the meantime.
        </p>
      )}
    </Section>
  );
}

export function OverviewNotes({ notes }: { notes: OverviewResponse['notes'] }) {
  if (!notes.length) return null;
  return (
    <Section heading="Worth knowing" className="order-5 md:col-span-12">
      <ul className="border-t border-border">
        {notes.map((note) => (
          <li key={note.id} className="border-b border-border py-4">
            <Link to={note.href} className="type-body text-text hover:text-accent">
              {note.text} <span aria-hidden="true">→</span>
            </Link>
            <details className="mt-1 type-caption text-text-3">
              <summary className="cursor-pointer">Source</summary>
              <p className="mt-1">{note.source}</p>
            </details>
          </li>
        ))}
      </ul>
    </Section>
  );
}
