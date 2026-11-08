import type { Activity, Daily, DashboardData, Sample, Sport } from './types';
import { addDays, dayDate, todayKey } from './analytics';

export function makeDemo(): DashboardData {
  const today = todayKey();
  let seed = 16165;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const activities: Activity[] = [];
  const daily: Daily[] = [];
  for (let i = 89; i >= 0; i--) {
    const date = addDays(today, -i);
    const day = dayDate(date).getDay();
    const slept = Math.round((7.4 + Math.sin(i * 0.65) * 0.6 + (rand() - 0.5) * 0.6) * 3600);
    daily.push({
      date,
      steps: Math.round(7000 + rand() * 6000),
      resting_hr: Math.round(48 + rand() * 5),
      hrv: Math.round(67 + Math.sin(i * 0.34) * 9 + rand() * 8),
      hrv_status: 'BALANCED',
      sleep_seconds: slept,
      sleep_score: Math.round(78 + rand() * 15),
      sleep_need: 480,
      body_battery: Math.round(45 + rand() * 25),
      body_battery_high: Math.round(80 + rand() * 19),
      stress: Math.round(20 + rand() * 14),
      respiration: Math.round((13 + rand() * 1.2) * 10) / 10,
      calories: Math.round(2300 + rand() * 650),
      deep_seconds: Math.round(slept * 0.19),
      rem_seconds: Math.round(slept * 0.24),
      light_seconds: Math.round(slept * 0.57),
      awake_seconds: Math.round(900 + rand() * 700),
      source: 'demo',
    });
    if (day === 0 || day === 3) continue;
    const sport: Sport = day === 2 ? 'strength' : day === 5 ? 'cycling' : 'running';
    const interval = day === 4;
    const long = day === 6;
    const distance =
      sport === 'strength'
        ? null
        : sport === 'cycling'
          ? 28000 + rand() * 16000
          : long
            ? 14500 + rand() * 3500
            : interval
              ? 7800 + rand() * 2200
              : 6000 + rand() * 4000;
    const speed =
      sport === 'cycling' ? 7.3 + rand() : interval ? 3.25 + rand() * 0.2 : 2.85 + rand() * 0.2;
    const duration = Math.round(distance ? distance / speed : 2700 + rand() * 700);
    const hr = sport === 'strength' ? 111 : sport === 'cycling' ? 133 : interval ? 157 : 139;
    const samples: Sample[] =
      sport === 'strength'
        ? []
        : Array.from({ length: 181 }, (_, n) => {
            const t = n / 180;
            const angle = t * Math.PI * 2;
            return {
              time: Math.round(t * duration),
              distance: distance! * t,
              hr: Math.round(
                hr +
                  Math.sin(t * 50) * 5 +
                  (interval && t > 0.15 && t < 0.85 ? Math.sin(t * 100) * 14 : 0),
              ),
              speed: Math.max(
                0.2,
                speed + Math.sin(t * 35) * 0.15 + (interval ? Math.sin(t * 100) * 0.5 : 0),
              ),
              elevation: 35 + Math.sin(t * 16) * 12 + t * 10,
              power:
                sport === 'running'
                  ? Math.round(260 + Math.sin(t * 40) * 30)
                  : Math.round(165 + Math.sin(t * 40) * 40),
              cadence: sport === 'running' ? Math.round(171 + Math.sin(t * 30) * 4) : 82,
              lat: 45.51 + Math.sin(angle) * 0.011 + Math.sin(angle * 3) * 0.0017,
              lon: -73.588 + Math.cos(angle) * 0.014 + Math.sin(angle * 2) * 0.003,
            };
          });
    const laps = distance
      ? Array.from({ length: Math.ceil(distance / 1000) }, (_, n) => {
          const d = Math.min(1000, distance - n * 1000);
          return {
            index: n + 1,
            distance: d,
            duration: d / speed + Math.sin(n) * 5,
            hr: hr + Math.round(Math.sin(n) * 4),
            speed: speed + Math.sin(n) * 0.08,
            power: 265,
          };
        })
      : [];
    const shares =
      sport === 'strength'
        ? [0.3, 0.4, 0.25, 0.05, 0]
        : interval
          ? [0.08, 0.25, 0.27, 0.31, 0.09]
          : [0.12, 0.69, 0.16, 0.03, 0];
    activities.push({
      id: `demo-${date}`,
      date,
      start: `${date}T${long ? '08:12' : '07:04'}:00`,
      name:
        sport === 'strength'
          ? 'Full body · strength'
          : sport === 'cycling'
            ? 'Riverside ride'
            : interval
              ? 'Threshold intervals'
              : long
                ? 'Saturday long run'
                : 'Morning easy run',
      sport,
      type: sport === 'running' ? 'running' : sport,
      distance,
      duration,
      elapsed: duration + 90,
      moving: duration,
      average_hr: hr,
      max_hr: hr + 25,
      average_speed: distance ? speed : null,
      elevation: sport === 'strength' ? null : Math.round(50 + rand() * 90),
      calories: Math.round(duration * 0.15),
      power: sport === 'strength' ? null : sport === 'cycling' ? 178 : 273,
      cadence: sport === 'strength' ? null : 172,
      aerobic_te: sport === 'strength' ? 1.8 : interval ? 4.1 : 3.1,
      anaerobic_te: interval ? 2.5 : 0.4,
      training_load: sport === 'strength' ? null : Math.round(80 + rand() * 90),
      vo2max: 51,
      description: '',
      device: 'Garmin Forerunner 165',
      source: 'demo',
      zones: shares.map((s) => Math.round(s * duration)),
      samples,
      laps,
      sets:
        sport === 'strength'
          ? ['Squat', 'Bench press', 'Romanian deadlift', 'Row'].flatMap((exercise, e) =>
              Array.from({ length: 3 }, (_, n) => ({
                index: e * 3 + n + 1,
                type: 'active',
                exercise,
                reps: 8,
                weight: exercise === 'Squat' ? 60 : 40,
                duration: 40,
              })),
            )
          : [],
      detail_state: 'ready',
      note: {
        text: '',
        rpe: interval ? 7 : 4,
        tags: interval ? ['Intervals'] : long ? ['Long run'] : ['Easy'],
      },
    });
  }
  return {
    mode: 'demo',
    activities: activities.reverse(),
    daily,
    preferences: {
      units: 'metric',
      timezone: 'America/Toronto',
      week_start: 'monday',
      weekly_distance: 40000,
      weekly_minutes: 360,
      primary_sport: 'running',
      theme: 'light',
    },
    user: { name: 'Alex', email: '' },
    status: {
      connected: false,
      state: 'demo',
      last_checked: null,
      last_success: null,
      message: null,
      region: 'com',
    },
    jobs: [],
    data_through: today,
  };
}
