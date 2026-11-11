export const metricIds = [
  'sleep_duration',
  'sleep_need',
  'sleep_score',
  'sleep_stages',
  'bedtime_regularity',
  'resting_hr',
  'hrv',
  'hrv_status',
  'body_battery',
  'stress',
  'steps',
  'active_minutes',
  'activity_count',
  'activity_time',
  'activity_distance',
  'effort',
  'hr_zones',
  'training_effect',
  'load',
  'efficiency',
  'vo2max',
  'usual_range',
  'record',
] as const;

export type MetricId = (typeof metricIds)[number];
export type MetricSource = 'Garmin' | 'Calculated' | 'Garmin or calculated';
export type GlossaryEntry = {
  title: string;
  what: string;
  howToRead: string;
  source: MetricSource;
  methodId?: string;
};

export const glossary = {
  sleep_duration: {
    title: 'Sleep',
    what: 'Time asleep last night, excluding time awake in bed.',
    howToRead:
      'Compare with your sleep need. A single short night matters less than a pattern over a week.',
    source: 'Garmin',
  },
  sleep_need: {
    title: 'Sleep need',
    what: "Garmin's estimate of how much sleep you needed, adjusted for recent sleep, activity and HRV.",
    howToRead: 'Being under your need for several nights in a row is worth addressing.',
    source: 'Garmin',
  },
  sleep_score: {
    title: 'Sleep score',
    what: "Garmin's 0–100 rating of last night based on duration, stages and restfulness.",
    howToRead:
      "80+ is good, 60–79 fair, below 60 poor on Garmin's scale. Look at the trend, not one night.",
    source: 'Garmin',
  },
  sleep_stages: {
    title: 'Sleep stages',
    what: 'How your night split between deep, light and REM sleep and time awake.',
    howToRead:
      "Garmin's suggested ranges are percentages of total sleep. Stage estimates from a wrist device are approximate.",
    source: 'Garmin',
  },
  bedtime_regularity: {
    title: 'Bedtime regularity',
    what: 'How consistent your bed and wake times are.',
    howToRead: 'Regular times within about 30 minutes are linked to better sleep quality.',
    source: 'Calculated',
    methodId: 'bedtime_rhythm@1',
  },
  resting_hr: {
    title: 'Resting heart rate',
    what: 'Your heart rate when fully at rest, measured overnight.',
    howToRead:
      'Lower over months usually means better aerobic fitness. A rise of 5+ bpm above your usual can follow poor sleep, stress, alcohol or illness.',
    source: 'Garmin',
  },
  hrv: {
    title: 'HRV',
    what: 'The variation in time between heartbeats overnight, in milliseconds.',
    howToRead:
      'Compare only with your own usual range, never with other people. Below your range can mean incomplete recovery.',
    source: 'Garmin',
  },
  hrv_status: {
    title: 'HRV status',
    what: "Garmin's assessment of your 7-day HRV average against your personal baseline.",
    howToRead:
      'Balanced means within your baseline. Unbalanced or Low suggests stress, illness or hard training.',
    source: 'Garmin',
  },
  body_battery: {
    title: 'Body Battery',
    what: "Garmin's 0–100 estimate of your energy reserves from HRV, stress, sleep and activity.",
    howToRead:
      'Higher at wake means better overnight recharge. Look at how much you charged overnight, not just the number.',
    source: 'Garmin',
  },
  stress: {
    title: 'Stress',
    what: "Garmin's 0–100 estimate of physiological stress from HRV during the day.",
    howToRead:
      '0–25 rest, 26–50 low, 51–75 medium, 76–100 high. Exercise and caffeine raise it too.',
    source: 'Garmin',
  },
  steps: {
    title: 'Steps',
    what: 'Steps counted by your watch today.',
    howToRead: 'Your Garmin step goal adapts to your recent activity.',
    source: 'Garmin',
  },
  active_minutes: {
    title: 'Active minutes',
    what: "Garmin's intensity minutes: moderate minutes plus vigorous minutes counted twice.",
    howToRead: 'Health guidelines suggest at least 150 per week. Your weekly goal is in Settings.',
    source: 'Garmin',
  },
  activity_count: {
    title: 'Activities',
    what: 'The number of recorded activities in the selected period.',
    howToRead:
      'Counts activities once each, including imported FIT files. It does not count ordinary movement outside a recorded activity.',
    source: 'Calculated',
  },
  activity_time: {
    title: 'Activity time',
    what: 'Total recorded time of your activities.',
    howToRead:
      'Includes easy parts and pauses inside activities, so it is usually higher than active minutes.',
    source: 'Garmin',
  },
  activity_distance: {
    title: 'Distance',
    what: 'Total recorded distance across activities in the selected period.',
    howToRead:
      'Includes activities with usable distance data. It may differ from Garmin Connect when an activity has not finished syncing.',
    source: 'Calculated',
  },
  effort: {
    title: 'Effort',
    what: 'A score of how hard an activity was, from time spent in each heart-rate zone.',
    howToRead: 'Higher zones count more. Useful to compare activities and weeks with each other.',
    source: 'Calculated',
    methodId: 'effort_points@1',
  },
  hr_zones: {
    title: 'Heart-rate zones',
    what: 'Five ranges of heart rate from very light (zone 1) to maximum (zone 5).',
    howToRead: 'Most training for fitness should be in zones 1–2.',
    source: 'Garmin or calculated',
    methodId: 'zones_from_samples@1',
  },
  training_effect: {
    title: 'Training effect',
    what: "Garmin's 0–5 rating of an activity's impact on aerobic and anaerobic fitness.",
    howToRead: '2–2.9 maintains, 3–3.9 improves, 4+ highly improves.',
    source: 'Garmin',
  },
  load: {
    title: 'Load',
    what: "This week's effort compared with your average of the previous 4 weeks.",
    howToRead: 'Rising more than about 30% in a week increases injury risk; build gradually.',
    source: 'Calculated',
    methodId: 'ramp_check@1',
  },
  efficiency: {
    title: 'Efficiency',
    what: 'Distance covered per heartbeat on runs and walks.',
    howToRead: 'Rising efficiency at similar effort is a sign of improving fitness.',
    source: 'Calculated',
    methodId: 'efficiency_trend@1',
  },
  vo2max: {
    title: 'VO2 max',
    what: "Garmin's estimate of your maximum aerobic capacity.",
    howToRead: 'Changes slowly; look at months, not days.',
    source: 'Garmin',
  },
  usual_range: {
    title: 'Your usual range',
    what: 'The range your readings normally fall in, from your last 30 days.',
    howToRead:
      'Readings outside it are worth noticing, not worrying about. Needs at least 14 readings.',
    source: 'Calculated',
    methodId: 'common.usual_range',
  },
  record: {
    title: 'Records',
    what: 'Your best performances, such as fastest 5 km or longest ride.',
    howToRead: 'Records only count activities with reliable GPS or distance data.',
    source: 'Calculated',
    methodId: 'bests@1',
  },
} as const satisfies Record<MetricId, GlossaryEntry>;

export function isMetricId(id: string): id is MetricId {
  return metricIds.includes(id as MetricId);
}
