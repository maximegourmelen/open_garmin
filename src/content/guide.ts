export const guideTopicIds = [
  'getting-started',
  'connecting-garmin',
  'metrics',
  'methods',
  'research',
  'privacy',
  'garmin-differences',
  'shortcuts',
] as const;

export type GuideTopicId = (typeof guideTopicIds)[number];
export type GuideTopic = {
  title: string;
  summary: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
};

export const guideTopics = {
  'getting-started': {
    title: 'Getting started',
    summary: 'Open Garmin brings your activity and health readings into one private place.',
    paragraphs: [
      'Overview shows your latest readings, weekly activity and a suggestion for today. Activities gives each session a map, charts and splits. Health shows trends in sleep, heart rate, Body Battery, stress and steps. Trends shows how your fitness and routine are changing.',
      'You can explore the sample workspace before connecting a watch. Use the account menu to switch between sample data and your own readings.',
    ],
    bullets: [
      'Open search with ⌘K or Ctrl K',
      'Take the optional tour from the account menu',
      'Select an info button next to a metric to learn how to read it',
    ],
  },
  'connecting-garmin': {
    title: 'Connecting Garmin',
    summary: 'Connect your Garmin account to import readings into this computer.',
    paragraphs: [
      'Open Settings, then Garmin connection. Follow the steps to provide your Garmin key. The app stores it encrypted and uses it to sync your data.',
      'Recent days arrive first. Older history continues in the background. The sidebar shows the latest sync state. You can request a longer history import or disconnect in Settings.',
      'If a key expires or Garmin limits requests, check the connection status and try again later. If a reading is missing, make sure your watch recorded it and wait for the next sync.',
    ],
  },
  metrics: {
    title: 'Understanding your metrics',
    summary: 'Each metric has a source, a usual range and guidance for reading it.',
    paragraphs: [
      'Use the metric index to open an explanation. Compare readings with your own history; one unusual day is less informative than a pattern.',
    ],
  },
  methods: {
    title: 'How the numbers are calculated',
    summary: 'See the methods behind calculated metrics and summaries.',
    paragraphs: [
      'Garmin-reported readings are shown as received. Calculated metrics use those readings to describe trends, effort, load and records. Each method lists its inputs and calculation.',
    ],
  },
  research: {
    title: 'Research',
    summary: 'Read the evidence and limits behind the app’s guidance.',
    paragraphs: [
      'The research library links claims to their sources. Use the search field to find a topic and read the original source for context.',
    ],
  },
  privacy: {
    title: 'Privacy and your data',
    summary: 'Your data stays on this computer unless you choose to export it.',
    paragraphs: [
      'Open Garmin runs locally. Settings provides data export and deletion controls. Disconnecting Garmin stops new syncs; it does not automatically erase readings already imported.',
      'The sample workspace contains synthetic data and is separate from your own readings.',
    ],
  },
  'garmin-differences': {
    title: "Why don't my numbers match Garmin Connect?",
    summary: 'Rounding, time zones, sync timing and missing detail files can change what you see.',
    paragraphs: [
      'Open Garmin may round values differently from Garmin Connect. Daily boundaries use your selected time zone. A recent reading may not appear until the next sync.',
      'Some activity charts and splits need the original detail file. Values marked as calculated use Open Garmin methods and can differ from Garmin-reported values.',
    ],
  },
  shortcuts: {
    title: 'Keyboard shortcuts',
    summary: 'Move around the app without leaving the keyboard.',
    paragraphs: [
      'Press ⌘K or Ctrl K to search. Press g then o, a, h, t or s to open Overview, Activities, Health, Trends or Settings. Press ? to see all shortcuts. On an activity detail page, [ and ] move to the previous or next activity.',
    ],
  },
} as const satisfies Record<GuideTopicId, GuideTopic>;

export const guideDisclaimer =
  'Open Garmin is not affiliated with Garmin. This app is not medical advice.';
