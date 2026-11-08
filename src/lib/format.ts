export type Units = 'metric' | 'imperial';
const missing = '—';

export function formatDistance(
  metres: number | null | undefined,
  units: Units = 'metric',
  digits = 1,
) {
  if (metres == null || !Number.isFinite(metres)) return missing;
  const value = metres / (units === 'metric' ? 1000 : 1609.344);
  return `${value.toFixed(digits)} ${units === 'metric' ? 'km' : 'mi'}`;
}

export function formatDuration(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds)) return missing;
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours
    ? `${hours}h ${String(minutes).padStart(2, '0')}m`
    : `${minutes}m ${String(secs).padStart(2, '0')}s`;
}

export function formatPace(speed: number | null | undefined, units: Units = 'metric') {
  if (speed == null || speed <= 0 || !Number.isFinite(speed)) return missing;
  const seconds = Math.round((units === 'metric' ? 1000 : 1609.344) / speed);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} /${units === 'metric' ? 'km' : 'mi'}`;
}

export function formatSpeed(speed: number | null | undefined, units: Units = 'metric') {
  if (speed == null || !Number.isFinite(speed)) return missing;
  return `${(speed * (units === 'metric' ? 3.6 : 2.236936)).toFixed(1)} ${units === 'metric' ? 'km/h' : 'mph'}`;
}

export function formatElevation(metres: number | null | undefined, units: Units = 'metric') {
  if (metres == null || !Number.isFinite(metres)) return missing;
  return `${Math.round(metres * (units === 'metric' ? 1 : 3.28084))} ${units === 'metric' ? 'm' : 'ft'}`;
}

export function formatNumber(value: number | null | undefined, digits = 0) {
  return value == null || !Number.isFinite(value)
    ? missing
    : value.toLocaleString(undefined, {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      });
}
