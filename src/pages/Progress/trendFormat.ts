import type { MetricId } from '../../content/glossary';
import { formatDistance, formatDurationSummary } from '../../lib/format';
import type { FitnessSignal } from '../../lib/types';

export const shortDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
export const weekTitle = (date: string) => `Week of ${shortDate(date)}`;
export const numberText = (value: number | null) =>
  value === null ? '—' : new Intl.NumberFormat().format(Math.round(value));
export const timeText = (minutes: number | null) =>
  minutes === null ? '—' : formatDurationSummary(minutes * 60);

export const signalNames: Record<string, { label: string; metric: MetricId }> = {
  resting_hr: { label: 'Resting heart rate', metric: 'resting_hr' },
  efficiency: { label: 'Efficiency', metric: 'efficiency' },
  longest: { label: 'Longest activity', metric: 'record' },
  vo2max: { label: 'VO2 max', metric: 'vo2max' },
};
export function signalValue(signal: FitnessSignal, value: number | null) {
  if (value === null) return '—';
  if (signal.id === 'longest') return timeText(value / 60);
  if (signal.id === 'efficiency') return `${value.toFixed(2)} m/beat`;
  if (signal.id === 'vo2max') return value.toFixed(1);
  return `${Math.round(value)} bpm`;
}
export function signalDelta(signal: FitnessSignal) {
  if (signal.before === null || signal.after === null) return '—';
  const difference = signal.after - signal.before;
  const arrow = difference > 0 ? '▲' : difference < 0 ? '▼' : '—';
  if (signal.id === 'longest') return `${arrow} ${timeText(Math.abs(difference) / 60)}`;
  if (signal.id === 'efficiency' && signal.before)
    return `${arrow} ${Math.abs((difference / signal.before) * 100).toFixed(1)}%`;
  return `${arrow} ${Math.abs(difference).toFixed(signal.id === 'vo2max' ? 1 : 0)} ${signal.unit}`;
}
export const statusText: Record<string, string> = {
  improving: 'Improving',
  steady: 'Steady',
  declining: 'Declining',
  insufficient: 'Not enough data',
};
export const recordNames: Record<string, string> = {
  'distance:1000': 'Fastest 1 km',
  'distance:1609': 'Fastest 1 mi',
  'distance:5000': 'Fastest 5 km',
  'distance:10000': 'Fastest 10 km',
  'longest:distance:running': 'Longest run',
  'longest:distance:walking': 'Longest walk',
  'longest:distance:cycling': 'Longest ride',
  'longest:duration': 'Longest activity',
  most_active_week: 'Most active week',
};
export function recordValue(kind: string, value: number, units: 'metric' | 'imperial') {
  if (kind.startsWith('distance:') || kind === 'longest:duration')
    return formatDurationSummary(value);
  if (kind.startsWith('longest:distance')) return formatDistance(value, units);
  return timeText(value);
}
