/** API v2 shapes; kept in step with server/api/schemas.py. */
export type Source = 'garmin' | 'calculated' | 'user' | 'imported_fit' | 'demo';
export type Sport =
  'walking' | 'running' | 'cycling' | 'swimming' | 'strength' | 'hiking' | 'other';
export type Pose = 'wave' | 'cheer' | 'proud' | 'thinking' | 'sleepy' | 'calm' | 'oops' | 'stretch';
export type Range = '7D' | '4W' | '3M' | '1Y';

export interface CompanionMessage {
  id: string;
  text: string;
  pose: Pose;
  data_refs: string[];
  tone?: 'cheerful' | 'calm';
}

export interface ActivitySummary {
  id: string;
  name: string;
  sport: Sport;
  type: string;
  date: string;
  start: string;
  distance: number | null;
  duration: number | null;
  average_speed: number | null;
  gap_speed: number | null;
  average_hr: number | null;
  elevation: number | null;
  effort_points: number | null;
  zone_minutes: (number | null)[] | null;
  has_route: boolean;
  detail_state: string;
  location_name: string | null;
  is_best: boolean;
  device: string;
  source: Source;
}

export interface ActivityList {
  items: ActivitySummary[];
  next_cursor: string | null;
  totals: { sessions: number; duration: number; distance: number; effort_points: number };
}

export interface StreamData {
  index: number[];
  time: number[];
  distance: (number | null)[];
  hr: (number | null)[];
  speed: (number | null)[];
  elevation: (number | null)[];
  cadence_spm: (number | null)[];
  power: (number | null)[];
  lat: (number | null)[];
  lon: (number | null)[];
}

export interface Split {
  index: number;
  distance_m: number;
  time_s: number;
  pace_s: number | null;
  avg_hr: number | null;
  elev_gain_m: number | null;
  elev_loss_m: number | null;
  cadence_spm: number | null;
  partial: boolean;
}

export interface ActivityDetail extends ActivitySummary {
  elapsed: number | null;
  moving: number | null;
  max_hr: number | null;
  max_speed: number | null;
  calories: number | null;
  steps: number | null;
  cadence_spm: number | null;
  cadence_rpm: number | null;
  power: number | null;
  normalized_power: number | null;
  max_power: number | null;
  elevation_loss: number | null;
  temperature_min: number | null;
  temperature_max: number | null;
  aerobic_te: number | null;
  anaerobic_te: number | null;
  te_label: string | null;
  body_battery_impact: number | null;
  vo2max: number | null;
  running_form: Record<string, number | null> | null;
  zone_details: { minutes: (number | null)[]; source: Source } | null;
  power_zones: (number | null)[] | null;
  streams: StreamData | null;
  splits_km: Split[];
  splits_mi: Split[];
  laps: Record<string, unknown>[];
  sets: Record<string, unknown>[];
  best_efforts: { kind: string; label: string; time_s: number; is_pb: boolean; source: Source }[];
  efficiency: { ef: number | null; decoupling_pct: number | null } | null;
  summary: CompanionMessage;
  milestones: { id: string; title: string }[];
  note: { text: string; rpe: number | null; feel: number | null; tags: string[] };
  watch_feel: number | null;
  watch_rpe: number | null;
  session_metrics: { name: string; value: number; unit: string }[];
}

export interface WeekProgress {
  start: string;
  end: string;
  minutes: number;
  goal: number;
  pct: number | null;
  sessions: number;
  sessions_goal: number;
  remaining_minutes: number;
  days_left: number;
  by_day: {
    date: string;
    minutes: number;
    sports: Sport[];
    is_today: boolean;
    is_future: boolean;
  }[];
  sentence: string;
  method: string;
}

export interface Suggestion {
  kind: 'go' | 'easy' | 'rest' | 'unknown';
  title: string;
  text: string;
  pose: Pose;
  signals: {
    id: string;
    label: string;
    state: 'good' | 'ok' | 'low';
    value_text: string;
    source: Source;
  }[];
  footnote: string;
  method: string;
}

