export type Sport = 'running' | 'cycling' | 'strength' | 'swimming' | 'walking' | 'other';
export interface Sample {
  time: number;
  distance: number | null;
  hr: number | null;
  speed: number | null;
  elevation: number | null;
  power: number | null;
  cadence: number | null;
  lat: number | null;
  lon: number | null;
}
export interface Lap {
  index: number;
  duration: number | null;
  distance: number | null;
  hr: number | null;
  speed: number | null;
  power?: number | null;
}
export interface Activity {
  id: string;
  name: string;
  sport: Sport;
  type: string;
  start: string;
  start_utc?: string;
  date: string;
  distance: number | null;
  duration: number | null;
  elapsed: number | null;
  moving: number | null;
  average_hr: number | null;
  max_hr: number | null;
  average_speed: number | null;
  elevation: number | null;
  calories: number | null;
  power: number | null;
  cadence: number | null;
  aerobic_te: number | null;
  anaerobic_te: number | null;
  training_load: number | null;
  vo2max?: number | null;
  device: string;
  description: string;
  parent_id?: string | null;
  is_parent?: boolean;
  source: string;
  zones: (number | null)[];
  samples: Sample[];
  laps: Lap[];
  sets: {
    index: number;
    type: string;
    reps: number | null;
    weight: number | null;
    duration: number | null;
    exercise: string;
  }[];
  detail_state: string;
  detail_error?: string;
  sample_count?: number;
  session_metrics?: { name: string; value: number; unit: string; source: string }[];
  note: { text: string; rpe: number | null; tags: string[] };
}
export interface Daily {
  date: string;
  steps?: number | null;
  resting_hr?: number | null;
  stress?: number | null;
  body_battery?: number | null;
  body_battery_high?: number | null;
  calories?: number | null;
  respiration?: number | null;
  sleep_seconds?: number | null;
  sleep_score?: number | null;
  sleep_need?: number | null;
  hrv?: number | null;
  hrv_status?: string | null;
  hrv_weekly?: number | null;
  sleep_start?: string | number | null;
  sleep_end?: string | number | null;
  deep_seconds?: number | null;
  rem_seconds?: number | null;
  light_seconds?: number | null;
  awake_seconds?: number | null;
  source: string;
}
export interface Prefs {
  units: 'metric' | 'imperial';
  timezone: string;
  week_start: 'monday' | 'sunday';
  weekly_distance: number;
  weekly_minutes: number;
  primary_sport: Sport;
  theme: 'light' | 'dark';
}
export interface Job {
  id: string;
  kind: string;
  activity_id: string | null;
  state: string;
  progress: number;
  message: string;
}
export interface DashboardData {
  mode: 'demo' | 'live';
  activities: Activity[];
  daily: Daily[];
  preferences: Prefs;
  local_mode?: boolean;
  user: { name: string; email: string };
  status: {
    connected: boolean;
    state: string;
    last_checked: string | null;
    last_success: string | null;
    message: string | null;
    region: string;
  };
  jobs: Job[];
  data_through: string | null;
}
export interface Insight {
  id: string;
  title: string;
  body: string;
  category: string;
  evidence: string;
  dates: string[];
  activityIds: string[];
  tone: 'positive' | 'neutral' | 'attention';
  method: string;
}
