export type Units = 'metric' | 'imperial';
const missing = '—';
const space = '\u202f';
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthsLong = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function valid(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function day(value: string): Date {
  const [year, month, date] = value.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date));
}

export function formatDurationSummary(seconds: number | null | undefined): string {
  if (!valid(seconds)) return missing;
  const minutes = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours
    ? `${hours}${space}h ${String(remainder).padStart(2, '0')}${space}min`
    : `${minutes}${space}min`;
}

export function formatDurationClock(seconds: number | null | undefined): string {
  if (!valid(seconds)) return missing;
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${minutes}:${String(secs).padStart(2, '0')}`;
}

export const formatDuration = formatDurationSummary;

export function formatDistance(
  metres: number | null | undefined,
  units: Units = 'metric',
  table = false,
): string {
  if (!valid(metres)) return missing;
  const value = metres / (units === 'metric' ? 1000 : 1609.344);
  const digits = table && Math.abs(value) < 1 ? 2 : 1;
  return `${value.toFixed(digits)}${space}${units === 'metric' ? 'km' : 'mi'}`;
}

export function formatPace(speed: number | null | undefined, units: Units = 'metric'): string {
  if (!valid(speed) || speed <= 0) return missing;
  const seconds = Math.round((units === 'metric' ? 1000 : 1609.344) / speed);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} /${units === 'metric' ? 'km' : 'mi'}`;
}

export function formatSpeed(speed: number | null | undefined, units: Units = 'metric'): string {
  if (!valid(speed)) return missing;
  return `${(speed * (units === 'metric' ? 3.6 : 2.2369362921)).toFixed(1)}${space}${units === 'metric' ? 'km/h' : 'mph'}`;
}

export function formatElevation(
  metres: number | null | undefined,
  units: Units = 'metric',
): string {
  if (!valid(metres)) return missing;
  return `${Math.round(metres * (units === 'metric' ? 1 : 3.28084))}${space}${units === 'metric' ? 'm' : 'ft'}`;
}

export function formatNumber(value: number | null | undefined, digits = 0): string {
  return valid(value)
    ? value.toLocaleString('en-US', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
    : missing;
}

export function formatCount(value: number | null | undefined, unit = ''): string {
  if (!valid(value)) return missing;
  const number = Math.round(value).toLocaleString('en-US');
  return unit ? `${number}${space}${unit}` : number;
}

export function formatHeartRate(value: number | null | undefined): string {
  return valid(value) ? `${Math.round(value)}${space}bpm` : missing;
}

export function formatHrv(value: number | null | undefined): string {
  return valid(value) ? `${Math.round(value)}${space}ms` : missing;
}

export function formatPercent(value: number | null | undefined): string {
  return valid(value) ? `${Math.round(value)}%` : missing;
}

export function plural(value: number, singular: string, pluralForm = `${singular}s`): string {
  return value === 1 ? singular : pluralForm;
}

export function formatDateList(value: string, today: string, time?: string): string {
  const current = day(value);
  const reference = day(today);
  const age = Math.round((reference.getTime() - current.getTime()) / 86400000);
  let label: string;
  if (age === 0) label = 'Today';
  else if (age > 0 && age <= 6) label = weekdays[current.getUTCDay()].slice(0, 3);
  else {
    label = `${current.getUTCDate()} ${months[current.getUTCMonth()]}`;
    if (current.getUTCFullYear() !== reference.getUTCFullYear())
      label += ` ${current.getUTCFullYear()}`;
  }
  return time ? `${label}, ${time}` : label;
}

export function formatDateTitle(value: string): string {
  const date = day(value);
  return `${weekdays[date.getUTCDay()]}, ${date.getUTCDate()} ${monthsLong[date.getUTCMonth()]}`;
}

export function formatWeek(value: string): string {
  const date = day(value);
  return `Week of ${date.getUTCDate()} ${months[date.getUTCMonth()]}`;
}

export function formatClockTime(value: string, hour12 = false): string {
  const [hour, minute] = value.slice(0, 5).split(':').map(Number);
  if (hour12)
    return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'am' : 'pm'}`;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
