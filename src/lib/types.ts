/** API v2 shapes; kept in step with server/api/schemas.py. */
export type Source = 'garmin' | 'calculated' | 'user' | 'imported_fit' | 'demo';
export type Sport =
  'walking' | 'running' | 'cycling' | 'swimming' | 'strength' | 'hiking' | 'other';
export type Pose = 'wave' | 'cheer' | 'proud' | 'thinking' | 'sleepy' | 'calm' | 'oops' | 'stretch';
export type Range = '7D' | '4W' | '3M' | '1Y';

export interface StatusResponse {
  mode: 'live' | 'demo';
  local_mode: boolean;
  user: { name: string };
  connection: {
    connected: boolean;
    state: string;
    last_checked: string | null;
    last_success: string | null;
    message: string | null;
    region: 'com' | 'cn';
  };
  jobs: {
    id: string;
    kind: 'sync' | 'activity';
    state: string;
    progress: number;
    message: string;
  }[];
  rederive: { state: 'idle' | 'running'; progress: number };
  data_through: string | null;
  unseen: { milestones: number; recap_week: string | null };
}

export interface Preferences {
  units: 'metric' | 'imperial';
  timezone: string;
  week_start: 'monday' | 'sunday';
  weekly_distance: number;
  weekly_minutes: number;
  weekly_sessions: number;
  primary_sport: Sport;
  theme: 'dark' | 'light' | 'system';
  reduce_motion: boolean;
  onboarded: boolean;
  tour_completed: ('overview' | 'activity')[];
  goal_focus: 'move_more' | 'start_running' | 'build_habit' | 'sleep_better' | 'curious';
  companion_enabled: boolean;
  companion_name: string;
  companion_tone: 'cheerful' | 'calm';
  zone_source: 'garmin' | 'custom';
  max_hr: number | null;
  steps_goal_source: 'garmin' | 'custom';
  steps_goal: number;
  today_layout: string[];
  nav_collapsed: boolean;
  journey: Record<string, unknown> | null;
}

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

export interface MetricSummary {
  id: string;
  latest: { date: string; value: number } | null;
  unit: string;
  usual_range: { low: number; high: number; median: number; n: number } | null;
  series: { date: string; value: number | null }[];
  source: 'garmin' | 'calculated';
  method_id: string | null;
  value_label: string | null;
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
  bests: {
    kind: string;
    all_time: {
      activity_id: string;
      kind: string;
      date: string;
      sport: Sport;
      value: number;
      source: Source;
      is_new: boolean;
    };
    recent_90: {
      activity_id: string;
      kind: string;
      date: string;
      sport: Sport;
      value: number;
      source: Source;
      is_new: boolean;
    } | null;
  }[];
  volume: {
    start: string;
    end: string;
    minutes: number;
    goal: number;
    sessions: number;
    distance: number;
    by_sport: Record<string, number>;
    partial: boolean;
    method: string;
  }[];
  consistency: { days: { date: string; minutes: number }[]; active_days_28: number };
  ramp: {
    band: string;
    ratio: number | null;
    this_week: number;
    average_four_weeks: number | null;
    projected: number | null;
    sentence: string;
    n: number;
    source: Source;
    method: string;
  };
  method: string;
}

export interface DeeperResponse {
  range: Range;
  from: string;
  to: string;
  effort_trend: {
    days: {
      date: string;
      effort: number;
      acute: number | null;
      chronic: number | null;
      ratio: number | null;
    }[];
    caption: string;
  };
  intensity_mix: {
    easy_minutes: number;
    moderate_minutes: number;
    hard_minutes: number;
    sentence: string;
    n: number;
  };
  benefit_mix: Record<string, number>;
  pace_hr: { id: string; date: string; sport: Sport; pace_s_per_km: number; average_hr: number }[];
  running_form: {
    date: string;
    cadence_spm: number | null;
    stride_length_m: number | null;
    ground_contact_ms: number | null;
    vertical_oscillation_cm: number | null;
    vertical_ratio_pct: number | null;
  }[];
  five_k_estimate: {
    seconds: number | null;
    based_on: { activity_id: string; date: string } | null;
    sentence: string;
  };
  vo2max: { date: string; value: number }[];
  method: string;
}

export interface RelationshipResponse {
  x: string;
  y: string;
  lag: number;
  points: [number, number, string][];
  rho: number | null;
  n: number;
  words: string;
  disclaimer: string;
  method: string;
}

export interface JourneyView {
  id: string;
  name: string;
  focus: string;
  started: string;
  paused: boolean;
  repeats: number[];
  weeks: JourneyWeek[];
  current_slot: number | null;
  completed: boolean;
  method: string;
}

export interface JourneyWeek {
  week: number;
  slot: number;
  start: string;
  end: string;
  targets: {
    minutes?: number;
    sessions?: number;
    longest_minutes?: number;
    nights_at_need?: number;
    avg_steps?: number;
    tip?: string;
  };
  actual: {
    minutes: number;
    sessions: number;
    longest_minutes: number;
    nights_at_need: number;
    avg_steps: number | null;
  };
  pct: number;
  status: 'done' | 'partial' | 'current' | 'upcoming';
}

export interface JourneyOption {
  id: string;
  name: string;
  focus: string;
  weeks: { tip?: string; minutes?: number; sessions?: number }[];
}

export interface WeeklyRecap {
  week_start: string;
  week_end: string;
  slides: {
    kind: string;
    title?: string;
    big?: string;
    text: string;
    pose?: Pose;
    pct?: number;
    minutes?: number;
    goal?: number;
    activity_id?: string;
  }[];
  seen: boolean;
}

export interface JourneyResponse {
  journey: JourneyView | null;
  available: JourneyOption[];
  goal: { minutes: number; sessions: number };
  goal_suggestion: {
    minutes: number;
    current_goal: number;
    sentence: string;
    weeks_met: number;
    n: number;
    source: Source;
    method: string;
  } | null;
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

export interface ResearchPaper {
  id: string;
  title: string;
  authors: string;
  year: number;
  journal: string;
  doi: string;
  pmcid: string | null;
  pubmed_url: string | null;
  publisher_url: string | null;
  full_text_status: string;
  review_status: string;
  topics: string[];
}

export interface ResearchReview {
  paper_id: string;
  population: string;
  finding: string;
  limitations: string;
  approved_use: string;
}

export interface ResearchClaim {
  id: string;
  title: string;
  summary: string;
  paper_ids: string[];
  applies_to: string[];
}

export interface ResearchResponse {
  papers: ResearchPaper[];
  reviews: ResearchReview[];
  claims: ResearchClaim[];
}
