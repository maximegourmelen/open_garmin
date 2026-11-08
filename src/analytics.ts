import type { Activity, Daily, DashboardData, Insight, Prefs } from './types';

export const sportLabels: Record<string, string> = {
  running: 'Running',
  cycling: 'Cycling',
  strength: 'Strength',
  swimming: 'Swimming',
  walking: 'Walking',
  hiking: 'Hiking',
  other: 'Other',
};
export const dayDate = (d: string) => new Date(`${d.slice(0, 10)}T12:00:00`);
export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function todayKey(timezone = 'America/Toronto') {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
export function addDays(d: string, n: number) {
  const day = dayDate(d);
  day.setDate(day.getDate() + n);
  return dateKey(day);
}
export function weekStart(d: string, start: Prefs['week_start'] = 'monday') {
  const day = dayDate(d);
  return addDays(d, -((day.getDay() + (start === 'monday' ? 6 : 0)) % 7));
}
export function displayDate(
  d: string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' },
) {
  return dayDate(d).toLocaleDateString('en-US', options);
}
export const sum = (values: (number | null | undefined)[]) =>
  values.reduce<number>((n, v) => n + (v ?? 0), 0);
export function mean(values: (number | null | undefined)[]) {
  const valid = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  return valid.length ? sum(valid) / valid.length : null;
}
export function median(values: (number | null | undefined)[]) {
  const xs = values
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    .sort((a, b) => a - b);
  return xs.length
    ? (xs[Math.floor((xs.length - 1) / 2)] + xs[Math.ceil((xs.length - 1) / 2)]) / 2
    : null;
}
export function formatDistance(m: number | null | undefined, imperial = false, precision = 1) {
  return m == null ? '—' : (m / (imperial ? 1609.344 : 1000)).toFixed(precision);
}
export function formatDuration(s: number | null | undefined, compact = false) {
  if (s == null) return '—';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h
    ? `${h}h ${m}m`
    : compact
      ? `${m}m`
      : `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}
export function formatPace(speed: number | null | undefined, imperial = false) {
  if (!speed || speed <= 0) return '—';
  const s = Math.round((imperial ? 1609.344 : 1000) / speed);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
export function activityMetric(a: Activity, imperial = false) {
  return a.sport === 'strength'
    ? formatDuration(a.duration, true)
    : `${formatDistance(a.distance, imperial)} ${imperial ? 'mi' : 'km'}`;
}
export function topLevel(activities: Activity[]) {
  return activities.filter((a) => !a.parent_id);
}
export function weeklySeries(data: DashboardData, weeks = 12, sport = 'all', anchor?: string) {
  const end = anchor ?? todayKey(data.preferences.timezone);
  const last = weekStart(end, data.preferences.week_start);
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(last, (i - weeks + 1) * 7);
    const until = addDays(start, 6);
    const rows = topLevel(data.activities).filter(
      (a) => a.date >= start && a.date <= until && (sport === 'all' || a.sport === sport),
    );
    return {
      date: start,
      label: displayDate(start),
      minutes: Math.round(sum(rows.map((a) => a.duration)) / 60),
      distance: sum(rows.map((a) => a.distance)) / 1000,
      running: sum(rows.filter((a) => a.sport === 'running').map((a) => a.duration)) / 60,
      cycling: sum(rows.filter((a) => a.sport === 'cycling').map((a) => a.duration)) / 60,
      strength: sum(rows.filter((a) => a.sport === 'strength').map((a) => a.duration)) / 60,
      other:
        sum(
          rows
            .filter((a) => !['running', 'cycling', 'strength'].includes(a.sport))
            .map((a) => a.duration),
        ) / 60,
      sessions: rows.length,
      load: rows.some((a) => a.training_load != null)
        ? sum(rows.map((a) => a.training_load))
        : null,
      complete: until < end,
      imported: rows.length > 0,
    };
  });
}
export function weekStats(data: DashboardData, anchor?: string, cutoffTime?: string) {
  const now = anchor ?? todayKey(data.preferences.timezone);
  const first = weekStart(now, data.preferences.week_start);
  const time =
    cutoffTime ??
    (anchor
      ? '23:59:59'
      : new Intl.DateTimeFormat('en-GB', {
          timeZone: data.preferences.timezone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hourCycle: 'h23',
        }).format(new Date()));
  const previousCutoff = Date.parse(`${addDays(now, -7)}T${time}Z`);
  const activities = topLevel(data.activities).filter((a) => a.date >= first && a.date <= now);
  const running = activities.filter((a) => a.sport === 'running');
  const previous = topLevel(data.activities).filter(
    (a) =>
      a.date >= addDays(first, -7) &&
      a.date <= addDays(now, -7) &&
      Date.parse(`${a.start.slice(0, 19)}Z`) + (a.elapsed ?? a.duration ?? 0) * 1000 <=
        previousCutoff,
  );
  const priorRunning = previous.filter((a) => a.sport === 'running');
  const distance = sum(running.map((a) => a.distance));
  const previousDistance = sum(priorRunning.map((a) => a.distance));
  return {
    first,
    now,
    cutoffTime: time,
    activities,
    running,
    priorRunning,
    distance,
    previousDistance,
    minutes: sum(activities.map((a) => a.duration)) / 60,
    delta: previousDistance > 0 ? (distance / previousDistance - 1) * 100 : null,
    duration: sum(activities.map((a) => a.duration)),
    elevation: sum(activities.map((a) => a.elevation)),
  };
}
export function zoneTotals(activities: Activity[]) {
  const rows = topLevel(activities).filter((a) => a.zones?.some((z) => z != null));
  const values = Array.from({ length: 5 }, (_, i) => sum(rows.map((a) => a.zones[i])) / 60);
  const minutes = sum(values);
  const total = sum(topLevel(activities).map((a) => a.duration)) / 60;
  return {
    values,
    minutes,
    coverage: total > 0 ? Math.min(100, (minutes / total) * 100) : 0,
    sessions: rows.length,
  };
}
export function recentDaily(data: DashboardData, days: number): Daily[] {
  const now = todayKey(data.preferences.timezone);
  const byDate = new Map(data.daily.map((d) => [d.date, d]));
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(now, i - days + 1);
    return byDate.get(date) ?? { date, source: 'missing' };
  });
}
export function latestWith(daily: Daily[], key: keyof Daily) {
  return [...daily].reverse().find((d) => typeof d[key] === 'number' && Number.isFinite(d[key]));
}
export function insightsFor(data: DashboardData): Insight[] {
  const stats = weekStats(data);
  const recent = recentDaily(data, 29);
  const insights: Insight[] = [];
  if (stats.running.length && stats.previousDistance > 0)
    insights.push({
      id: 'weekly-volume',
      category: 'Training',
      tone: 'neutral',
      title: stats.delta! >= 0 ? 'A bigger running week' : 'A lighter running week',
      body: `You have run ${formatDistance(stats.distance, data.preferences.units === 'imperial')} ${data.preferences.units === 'imperial' ? 'mi' : 'km'} this week, ${Math.abs(stats.delta!).toFixed(0)}% ${stats.delta! >= 0 ? 'more' : 'less'} than at the same point last week.`,
      evidence: `Compared ${stats.first}–${stats.now} with ${addDays(stats.first, -7)}–${addDays(stats.now, -7)}. Prior-week sessions completed by ${stats.cutoffTime} local, as recorded. Running only; imported history and today may be incomplete.`,
      dates: [stats.first, stats.now],
      activityIds: [...stats.running, ...stats.priorRunning].map((a) => a.id),
      method: 'Same-weekday distance comparison · v1',
    });
  const zones = zoneTotals(stats.activities);
  if (zones.minutes > 10) {
    const low = Math.round(((zones.values[0] + zones.values[1]) / zones.minutes) * 100);
    insights.push({
      id: 'zone-distribution',
      category: 'Training',
      tone: 'positive',
      title: `${low}% of measured time in zones 1–2`,
      body: 'See how intensity is distributed across this week’s sessions, with every zone and its recorded time visible.',
      evidence: `${zones.minutes.toFixed(0)} measured minutes from ${zones.sessions} sessions. Zone-time coverage: ${zones.coverage.toFixed(0)}% of recorded training duration. Uses Garmin-reported zones; missing time is not assumed easy.`,
      dates: [stats.first, stats.now],
      activityIds: stats.activities.filter((a) => a.zones.some((z) => z != null)).map((a) => a.id),
      method: 'Reported HR-zone minutes · v1',
    });
  }
  const sleep = recent.filter((d) => d.sleep_seconds != null);
  const last = sleep.at(-1);
  const previousSleep = last ? sleep.filter((d) => d.date < last.date) : [];
  if (last && previousSleep.length >= 14) {
    const baseline = median(previousSleep.map((d) => d.sleep_seconds))!;
    const diff = (last.sleep_seconds! - baseline) / 60;
    insights.push({
      id: 'sleep-context',
      category: 'Recovery',
      tone: diff < -40 ? 'attention' : 'neutral',
      title:
        Math.abs(diff) < 15
          ? 'Sleep close to your recent usual'
          : `${Math.round(Math.abs(diff))} minutes ${diff < 0 ? 'less' : 'more'} sleep than usual`,
      body: `Your latest recorded night was ${formatDuration(last.sleep_seconds)}. Your preceding ${previousSleep.length} valid nights had a median of ${formatDuration(baseline)}.`,
      evidence: `Latest night: ${last.date}. Baseline excludes that night. Missing nights are excluded; this is a historical comparison, not a readiness score.`,
      dates: previousSleep.map((d) => d.date).concat(last.date),
      activityIds: [],
      method: 'Preceding-night median · v1',
    });
  }
  const hrvDays = recent.filter((d) => d.hrv != null);
  const hrvLast = hrvDays.at(-1);
  const hrvPrior = hrvLast ? hrvDays.filter((d) => d.date < hrvLast.date) : [];
  if (hrvLast && hrvPrior.length >= 14) {
    const usual = median(hrvPrior.map((d) => d.hrv))!;
    insights.push({
      id: 'hrv-context',
      category: 'Recovery',
      tone: 'neutral',
      title: 'Your recovery, in context',
      body: `Last recorded overnight HRV: ${Math.round(hrvLast.hrv!)} ms. Your recent median is ${Math.round(usual)} ms. Review it alongside sleep and training.`,
      evidence: `${hrvPrior.length} preceding valid observations. Garmin HRV status: ${hrvLast.hrv_status || 'not provided'}. Different devices or recording conditions can affect comparisons.`,
      dates: hrvPrior.map((d) => d.date).concat(hrvLast.date),
      activityIds: [],
      method: 'Overnight HRV median · v1',
    });
  }
  if (!insights.length)
    insights.push({
      id: 'building-history',
      category: 'Your data',
      tone: 'neutral',
      title: 'Good insights start with your history',
      body: 'As activities and valid nights arrive, this space will explain your training changes with links to the evidence.',
      evidence:
        'No conclusions are generated from missing observations. A sleep or HRV baseline needs at least 14 preceding valid nights.',
      dates: [],
      activityIds: [],
      method: 'Data availability · v1',
    });
  return insights;
}
