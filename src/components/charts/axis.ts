export function sleepHoursTick(minutes: number): string {
  return `${Math.round(minutes / 60)} h`;
}

export function bedtimeTick(minutesFromNoon: number): string {
  const minutes = (minutesFromNoon + 720) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function paceTick(secondsPerUnit: number): string {
  const seconds = Math.round(secondsPerUnit);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function yAxisConfig(kind: 'plain' | 'sleep' | 'bedtime' | 'pace', unit = '') {
  return {
    tickFormatter:
      kind === 'sleep'
        ? sleepHoursTick
        : kind === 'bedtime'
          ? bedtimeTick
          : kind === 'pace'
            ? paceTick
            : (n: number) => `${n}${unit}`,
    reversed: kind === 'pace' || kind === 'bedtime',
  };
}
