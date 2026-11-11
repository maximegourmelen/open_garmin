import type { MetricId } from '../../content/glossary';

const whole = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

function minutes(value: number) {
  const rounded = Math.round(value);
  const hours = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return hours ? `${hours} h ${remainder} min` : `${remainder} min`;
}

function suffix(id: MetricId, unit: string) {
  if (id === 'effort') return ' pts';
  if (id === 'load') return '×';
  if (['sleep_score', 'body_battery', 'stress', 'training_effect', 'usual_range'].includes(id))
    return '';
  return unit ? ` ${unit}` : '';
}

export function formatMetricValue(id: MetricId, value: number, unit: string) {
  if (id === 'sleep_duration' || id === 'sleep_need') return minutes(value);
  const formatted = [
    'load',
    'efficiency',
    'vo2max',
    'training_effect',
    'activity_distance',
  ].includes(id)
    ? decimal.format(value)
    : whole.format(value);
  return `${formatted}${suffix(id, unit)}`;
}

export function formatMetricRange(id: MetricId, low: number, high: number, unit: string) {
  if (id === 'sleep_duration' || id === 'sleep_need') return `${minutes(low)}–${minutes(high)}`;
  const formatter = [
    'load',
    'efficiency',
    'vo2max',
    'training_effect',
    'activity_distance',
  ].includes(id)
    ? decimal
    : whole;
  return `${formatter.format(low)}–${formatter.format(high)}${suffix(id, unit)}`;
}
