export type TourId = 'overview' | 'activity';
export type TourStep = { target: string; title: string; text: string };

export const tourSteps: Record<TourId, readonly TourStep[]> = {
  overview: [
    {
      target: 'sidebar',
      title: 'Four places',
      text: 'Overview, Activities, Health and Trends keep your readings organised.',
    },
    {
      target: 'week',
      title: 'This week',
      text: 'Progress towards your weekly goal. Active minutes come from your watch’s intensity minutes.',
    },
    {
      target: 'metric-strip',
      title: 'Your readings',
      text: 'Last night’s readings. Select a metric label to learn what it means and what is usual for you.',
    },
    {
      target: 'guidance',
      title: 'Today’s guidance',
      text: 'A suggestion based on sleep, HRV, Body Battery and recent load. This is not medical advice.',
    },
    {
      target: 'search',
      title: 'Find anything',
      text: 'Press ⌘K or Ctrl K to jump to an activity, page or metric explanation.',
    },
  ],
  activity: [
    {
      target: 'activity-map',
      title: 'Follow your route',
      text: 'Move over a route point to see the matching moment in your charts.',
    },
    {
      target: 'activity-chart',
      title: 'Read the session',
      text: 'Switch between time and distance and compare pace, heart rate and elevation.',
    },
  ],
};
