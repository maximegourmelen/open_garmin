export const pageIds = [
  'overview',
  'activities',
  'activity',
  'health-sleep',
  'health-heart',
  'health-body-battery',
  'health-stress',
  'health-steps',
  'trends',
  'guide',
  'settings',
] as const;

export type PageId = (typeof pageIds)[number];
export type PageIntro = {
  description: string | null;
  bullets: readonly string[];
};

export const pageIntros = {
  overview: {
    description: null,
    bullets: [
      "Last night's readings compared with your usual range",
      'Progress towards your weekly goal',
      'A suggestion for today, with its reasons',
    ],
  },
  activities: {
    description:
      'Every activity synced from your watch. Select one for its map, charts and splits.',
    bullets: [
      'Use the range and sport filter to narrow the list',
      'Effort shows how hard each activity was',
      'Select several to compare them',
    ],
  },
  activity: {
    description: null,
    bullets: [
      'Hover a chart to see that point on the map',
      'Switch between time and distance',
      'Add how it felt under Notes',
    ],
  },
  'health-sleep': {
    description: 'How long and how well you slept, compared with what you needed.',
    bullets: [
      'Bars show each night by stage',
      'The dashed line is your sleep need',
      'Bedtime regularity is shown below',
    ],
  },
  'health-heart': {
    description: 'Resting heart rate and HRV, compared with your usual range.',
    bullets: [
      'The shaded band is your usual range',
      'Compare only with yourself',
      'Short-term changes often follow sleep or stress',
    ],
  },
  'health-body-battery': {
    description: "Garmin's estimate of your energy through each day.",
    bullets: [
      "Each bar shows a day's lowest and highest level",
      'Activities and stress drain it; rest charges it',
    ],
  },
  'health-stress': {
    description: "Garmin's stress estimate from heart-rate variability.",
    bullets: ['Exercise raises measured stress', 'Look at rest time as much as high stress'],
  },
  'health-steps': {
    description: 'Daily steps and weekly active minutes.',
    bullets: ['The line is your daily step goal', 'Active minutes count vigorous time double'],
  },
  trends: {
    description: 'How your fitness, volume and consistency are changing over time.',
    bullets: [
      'Fitness signals compare recent weeks with earlier ones',
      'Load warns when a week rises sharply',
      'Weekly reports summarise each week',
    ],
  },
  guide: {
    description: 'How Open Garmin works and what each number means.',
    bullets: [],
  },
  settings: {
    description: 'Goals, units, heart-rate zones, your Garmin connection and your data.',
    bullets: [],
  },
} as const satisfies Record<PageId, PageIntro>;
