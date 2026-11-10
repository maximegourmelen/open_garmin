import { expect, test } from 'vitest';
import cases from '../../tests/fixtures/format_cases.json';
import {
  formatClockTime,
  formatCount,
  formatDateList,
  formatDateTitle,
  formatDistance,
  formatDuration,
  formatDurationClock,
  formatDurationSummary,
  formatHeartRate,
  formatHrv,
  formatPace,
  formatPercent,
  formatSpeed,
  formatWeek,
  plural,
  type Units,
} from './format';

test('pace uses seconds per kilometre or mile', () => {
  expect(formatPace(1000 / 300)).toBe('5:00 /km');
  expect(formatPace(1000 / 300, 'imperial')).toBe('8:03 /mi');
});

test('distance converts to imperial units and missing values stay missing', () => {
  expect(formatDistance(1609.344, 'imperial')).toBe('1.0\u202fmi');
  expect(formatDistance(null)).toBe('—');
  expect(formatDuration(null)).toBe('—');
});

type FormatCase = {
  kind: string;
  value: number | string | null;
  expected: string;
  units?: Units;
  table?: boolean;
  unit?: string;
  today?: string;
  time?: string;
  hour12?: boolean;
  singular?: string;
  plural_form?: string;
};

test.each(cases as FormatCase[])('shared format case: $kind $value $units', (item) => {
  const value = item.value as number | string | null;
  const units = (item.units ?? 'metric') as Units;
  let actual: string;
  switch (item.kind) {
    case 'duration_summary':
      actual = formatDurationSummary(value as number | null);
      break;
    case 'duration_clock':
      actual = formatDurationClock(value as number | null);
      break;
    case 'pace':
      actual = formatPace(value as number | null, units);
      break;
    case 'speed':
      actual = formatSpeed(value as number | null, units);
      break;
    case 'distance':
      actual = formatDistance(value as number | null, units, item.table ?? false);
      break;
    case 'heart_rate':
      actual = formatHeartRate(value as number | null);
      break;
    case 'hrv':
      actual = formatHrv(value as number | null);
      break;
    case 'count':
      actual = formatCount(value as number | null, item.unit ?? '');
      break;
    case 'percent':
      actual = formatPercent(value as number | null);
      break;
    case 'date_list':
      actual = formatDateList(value as string, item.today ?? '', item.time);
      break;
    case 'date_title':
      actual = formatDateTitle(value as string);
      break;
    case 'week':
      actual = formatWeek(value as string);
      break;
    case 'clock_time':
      actual = formatClockTime(value as string, item.hour12 ?? false);
      break;
    case 'plural':
      actual = plural(value as number, item.singular ?? '', item.plural_form);
      break;
    default:
      throw new Error(`Unexpected format kind: ${item.kind}`);
  }
  expect(actual).toBe(item.expected);
});
