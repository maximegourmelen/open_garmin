import type { HealthSeries } from '../../lib/types';

export type HealthDay = Record<string, unknown> & { date: string };
export type HealthData = HealthSeries<HealthDay>;

export const number = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;
export const string = (value: unknown): string | null => (typeof value === 'string' ? value : null);
export const latest = (days: HealthDay[], key: string) =>
  [...days].reverse().find((day) => number(day[key]) !== null) ?? null;
export const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
export const points = (days: HealthDay[], key: string) =>
  days.map((day) => ({ date: dateLabel(day.date), value: number(day[key]) }));
export const whole = (value: unknown) => number(value)?.toLocaleString() ?? '—';
export const hours = (value: unknown) =>
  number(value) === null ? '—' : `${(number(value)! / 60).toFixed(1)} h`;
