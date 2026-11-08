import { expect, test } from 'vitest';
import { formatDistance, formatDuration, formatPace } from './format';

test('pace uses seconds per kilometre or mile', () => {
  expect(formatPace(1000 / 300)).toBe('5:00 /km');
  expect(formatPace(1000 / 300, 'imperial')).toBe('8:03 /mi');
});

test('distance converts to imperial units and missing values stay missing', () => {
  expect(formatDistance(1609.344, 'imperial')).toBe('1.0 mi');
  expect(formatDistance(null)).toBe('—');
  expect(formatDuration(null)).toBe('—');
});
