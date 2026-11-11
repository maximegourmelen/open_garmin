import { Activity, Bike, Dumbbell, Footprints, Mountain, Waves } from 'lucide-react';
import { RunIcon } from '../../components/icons/RunIcon';
import type { Sport } from '../../lib/types';

export const SPORTS: Sport[] = [
  'walking',
  'running',
  'cycling',
  'swimming',
  'strength',
  'hiking',
  'other',
];

export const SPORT_ICONS: Record<Sport, React.ComponentType<{ size?: number }>> = {
  walking: Footprints,
  running: RunIcon,
  cycling: Bike,
  swimming: Waves,
  strength: Dumbbell,
  hiking: Mountain,
  other: Activity,
};
