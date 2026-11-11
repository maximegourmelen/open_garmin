import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../app/workspace-context';
import { workspaceRequest } from '../../lib/api';
import type { ActivityList } from '../../lib/types';

const destinations: Record<string, string> = {
  o: '/',
  a: '/activities',
  h: '/health/sleep',
  t: '/trends',
  s: '/settings',
};

function isEditable(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
  );
}

async function adjacentActivity(mode: 'demo' | 'live', id: string, direction: -1 | 1) {
  const activities: ActivityList['items'] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 50; page += 1) {
    const response: ActivityList = await workspaceRequest<ActivityList>(
      mode,
      `/activities?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
    );
    activities.push(...response.items);
    const current = activities.findIndex((item) => item.id === id);
    const adjacent = current + direction;
    if (current >= 0 && adjacent >= 0 && adjacent < activities.length)
      return activities[adjacent].id;
    cursor = response.next_cursor;
    if (!cursor) break;
  }
  return null;
}

export function useGlobalShortcuts({
  openSearch,
  openHelp,
  disabled,
}: {
  openSearch: () => void;
  openHelp: () => void;
  disabled: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode } = useWorkspace();
  const armedAt = useRef(0);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === 'k') {
        event.preventDefault();
        armedAt.current = 0;
        openSearch();
        return;
      }
      if (disabled || isEditable(event.target) || event.altKey || event.metaKey || event.ctrlKey) {
        armedAt.current = 0;
        return;
      }
      if (key === '?') {
        event.preventDefault();
        openHelp();
        return;
      }
      if (key === 'g') {
        armedAt.current = Date.now();
        return;
      }
      if (armedAt.current && Date.now() - armedAt.current < 1200 && key in destinations) {
        event.preventDefault();
        navigate(destinations[key]);
        armedAt.current = 0;
        return;
      }
      armedAt.current = 0;
      const match = /^\/activities\/([^/]+)$/.exec(location.pathname);
      if (match && (key === '[' || key === ']')) {
        event.preventDefault();
        const direction = key === '[' ? -1 : 1;
        void adjacentActivity(mode, decodeURIComponent(match[1]), direction)
          .then((id) => {
            if (id) navigate(`/activities/${encodeURIComponent(id)}`);
          })
          .catch(() => {});
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [disabled, location.pathname, mode, navigate, openHelp, openSearch]);
}