export interface Streak {
  current: number;
  longest: number;
  at_risk: boolean;
  remaining_minutes: number;
  remaining_sessions: number;
  weeks: { start: string; pct: number | null; met: boolean }[];
  method: string;
}

export interface MilestoneView {
  id: string;
  title: string;
  description: string;
  how_to_earn: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold';
  color: string;
  earned: boolean;
  earned_on: string | null;
  activity_id: string | null;
  progress: { current: number; target: number; unit: string } | null;
  seen?: boolean;
}

export interface Insight {
  id: string;
  category: string;
  tone: 'positive' | 'neutral' | 'attention';
  title: string;
  body: string;
  evidence: string;
  dates: string[];
  activity_ids: string[];
  method: string;
  claims: {
    id: string;
    title: string;
    summary: string;
    sources: { label: string; url: string }[];
  }[];
}

export interface TodayResponse {
  date: string;
  greeting: string;
  message: CompanionMessage;
  week: WeekProgress;
  suggestion: Suggestion;
  streak: Streak;
  sleep: {
    date: string;
    minutes: number | null;
    need_minutes: number | null;
    score: number | null;
    stages: Record<string, number | null>;
    sentence: string;
  } | null;
  body_battery: {
    latest: number | null;
    at_wake: number | null;
    charged: number | null;
    drained: number | null;
    sentence: string | null;
  } | null;
  resting_hr: {
    value: number | null;
    usual: number | null;
    spark: (number | null)[];
    sentence: string;
  } | null;
  hrv: {
    value: number | null;
    status: string | null;
    balanced_low: number | null;
    balanced_high: number | null;
    sentence: string;
  } | null;
  steps: { value: number | null; goal: number | null } | null;
  checkin: {
    date: string;
    mood: number | null;
    energy: number | null;
    soreness: number | null;
    note: string;
  } | null;
  latest_activity:
    | (ActivitySummary & { route_preview: [number, number][] | null; summary: CompanionMessage })
    | null;
  next_milestone: MilestoneView | null;
  journey: JourneyView | null;
  insights: Insight[];
  unseen_milestones: MilestoneView[];
  recap_ready: string | null;
  layout: string[];
  method: string;
}

export interface HealthSeries<T = Record<string, unknown>> {
  range: Range;
  from: string;
  to: string;
  days: T[];
  summary: Record<string, unknown>;
  sentences: string[];
  method: string;
}

export interface FitnessSignal {
  id: string;
  status: 'improving' | 'steady' | 'declining' | 'insufficient';
  sentence: string;
  before: number | null;
  after: number | null;
  unit: string;
  n_before: number;
  n_after: number;
  method: string;
}

export interface ProgressResponse {
  signals: FitnessSignal[];
  bests: Record<string, unknown>[];
  volume: Record<string, unknown>[];
  consistency: { days: { date: string; minutes: number }[]; active_days_28: number };
  ramp: Record<string, unknown>;
  method: string;
}

export interface JourneyView {
  id: string;
  name: string;
  focus: string;
  started: string;
  paused: boolean;
  repeats: number[];
  weeks: Record<string, unknown>[];
  current_slot: number | null;
  completed: boolean;
  method: string;
}

export interface JourneyResponse {
  journey: JourneyView | null;
  available: Record<string, unknown>[];
  goal: { minutes: number; sessions: number };
  goal_suggestion: Record<string, unknown> | null;
  streak: Streak;
  milestones: MilestoneView[];
  recaps: { week_start: string; seen: boolean }[];
  checkins: {
    date: string;
    mood: number | null;
    energy: number | null;
    soreness: number | null;
    note: string;
  }[];
}

export interface Method {
  id: string;
  version: number;
  title: string;
  plain: string;
  formula: string;
  inputs: string[];
  minimum_data: string;
}
