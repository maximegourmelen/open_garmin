import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { Delta, Metric, MetricLabel, MetricStrip, StatusDot } from './Metric';

test('Metric renders missing values with an explicit no-reading caption', () => {
  render(<Metric label="HRV" value={null} unit="ms" />);
  expect(screen.getByText('—')).toBeTruthy();
  expect(screen.getByText('No reading')).toBeTruthy();
});

test('MetricLabel is a button named for the metric', () => {
  const open = vi.fn();
  render(<MetricLabel label="Resting HR" onAbout={open} />);
  fireEvent.click(screen.getByRole('button', { name: 'About Resting HR' }));
  expect(open).toHaveBeenCalledOnce();
});

test('Delta uses the meaning of direction for its color', () => {
  const { rerender } = render(<Delta value={-4} unit="bpm" good="down" />);
  expect(screen.getByLabelText('Down 4 bpm vs usual').className).toContain('text-positive');
  rerender(<Delta value={4} unit="bpm" good="down" />);
  expect(screen.getByLabelText('Up 4 bpm vs usual').className).toContain('text-caution');
});

test('StatusDot adds text and only a small status indicator', () => {
  render(<StatusDot text="Within your usual range" />);
  expect(screen.getByText('Within your usual range')).toBeTruthy();
});

test('MetricStrip groups readable values in one panel', () => {
  render(
    <MetricStrip>
      <Metric label="Sleep" value="7:15" />
      <Metric label="Steps" value={9427} />
    </MetricStrip>,
  );
  expect(screen.getByText('7:15')).toBeTruthy();
  expect(screen.getByText('9427')).toBeTruthy();
  expect(screen.getByRole('group', { name: 'Key metrics' })).toBeTruthy();
});
