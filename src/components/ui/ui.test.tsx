import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import {
  Avatar,
  Button,
  Card,
  Dialog,
  Disclosure,
  ProgressBar,
  SegmentedControl,
  SourceBadge,
  ToastProvider,
  useToast,
} from './index';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

test('card exposes a linked title', () => {
  render(
    <BrowserRouter>
      <Card title="Your week" href="/journey">
        Progress
      </Card>
    </BrowserRouter>,
  );
  expect(screen.getByRole('region', { name: 'Your week' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Your week' }).getAttribute('href')).toBe('/journey');
  render(<SourceBadge source="demo" />);
  expect(screen.getByText('Synthetic')).toBeTruthy();
});

test('button and segmented control retain accessible states', () => {
  const change = vi.fn();
  render(
    <>
      <Button disabled>Save</Button>
      <SegmentedControl
        value="4W"
        onChange={change}
        label="Range"
        options={[
          { value: '7D', label: '7D' },
          { value: '4W', label: '4W' },
        ]}
      />
    </>,
  );
  expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('radio', { name: '7D' }));
  expect(change).toHaveBeenCalledWith('7D');
});

test('disclosure mounts content when opened and remembers it', () => {
  render(<Disclosure id="test">Details</Disclosure>);
  expect(screen.queryByText('Details')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Show advanced metrics' }));
  expect(screen.getByText('Details')).toBeTruthy();
  expect(localStorage.getItem('og_disclosure_test')).toBe('open');
});

test('dialog is named and closes with its button', () => {
  const change = vi.fn();
  render(
    <Dialog open onOpenChange={change} title="Edit your goal" description="Choose a weekly target">
      Goal controls
    </Dialog>,
  );
  expect(screen.getByRole('dialog', { name: 'Edit your goal' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
  expect(change).toHaveBeenCalledWith(false);
});

test('progress bar and avatar have accessible values', () => {
  render(
    <>
      <ProgressBar value={75} max={100} label="Weekly goal" />
      <Avatar name="Alex Runner" />
    </>,
  );
  expect(
    screen.getByRole('progressbar', { name: 'Weekly goal' }).getAttribute('aria-valuenow'),
  ).toBe('75');
  expect(screen.getByLabelText('Alex Runner').textContent).toBe('AR');
});

function ToastButton() {
  const show = useToast();
  return <button onClick={() => show({ message: 'Saved your goal' })}>Show toast</button>;
}

test('toast announces a short message', () => {
  render(
    <ToastProvider>
      <ToastButton />
    </ToastProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Show toast' }));
  expect(screen.getByText('Saved your goal')).toBeTruthy();
});
