export { addDays, formatPace, insightsFor, weekStart, weekStats, zoneTotals } from './analytics';
import { makeDemo } from './demo';
export function normalizeForTest(id: string, date: string, distance: number) {
  return {
    ...makeDemo().activities[0],
    id,
    date,
    start: date + 'T10:00:00',
    distance,
    sport: 'running' as const,
    parent_id: null,
  };
}
