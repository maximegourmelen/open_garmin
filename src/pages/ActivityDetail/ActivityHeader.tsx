import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../../app/workspace-context';
import { Tag } from '../../components/ui/Structure';
import { PageHeader } from '../../layout/PageHeader';
import { apiPath } from '../../lib/api';
import { downloadText } from '../../lib/download';
import type { ActivityDetail } from '../../lib/types';

export function ActivityHeader({
  activity,
  previous,
  next,
}: {
  activity: ActivityDetail;
  previous?: string | null;
  next?: string | null;
}) {
  const { mode } = useWorkspace();
  const when = new Date(activity.start).toLocaleString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const meta = [when, activity.device, activity.location_name].filter(Boolean).join(' · ');
  return (
    <div className="space-y-3">
      <PageHeader
        title={activity.name}
        description={meta}
        pageId="activity"
        back={{ href: '/activities', label: 'Activities' }}
        action={
          <div className="flex items-center gap-2">
            {previous && (
              <Link
                to={`/activities/${encodeURIComponent(previous)}`}
                aria-label="Previous activity"
                className="rounded-control border border-border-strong p-2"
              >
                <ChevronLeft size={18} />
              </Link>
            )}
            {next && (
              <Link
                to={`/activities/${encodeURIComponent(next)}`}
                aria-label="Next activity"
                className="rounded-control border border-border-strong p-2"
              >
                <ChevronRight size={18} />
              </Link>
            )}
            <details className="relative">
              <summary className="flex min-h-10 cursor-pointer items-center gap-2 rounded-control border border-border-strong bg-surface px-3 type-body">
                <Download size={16} /> Export
              </summary>
              <div className="absolute right-0 z-20 mt-1 min-w-40 rounded-control border border-border bg-surface p-1 shadow-xl">
                <button
                  type="button"
                  onClick={() =>
                    downloadText(
                      `activity-${activity.id}.json`,
                      JSON.stringify(activity, null, 2),
                      'application/json',
                    )
                  }
                  className="block w-full px-3 py-2 text-left type-body hover:bg-surface-2"
                >
                  JSON
                </button>
                {activity.has_route && (
                  <a
                    href={apiPath(mode, `/activities/${encodeURIComponent(activity.id)}/gpx`)}
                    download
                    className="block px-3 py-2 type-body hover:bg-surface-2"
                  >
                    GPX route
                  </a>
                )}
                {mode === 'live' && (
                  <a
                    href={apiPath(mode, `/activities/${encodeURIComponent(activity.id)}/original`)}
                    download
                    className="block px-3 py-2 type-body hover:bg-surface-2"
                  >
                    Original file
                  </a>
                )}
              </div>
            </details>
          </div>
        }
      />
      {activity.is_best && <Tag>Record</Tag>}
      <p className="max-w-[72ch] type-body text-text-2">{activity.summary.text}</p>
    </div>
  );
}
