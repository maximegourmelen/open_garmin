import type { Pose } from '../../lib/types';
import { cn } from '../../lib/cn';
import { useId } from 'react';

export function Pip({
  pose = 'calm',
  size = 72,
  name = 'Pip',
  className,
}: {
  pose?: Pose;
  size?: 40 | 72 | 140;
  name?: string;
  className?: string;
}) {
  const gradientId = useId();
  const closed = pose === 'proud';
  const sleepy = pose === 'sleepy';
  const thinking = pose === 'thinking';
  const cheer = pose === 'cheer';
  const wave = pose === 'wave';
  const stretch = pose === 'stretch';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`${name} ${pose}`}
      className={cn('pip-breathe shrink-0', className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-strong)" />
        </linearGradient>
      </defs>
      {pose === 'cheer' && (
        <g fill="var(--celebrate)">
          <path d="M13 15l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
          <path d="M82 11l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" />
        </g>
      )}
      <path
        d={
          cheer
            ? 'M24 55 Q8 44 13 29'
            : wave
              ? 'M24 60 Q10 50 12 29'
              : stretch
                ? 'M24 61 Q11 58 9 46'
                : 'M25 59 Q13 56 15 68'
        }
        fill="none"
        stroke="var(--accent-strong)"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d={
          cheer
            ? 'M75 55 Q92 43 87 28'
            : thinking
              ? 'M77 60 Q80 67 64 76'
              : stretch
                ? 'M75 60 Q89 50 89 39'
                : 'M75 59 Q88 57 86 68'
        }
        fill="none"
        stroke="var(--accent-strong)"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M50 14 C30 13 20 29 19 51 C17 73 31 88 50 89 C70 89 84 74 81 51 C78 29 69 14 50 14Z"
        fill={`url(#${gradientId})`}
      />
      <ellipse cx="34" cy="85" rx="8" ry="4" fill="var(--accent-strong)" />
      <ellipse cx="66" cy="85" rx="8" ry="4" fill="var(--accent-strong)" />
      {closed ? (
        <g fill="none" stroke="var(--on-accent)" strokeWidth="2.5" strokeLinecap="round">
          <path d="M34 47q4-6 8 0M57 47q4-6 8 0" />
        </g>
      ) : sleepy ? (
        <g fill="none" stroke="var(--on-accent)" strokeWidth="2.5" strokeLinecap="round">
          <path d="M34 49q4 2 8 0M57 49q4 2 8 0" />
        </g>
      ) : (
        <g fill="var(--on-accent)">
          <ellipse cx={thinking ? 39 : 38} cy={thinking ? 44 : 48} rx="3" ry="4.5" />
          <ellipse cx={thinking ? 62 : 61} cy={thinking ? 44 : 48} rx="3" ry="4.5" />
        </g>
      )}
      <path
        d={
          cheer
            ? 'M43 62q7 14 15 0z'
            : pose === 'oops'
              ? 'M47 67q3-5 6 0'
              : sleepy
                ? 'M46 64q4 2 8 0'
                : 'M42 62q8 8 16 0'
        }
        fill={cheer ? 'var(--on-accent)' : 'none'}
        stroke="var(--on-accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {pose === 'oops' && <path d="M76 38q7 10 0 12q-7-2 0-12" fill="var(--bb-level)" />}
      {sleepy && (
        <text x="79" y="29" fill="var(--text-2)" fontSize="16" fontWeight="700">
          z
        </text>
      )}
      {closed && (
        <g>
          <circle cx="50" cy="77" r="7" fill="var(--celebrate)" />
          <path d="M46 72l-3-8m11 8 3-8" stroke="var(--celebrate)" strokeWidth="3" />
        </g>
      )}
      {thinking && <circle cx="66" cy="75" r="4" fill="var(--on-accent)" opacity=".8" />}
    </svg>
  );
}
