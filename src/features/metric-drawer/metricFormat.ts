import type { MetricId } from '../../content/glossary';
import { bedtimeTick } from '../../components/charts/axis';

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
  if (id === 'sleep_bedtime' || id === 'sleep_wake') return bedtimeTick(value);
  if (id === 'activity_avg_pace' || id === 'activity_swim_pace') {
    const seconds = Math.round(value);
    const denominator =
      id === 'activity_swim_pace'
        ? unit === 's/100yd'
          ? '100yd'
          : '100m'
        : unit === 's/mi'
          ? 'mi'
          : 'km';
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} /${denominator}`;
  }
  const formatted = [
    'load',
    'efficiency',
    'vo2max',
    'training_effect',
    'activity_distance',
    'activity_avg_speed',
  ].includes(id)
    ? decimal.format(value)
    : whole.format(value);
  return `${formatted}${suffix(id, unit)}`;
}

export function formatMetricRange(id: MetricId, low: number, high: number, unit: string) {
  if (id === 'sleep_duration' || id === 'sleep_need') return `${minutes(low)}–${minutes(high)}`;
  if (id === 'sleep_bedtime' || id === 'sleep_wake')
    return `${bedtimeTick(low)}–${bedtimeTick(high)}`;
  if (id === 'activity_avg_pace' || id === 'activity_swim_pace')
    return `${formatMetricValue(id, low, unit)}–${formatMetricValue(id, high, unit)}`;
  const formatter = [
    'load',
    'efficiency',
    'vo2max',
    'training_effect',
    'activity_distance',
    'activity_avg_speed',
  ].includes(id)
    ? decimal
    : whole;
  return `${formatter.format(low)}–${formatter.format(high)}${suffix(id, unit)}`;
}
