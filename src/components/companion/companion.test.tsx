import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { Celebration, CompanionMessage, Pip } from './index';
import type { Pose } from '../../lib/types';

const confetti = vi.hoisted(() => vi.fn());
vi.mock('canvas-confetti', () => ({ default: confetti }));
afterEach(() => {
  cleanup();
  confetti.mockClear();
});

test('every Pip pose has an accessible name', () => {
  const poses: Pose[] = ['wave', 'cheer', 'proud', 'thinking', 'sleepy', 'calm', 'oops', 'stretch'];
  render(
    <>
      {poses.map((pose) => (
        <Pip key={pose} pose={pose} />
      ))}
    </>,
  );
  poses.forEach((pose) => expect(screen.getByRole('img', { name: `Pip ${pose}` })).toBeTruthy());
});

test('messages remain visible when companion art is off', () => {
  render(
    <CompanionMessage
      showPip={false}
      message={{ id: 'test', text: 'A gentle rest day.', pose: 'sleepy', data_refs: [] }}
    />,
  );
  expect(screen.getByText('A gentle rest day.')).toBeTruthy();
  expect(screen.queryByRole('img')).toBeNull();
});

test('celebration respects reduced motion', () => {
  const original = window.matchMedia;
  window.matchMedia = vi.fn().mockReturnValue({ matches: true });
  render(<Celebration open onClose={() => {}} title="New milestone" text="You did it." />);
  expect(screen.getByRole('dialog', { name: 'New milestone' })).toBeTruthy();
  expect(confetti).not.toHaveBeenCalled();
  window.matchMedia = original;
});
