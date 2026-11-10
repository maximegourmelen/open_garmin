import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { Bars, BulletChart, ClockScatter, RangeBars, TrendLine } from './ChartKit';
import { bedtimeTick, paceTick, sleepHoursTick, yAxisConfig } from './axis';

test('axis formatters use display units and invert pace and clock time', () => {
  expect(sleepHoursTick(420)).toBe('7 h');
  expect(bedtimeTick(656)).toBe('22:56');
  expect(bedtimeTick(780)).toBe('01:00');
  expect(paceTick(388)).toBe('6:28');
  expect(yAxisConfig('pace').reversed).toBe(true);
  expect(yAxisConfig('bedtime').reversed).toBe(true);
  expect(yAxisConfig('sleep').reversed).toBe(false);
});

test('trend charts preserve null gaps and swap to an accessible table', () => {
  render(
    <TrendLine
      label="Sleep"
      kind="sleep"
      data={[
        { date: '2026-11-01', value: 420 },
        { date: '2026-11-02', value: null },
        { date: '2026-11-03', value: 450 },
      ]}
    />,
  );
  expect(screen.getByRole('img', { name: /Sleep\. 3 days, 2 readings/ })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'View as table' }));
  expect(screen.queryByRole('img', { name: /Sleep\. 3 days/ })).toBeNull();
  expect(screen.getByRole('table', { name: /Sleep\. 3 days/ })).toBeTruthy();
  expect(screen.getByText('No data')).toBeTruthy();
});

test('bars, ranges, bullet and clock charts expose summaries', () => {
  render(
    <>
      <Bars
        label="Active minutes"
        data={[
          { date: 'Mon', value: 30 },
          { date: 'Tue', value: null },
        ]}
        goal={150}
      />
      <RangeBars label="Body Battery range" data={[{ date: 'Mon', low: 20, high: 85 }]} />
      <BulletChart label="Load" value={120} goal={150} max={300} range={[80, 180]} />
      <ClockScatter
        label="Bedtime"
        data={[{ date: 'Mon', minutes_from_noon: 656 }]}
        usual={[600, 700]}
      />
    </>,
  );
  expect(screen.getByRole('img', { name: /Active minutes/ })).toBeTruthy();
  expect(screen.getByRole('img', { name: 'Body Battery range. 1 ranges.' })).toBeTruthy();
  expect(screen.getByRole('img', { name: 'Load: 120' })).toBeTruthy();
  expect(screen.getByRole('img', { name: /Bedtime/ })).toBeTruthy();
});
