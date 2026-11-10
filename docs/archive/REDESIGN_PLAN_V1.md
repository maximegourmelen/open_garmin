# Open Garmin — Complete Redesign Plan

> **Audience of this document:** an orchestrating agent (and the sub-agents it delegates to).
> Read **Section 0** fully before doing anything. Every task in **Section 11** is written to be
> handed to a sub-agent as-is: it lists goal, files, steps, acceptance criteria, and the exact
> commands that prove it is done. Do not skip acceptance checks. Do not improvise scope.

Plan date: 2026-11-08. Repository: `/Users/maximeg/Documents/Python/open_garmin`.

---

## Table of contents

0. [Ground rules for the orchestrator (read first)](#0-ground-rules-for-the-orchestrator-read-first)
1. [Product vision: a friendly companion for beginners](#1-product-vision-a-friendly-companion-for-beginners)
2. [Audit of the current project (why it feels vibe-coded)](#2-audit-of-the-current-project-why-it-feels-vibe-coded)
3. [Target architecture](#3-target-architecture)
4. [Design system: Garmin-inspired, modernized, playful](#4-design-system-garmin-inspired-modernized-playful)
5. [The companion ("Pip") and the voice of the app](#5-the-companion-pip-and-the-voice-of-the-app)
6. [Information architecture and page specifications](#6-information-architecture-and-page-specifications)
7. [Data layer changes (backend)](#7-data-layer-changes-backend)
8. [Analytics specification (formulas, thresholds, tests)](#8-analytics-specification-formulas-thresholds-tests)
9. [Engagement engine: streaks, milestones, journeys, check-ins, recaps](#9-engagement-engine-streaks-milestones-journeys-check-ins-recaps)
10. [API contract](#10-api-contract)
11. [Phased task list (the work)](#11-phased-task-list-the-work)
12. [Testing and verification strategy](#12-testing-and-verification-strategy)
13. [Guardrails: things you must never do](#13-guardrails-things-you-must-never-do)
14. [Decisions already made and open questions](#14-decisions-already-made-and-open-questions)
15. [Appendices: copy catalogs, milestone catalog, journey definitions, glossary](#15-appendices)

---

## 0. Ground rules for the orchestrator (read first)

### 0.1 What you are building

A **complete redesign** of the Open Garmin web app (React + FastAPI) so that it:

1. Looks and feels like a **modern take on Garmin Connect**: dark-first, data tiles with big
   condensed numbers, ring and segmented gauges, Garmin-style heart-rate zone colours, sleep
   stage colours, Body Battery and stress visuals, stacked synchronised activity charts.
2. Is made for **beginners trying to get fitter**, not athletes. Plain language everywhere. Every
   metric explains itself in one sentence. Advanced numbers are hidden behind "Go deeper".
3. Feels **playful**: a small original companion character, celebrations, milestones (badges),
   weekly streaks, goal rings that fill up, a weekly recap in "story" format.
4. Makes the user feel **accompanied**: a daily check-in, a daily friendly message that reacts to
   their real data, guided "Journeys" (multi-week programmes with weekly targets), and gentle
   encouragement that never shames.
5. Adds **much more analysis**, computed in Python on the server, tested, versioned, and always
   labelled with where the number came from (Garmin, calculated by the app, or entered by you).
6. Has a **clean codebase**: formatted, linted, split into small files, typed, tested.

### 0.2 How to work

- **Work on a branch.** Before Phase 0 starts: `git checkout -b redesign`. Each phase is merged
  only when its "Phase exit criteria" pass. Commit after every task with a message like
  `P2-T3: Normalize activity fields v2`. End every commit message with the line
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Run the checks after every task.** The standard check command block is:
  ```sh
  cd /Users/maximeg/Documents/Python/open_garmin
  .venv/bin/python -m pytest -q
  .venv/bin/ruff check server tests        # from Phase 1 on
  npm run lint                              # from Phase 1 on
  npm test
  npm run build
  ```
  A task is **not done** if any of these fail. If a check was already failing before your task,
  stop and report it instead of "fixing" unrelated things.
- **Follow the phase order.** Tasks inside a phase marked `‖ parallel-safe` can be given to
  separate sub-agents at the same time. Tasks without that mark must run in the listed order.
- **When a task brief and your own idea disagree, the brief wins.** If the brief is impossible
  (e.g. a library API changed), make the smallest change that satisfies the acceptance criteria
  and write what you changed in the commit message body.
- **Never invent Garmin data or Garmin endpoints.** If a field is not present in the stored raw
  payloads, the feature that needs it shows a friendly empty state. See Section 13.
- **The user has real data** in `.runtime/` (a SQLite DB with real activities, sleep, HRV and
  encrypted Garmin key). Phase 0 backs it up. Never delete, overwrite, reset or commit `.runtime/`.
- **Ask the user** (stop and report) only for the items in Section 14.2. Everything else is decided.

### 0.3 Definition of done for the whole project

- All Phase exit criteria in Section 11 pass.
- `npm run build` produces `dist/`, and `Start.command` still launches the app and opens it in
  local mode with the user's existing data intact.
- The demo workspace (synthetic data) shows every page fully populated with no empty charts.
- Playwright smoke tests pass on desktop (1440×900) and mobile (390×844) viewports, in dark and
  light themes, and screenshots are saved to `docs/screenshots/` for review.
- README is updated. `docs/METHODS.md` documents every calculation.

---

## 1. Product vision: a friendly companion for beginners

### 1.1 Who the user is

- Someone who bought a Garmin watch (e.g. a Forerunner 165, Venu, vívoactive) to **get fitter**.
- Walks, does some easy runs, maybe a bike ride or a strength session. 2–4 sessions per week.
- Does **not** know what HRV, VO2 max, TRIMP, aerobic decoupling or "training load" mean.
- Gets discouraged easily. Benefits from small wins, consistency, and being told that rest is good.
- Wants to know three things: **"Am I doing enough?" "Am I getting better?" "What should I do today?"**

### 1.2 Product promise (put this tone into everything)

> "Open Garmin turns your watch data into a friendly coach-like companion. It celebrates what you
> did, shows you that you're getting fitter, and keeps you company week after week — with
> numbers you can always trust and check."

### 1.3 Design principles (rank-ordered; when two conflict, the higher one wins)

1. **Honest numbers.** Missing data stays missing. Every number shows its source badge
   (Garmin / Calculated / You). No made-up precision. Nothing is medical advice.
2. **Plain language first, details second.** Each card leads with a sentence a 12-year-old
   understands ("You moved 95 minutes this week — 63% of your goal"). Numbers and charts follow.
   Expert metrics live under a collapsible **"Go deeper"** section.
3. **Encourage, never shame.** No red "failure" states for missed goals. Rest days are celebrated.
   Streaks are weekly (so rest days never break them). See the voice rules in Section 5.4.
4. **Accompany.** The app should notice things and say something about them: a check-in each
   morning, a reaction after each activity, a recap each week, milestones as they happen.
5. **Playful but calm.** Rounded shapes, bright data colours on dark, a cute companion, small
   animations and one-time celebrations. Never noisy, never constant confetti, never ads-like.
6. **Garmin-familiar.** A Garmin owner should instantly recognise the visual vocabulary
   (zone colours, sleep colours, Body Battery, ring gauges, "My Day" card stack) — but in an
   original, more modern design. No Garmin logos or copied artwork (Section 13).
7. **Private by default.** All data stays on this machine. No external network calls from the
   browser (no CDNs, no map tiles, no analytics, no fonts from Google).

### 1.4 What "extra analysis" means for beginners

Beginner-facing (front and centre):

| Question the user has | Analysis that answers it | Section |
|---|---|---|
| Am I doing enough? | Weekly active minutes vs goal ring; sessions per week; steps vs goal | 8.2, 8.3 |
| Am I consistent? | Weekly streak; "days moved" dots; 12-week calendar heat map | 9.1 |
| Am I getting fitter? | "Signs you're getting fitter": resting heart rate trend, "more distance per heartbeat" (efficiency), longest session growth, personal bests, Garmin VO2 max (if reported) | 8.5 |
| What should I do today? | "Today's suggestion": a words-only suggestion from sleep, HRV status, Body Battery and resting HR, with the reasons shown as chips | 8.6 |
| Am I overdoing it? | "Ramp check": this week's effort vs your 4-week average | 8.4 |
| How did I sleep? | Sleep vs need, bedtime consistency, stages vs Garmin's own optimal ranges | 8.7 |
| How stressed / charged am I? | Body Battery day, stress breakdown | 8.8 |
| What did this workout do? | Plain-language activity summary, effort points, zones, Garmin training effect explained, Body Battery impact, personal bests set | 8.9 |

"Go deeper" (hidden by default, for curious users): acute vs chronic effort chart, intensity mix,
splits, running form (cadence, stride, ground contact), pace at heart rate scatter, relationships
explorer (e.g. "does sleep relate to my next-day HRV?"), 5K time estimate.

---

## 2. Audit of the current project (why it feels vibe-coded)

These are the concrete problems found when reviewing the code on 2026-11-08. The redesign fixes
all of them. Do not "patch" them in the old code; they disappear by following Section 11.

### 2.1 Frontend code quality

| Problem | Evidence |
|---|---|
| Whole screens written as single lines of JSX | `src/pages.tsx` is 49 KB in 92 lines; `TodayPage`, `ActivityPage`, `SettingsPage` are each one or a few extremely long lines. Unreadable, unreviewable, un-diffable. |
| One 57 KB minified-style stylesheet | `src/styles.css`: ~200 class names, all on a handful of lines, no structure, many one-off classes. |
| No formatter / linter | No Prettier, no ESLint, no ruff. The `useMemo` in `App.tsx` builds the context with an incomplete dependency list (functions recreated every render, memo is meaningless). |
| God component | `App.tsx` owns session, demo/live switching, polling, theme, search, toasts, help dialog, connect dialog and layout. |
| Imperative DOM in React | `dashboard.tsx` reads `document.getElementById('widget-kind')`. |
| Global `location` used instead of router location | Breadcrumb in `App.tsx` uses `location.pathname`. |
| Duplicate pages | `/dashboard` and `/today` overlap heavily; `/` redirects to `/dashboard` but unknown routes go to `/today`. |
| Analytics in render | Weekly stats, zones and insights recomputed in every render of several pages. |
| Over-fetching | `GET /api/data` returns **all** activities and **all** daily rows and is polled every 30 s (every 3.5 s while syncing). |
| Free-text timezone input | Settings asks the user to type an IANA timezone. |
| Same icon for running and walking | `SportIcon` uses `Footprints` for both. |
| Dashboard layout only in `localStorage` | Lost across browsers, not part of preferences. |
| Fonts named `font-0.ttf … font-8.ttf` | No way to tell which file is which. |

### 2.2 Product and copy

- Marketing-poster copy instead of information: "Progress is a practice.", "Every session tells a
  story.", "Listen to the bigger picture.", "A little understanding goes a long way." plus an
  ALL-CAPS eyebrow above every heading. It reads as generated filler and hides the actual data.
- Written for data-literate athletes ("Same-weekday distance comparison · v1", "Preceding
  observations' median") — wrong audience. Beginners need explanations, not method strings
  in the main view (method strings move to the evidence dialog).
- Nothing makes the user feel accompanied: no goals journey, no milestones, no reaction to
  their activity, no recap.
- The "Training load" chart is **always empty** for this user: it reads Garmin's
  `activityTrainingLoad`, which the Personal API list payloads in this account do not contain.

### 2.3 Data that is already stored but never used

Verified by aggregate inspection of `.runtime/app.db` (counts only, no personal values):

- **Activities (raw):** `avgGradeAdjustedSpeed`, `maxSpeed`, `elevationLoss`, `min/maxElevation`,
  `steps`, `moderateIntensityMinutes`, `vigorousIntensityMinutes`, `avgStrideLength` (cm),
  `avgGroundContactTime` (ms), `avgVerticalOscillation` (cm), `avgVerticalRatio` (%),
  `maxPower`, `normPower`, `powerTimeInZone_1..5`, `trainingEffectLabel` (e.g. `AEROBIC_BASE`),
  `aerobicTrainingEffectMessage`, `anaerobicTrainingEffectMessage`, `differenceBodyBattery`
  (Body Battery impact), `min/maxTemperature`, `locationName`, `isPR`, `lapCount`,
  `fastestSplit_1000`, `fastestSplit_1609`, `fastestSplit_5000`, `totalSets`, `totalReps`,
  `splitSummaries`.
- **FIT session metrics:** `workout_feel`, `workout_rpe` (the watch's "How did it feel?" prompt).
- **FIT record channels not kept in samples:** `fractional_cadence`, `stance_time`,
  `stance_time_balance`, `step_length`, `vertical_oscillation`, `vertical_ratio`, `temperature`.
- **Daily summary (raw `summary`):** Body Battery `chargedValue`, `drainedValue`, `minValue`,
  `maxValue`, `activityEvents`; heart rate `minValue`, `maxValue`; stress durations
  (rest/low/medium/high, in ms) and `qualifier`; `intensityMinutes.moderate/vigorous/goal`;
  floors; pulse ox `avgValue`/`minValue`; respiration min/max/avg; active calories.
- **Sleep (raw `sleep`):** `awakeCount`, `avgSleepStress`, `avgHeartRate`, SpO2 average/lowest,
  `napTimeSeconds`, `sleepScores.*` sub-scores **including Garmin's own optimal ranges and
  qualifiers**, `sleepNeed.actual/baseline/feedback`, `sleepScoreFeedback`, `restlessness`.
- **HRV (raw `hrv`):** `baseline.balancedLow`, `baseline.balancedUpper`, `baseline.lowUpper`,
  `lastNight5MinHigh`, `feedbackPhrase`.
- **Legacy daily summary:** `dailyStepGoal`, `bodyBatteryAtWakeTime`, `bodyBatteryDuringSleep`,
  `lastSevenDaysAvgRestingHeartRate`.

> ⚠️ **Units gotcha (verified):** FIT `record.cadence` for running is **per leg** (≈85), i.e.
> half of steps per minute. Steps/min = `(cadence + fractional_cadence) × 2`. The Garmin summary
> field `averageRunningCadenceInStepsPerMinute` is already in steps per minute. Cycling cadence
> (rpm) is **not** doubled. Get this wrong and every running cadence chart is off by 2×.

### 2.4 What is good and must be kept

- Security model: CSRF token derived from session, origin and `sec-fetch-site` checks, strict CSP,
  scrypt password hashing, rate limiting, encrypted keys (Fernet), no secrets in logs or errors,
  validation errors that never echo submitted keys. **Keep all of it, keep its tests.**
- Garmin transport (`server/garmin.py` `GarminClient`): documented Personal API only, bounded
  response sizes, retry-on-401 once, 429 cooldown. Keep.
- Worker design: durable jobs, revision checks when a key is replaced, per-domain isolation of
  failures, hourly scheduling. Keep and extend.
- Provenance philosophy (Garmin-reported vs app-calculated vs user-entered), missing data never
  filled in, insights with evidence dialogs, research library with reviewed claims
  (`research/*.json`, `tests/test_research.py`). Keep and extend.
- Local mode (`Start.command`, `OPEN_GARMIN_LOCAL_MODE=1`, `/api/auth/local`). Keep working.
- Existing tests: 31 pytest + 9 vitest, all passing on 2026-11-08. They must keep passing
  (move/adapt them when code moves, never delete a security test).

---

## 3. Target architecture

### 3.1 Big decisions (already made — do not revisit)

1. **All analytics move to Python** (`server/analytics/`). The frontend becomes a view layer that
   formats and draws what the API returns. Reason: one tested implementation; full-resolution
   samples are on the server; demo and live use the same code path.
2. **The demo becomes a server-side synthetic workspace** served at `/api/demo/...` with exactly
   the same response shapes as `/api/...`. The synthetic generator produces **Garmin-shaped raw
   payloads** and runs them through the **same normalizers**, so the demo exercises real code.
   (Consequence: the demo no longer works when the server is offline. That's accepted.)
3. **No database migrations of existing tables.** Only **new** tables are added
   (SQLAlchemy `create_all` creates missing tables, never alters existing ones). New normalized
   fields are re-derived from the stored `raw` JSON and the stored original FIT archives.
4. **Frontend stack:** React 19 + TypeScript (existing), React Router 7 (existing),
   **Tailwind CSS v4** (`@tailwindcss/vite`) with design tokens as CSS variables,
   **Radix UI primitives** for accessible Dialog, Popover, Tooltip, Tabs, Select, Switch,
   DropdownMenu, **TanStack Query v5** for data fetching/caching/polling, **Recharts 3**
   (existing) for charts with `syncId` for synchronised activity charts, `lucide-react`
   (existing) for icons, `clsx` + `tailwind-merge` for class names, `canvas-confetti` for
   celebrations (bundled, no CDN), fonts via **Fontsource** npm packages (bundled, self-hosted).
5. **Map stays tile-free** (privacy, CSP). The SVG route renderer is rebuilt to look great:
   route coloured by pace/HR, km markers, start/finish pins, hover sync with charts, pan/zoom.
6. **No LLM.** Companion messages are deterministic templates filled with real numbers.
7. **No single readiness score number.** "Today's suggestion" is words + reason chips, with the
   full rule table visible in the evidence dialog (Section 8.6).
8. **Dark theme is the default** (Garmin-like). Light theme and "Match system" available.

### 3.2 Backend layout (target)

```
server/
  __init__.py
  app.py                  # THIN shim: `from .main import create_app; app = create_app()`
                          # (Start.command and README import `server.app:app` — keep it working)
  main.py                 # create_app(): middleware, routers, static files, lifespan
  config.py               # env vars in one place (data dir, local mode, cookies, origins…)
  security.py             # origin/CSRF middleware, rate limiter, password hashing, session helpers
  db/
    __init__.py
    models.py             # existing models (moved from storage.py) + NEW tables (Section 7.4)
    store.py              # Store class (moved from storage.py): engine, encryption, archive paths
  garmin/
    __init__.py
    client.py             # GarminClient, GarminError (moved from garmin.py, unchanged logic)
    normalize.py          # normalize_activity_v2, normalize_daily_v2, sleep_values_v2, hrv_values_v2
    fit.py                # parse_original_v2 (FIT/TCX), more channels, cadence fix
  worker.py               # Worker (existing logic) + calls derive.recompute_* after each sync
  derive.py               # re-derivation pipeline: raw → normalized v2 → derived tables
  workspace.py            # Workspace dependency: live user OR demo (Section 3.4)
  demo/
    __init__.py
    generator.py          # deterministic synthetic Garmin-shaped payloads (365 days)
    seed.py               # builds the in-memory demo Store at startup
  analytics/
    __init__.py
    common.py             # dates, rolling windows, medians, safe division, Spearman
    zones.py              # zone minutes, effort points (Edwards), intensity mix
    load.py               # weekly effort, ramp check, acute/chronic (Go deeper)
    activity.py           # per-activity derived: splits, best efforts, efficiency, summary sentence
    efforts.py            # personal bests across activities
    fitness.py            # "signs you're getting fitter"
    today.py              # today's suggestion (rule table)
    sleep.py              # sleep vs need, consistency, stage ranges
    energy.py             # body battery + stress day summaries
    activity_goals.py     # active minutes, steps, sessions vs goals
    relationships.py      # Spearman explorer (Go deeper)
    insights.py           # insight catalog (Section 8.11)
    reports.py            # weekly recap
  companion/
    __init__.py
    messages.py           # message templates + deterministic selection
    milestones.py         # milestone catalog evaluation (Section 9.2)
    streaks.py            # weekly streak (Section 9.1)
    journeys.py           # journey progress (Section 9.3)
    journeys.json         # journey definitions (Appendix D)
  api/
    __init__.py
    auth.py               # /api/session, /api/auth/*
    status.py             # /api/status
    activities.py         # list, detail, streams, notes, details download, FIT import, original
    wellness.py           # /api/wellness/* (NOT /api/health — that is the liveness check)
    progress.py           # /api/progress/*
    today.py              # /api/today
    journey.py            # /api/journey/*, milestones, check-ins
    insights.py           # /api/insights, /api/reports/*, /api/relationships
    settings.py           # preferences, connection, sync, export, delete
```

Rules for backend code:
- Max ~300 lines per file. Pure functions in `analytics/` and `companion/` (input: plain dicts /
  lists; output: plain dicts). **No database access inside `analytics/`**; the API layer loads
  rows and passes them in. This makes every formula unit-testable without a DB.
- Every analytics output dict includes `"method": "<id>@<version>"` and `"source"` (see 7.6).
- Type hints everywhere; `ruff` clean with the config in P1-T2.

### 3.3 Frontend layout (target)

```
src/
  main.tsx                     # mounts <Providers><App/></Providers>
  app/
    App.tsx                    # shell + routes only (<60 lines)
    routes.tsx                 # route table, lazy-loaded pages
    providers.tsx              # QueryClientProvider, Router, Theme, Toasts, Workspace
    workspace.tsx              # WorkspaceContext: 'live' | 'demo', api base prefix, switching
  lib/
    api.ts                     # fetch wrapper (CSRF, errors) + base prefix from workspace
    queries.ts                 # TanStack Query hooks: useToday(), useActivities(), … (one per endpoint)
    types.ts                   # TypeScript types mirroring Section 10 exactly
    format.ts                  # units: distance, pace, speed, duration, elevation, weight, temp
    dates.ts                   # date-key helpers (YYYY-MM-DD strings), week ranges, relative dates
    cn.ts                      # clsx + tailwind-merge helper
    sport.ts                   # sport → label, icon, colour token
  styles/
    index.css                  # @import "tailwindcss"; @theme tokens; base layer
    tokens.css                 # CSS variables for dark + light (Section 4.2)
    fonts.css                  # @fontsource imports
  components/
    ui/                        # Button, IconButton, Card, Badge, SourceBadge, Pill, SegmentedControl,
                               # Tabs, Select, Switch, Dialog, Sheet, Tooltip, Popover, Toast, Skeleton,
                               # EmptyState, ErrorState, Disclosure ("Go deeper"), Kbd, Avatar, ProgressBar
    layout/                    # AppShell, SideNav, BottomTabBar, TopBar, PageHeader, Section, Grid
    data/                      # BigNumber, StatTile, StatGrid, DeltaChip, Explainer (ⓘ popover), MetricRow
    charts/                    # ChartFrame, RingGauge, SegmentGauge, BandLineChart, BarSeries, StackedBars,
                               # Sparkline, ZoneBars, StageBar, WeekDots, CalendarHeatmap, StreamCharts,
                               # ScatterPlot, RouteMap, chartTheme.ts
    companion/                 # Pip (SVG character), CompanionMessage, Celebration, CheckInCard
  features/
    today/                     # TodayPage + cards
    activities/                # ActivitiesPage, ActivityPage, CompareDialog, calendar, filters
    journey/                   # JourneyPage, MilestonesGrid, JourneyPicker, WeeklyRecap (stories)
    health/                    # HealthPage + Sleep, Heart, Energy, Stress, Steps tabs
    progress/                  # ProgressPage + Fitness signals, Bests, GoDeeper sections
    insights/                  # EvidenceDialog, InsightCard, RelationshipsExplorer
    research/                  # ResearchPage (restyled)
    settings/                  # SettingsPage sections
    onboarding/                # first-run flow
    connect/                   # ConnectDialog (key flow + sign-in flow)
    search/                    # CommandPalette (⌘K)
```

Rules for frontend code:
- **Prettier formatting enforced.** No line over 100 chars. Max ~200 lines per component file.
- **No data math in components** beyond unit formatting. If you need a number that the API does
  not provide, add it to the API (Section 10), don't compute it in React.
- **No inline `style={{}}`** except for dynamic values (widths, colours from data). No new global
  CSS classes — use Tailwind utilities and the components in `components/ui`.
- **Every page handles four states:** loading (skeletons shaped like the content), empty
  (friendly EmptyState with Pip), error (ErrorState with "Try again"), and data.
- **Every number shown has a `SourceBadge`** nearby (card-level is enough when all numbers in the
  card share the same source).

### 3.4 Live vs demo workspace (backend)

Implement `server/workspace.py`:

```python
@dataclass(frozen=True)
class Workspace:
    store: Store          # live store or the in-memory demo store
    user_id: str
    mode: Literal["live", "demo"]
    read_only: bool       # True for demo

def workspace(request: Request) -> Workspace:
    if request.url.path.startswith("/api/demo/"):
        return request.app.state.demo_workspace         # built at startup by demo/seed.py
    user = current_user(request)                          # existing auth + CSRF logic
    return Workspace(request.app.state.store, user.id, "live", False)
```

- Read routers are written once and included twice:
  `app.include_router(read_router, prefix="/api")` and
  `app.include_router(read_router, prefix="/api/demo")`. Handlers take
  `ws: Workspace = Depends(workspace)`.
- Mutating routes that make sense in the demo (notes, check-ins, preferences, journey choice,
  milestone seen) are allowed on the demo store **in memory** (they reset on server restart).
  Connection, sync, import, export of originals, delete → return HTTP 403
  `{"detail": "This is the demo. Connect Garmin to use your own data."}` under `/api/demo`.
- Demo store: `Store(directory=<tmp dir>, database_url="sqlite+pysqlite:///:memory:")` with
  `poolclass=StaticPool` so all threads share it. Add a `Store(..., in_memory=True)` option.
  Demo user id: `"demo"`. Seeded once at startup (must take < 3 s; measure in a test).

### 3.5 Live vs demo workspace (frontend)

- `WorkspaceContext` holds `mode: 'live' | 'demo'` (persisted in `localStorage` key
  `og_workspace`, wrapped in try/catch) and exposes `apiBase` = `/api` or `/api/demo`.
- All TanStack Query keys start with the mode: `['demo', 'today']`, `['live', 'today']` so caches
  never mix.
- A clear **"Demo" pill** sits in the top bar while in demo; clicking it opens a popover:
  "You're exploring sample data. [Connect Garmin] [Back to my data]".

---

## 4. Design system: Garmin-inspired, modernized, playful

### 4.1 The visual idea in one paragraph

Think "Garmin Connect's **My Day** screen, redesigned in 2026 by a product team that loves
games": a near-black canvas; rounded cards (20 px radius) stacked in a responsive bento grid; each
card has a small icon + label header, one **big condensed number**, a one-line plain-language
sentence, and a compact visual (ring, segmented bar, sparkline or week dots). Data colours are
bright and saturated on dark (Garmin's HR-zone blue/green/orange/red, sleep blues and purples,
Body Battery cyan). Playfulness comes from the companion **Pip**, goal rings that animate as they
fill, milestone badges, gentle micro-interactions, and celebratory moments — not from clutter.

What to borrow from Garmin (vocabulary, not artwork):
- The **card stack** ("My Day") with per-card chevron to open details.
- **Ring gauges** for 0–100 values (Body Battery, sleep score, stress) and goal rings.
- **Segmented horizontal gauges** with a marker (training effect 0–5, HRV status band, VO2 max).
- **HR zone colours** (grey → blue → green → orange → red) used everywhere zones appear.
- **Sleep stage colours** (deep = dark blue/indigo, light = light blue, REM = purple, awake = pink).
- **Stress colours** (rest = blue, low → high = yellow → orange shades).
- **Activity detail layout**: map on top, stats grid, then stacked charts sharing one x-axis
  with a crosshair, then laps/splits, then zones.
- **Condensed numerals** for data, regular sans for text.

What makes it "more modern" than Garmin:
- Responsive bento grid on desktop instead of a phone column stretched wide.
- Smooth, purposeful motion (rings fill, numbers count up, cards lift on hover) with
  `prefers-reduced-motion` respected.
- Skeleton loading, optimistic UI for notes/check-ins, toasts with undo where possible.
- ⌘K command palette, keyboard shortcuts (`g t` Today, `g a` Activities, `g j` Journey,
  `g h` Health, `g p` Progress, `/` search).
- Plain-language explainers (ⓘ) on every metric — Garmin rarely explains.
- Sticky, translucent top bar (`backdrop-filter: blur(12px)` with solid fallback).
- Generous whitespace, fewer borders, subtle gradients only inside gauges.

### 4.2 Colour tokens (exact values — put these in `src/styles/tokens.css`)

Define tokens as CSS custom properties. Dark is the default on `:root`; light applies when
`<html data-theme="light">`; "system" means the app sets `data-theme` from
`matchMedia('(prefers-color-scheme: dark)')` and listens for changes.

**Surfaces & text**

| Token | Dark (default) | Light | Use |
|---|---|---|---|
| `--bg` | `#0A0C10` | `#F3F5F8` | page background |
| `--surface` | `#13161C` | `#FFFFFF` | cards |
| `--surface-2` | `#1A1E26` | `#F7F8FA` | inner tiles, hover, inputs |
| `--surface-3` | `#232833` | `#EDF0F4` | pressed, selected segment |
| `--border` | `#262B35` | `#E3E7ED` | hairlines |
| `--border-strong` | `#343B47` | `#CDD3DC` | inputs, dividers that must show |
| `--text` | `#F3F5F8` | `#0E1116` | primary text, big numbers |
| `--text-2` | `#A7B0BD` | `#4B5563` | secondary text |
| `--text-3` | `#6B7482` | `#8A93A0` | captions, axis labels (never for body copy) |
| `--accent` | `#2E9BFF` | `#0A7BE0` | primary buttons, links, focus ring, active nav |
| `--accent-strong` | `#1C7FE0` | `#0867BD` | button hover/pressed |
| `--accent-soft` | `rgba(46,155,255,.14)` | `rgba(10,123,224,.10)` | active nav bg, selected chips |
| `--on-accent` | `#FFFFFF` | `#FFFFFF` | text on accent |
| `--success` | `#34D399` | `#059669` | goal reached, positive deltas |
| `--warning` | `#FBBF24` | `#B45309` | "take it easy" states (never "failure") |
| `--danger` | `#F87171` | `#DC2626` | destructive actions only (delete) |
| `--celebrate` | `#FFC83D` | `#D99A00` | milestones, streak flame, confetti |

**Data colours** (same in both themes; when used as text on light theme, use the `-text`
variant listed, which passes WCAG AA 4.5:1 on white)

| Group | Token → value |
|---|---|
| Sports | `--sport-walking #34D399` · `--sport-running #2E9BFF` · `--sport-cycling #FFB020` · `--sport-swimming #22D3EE` · `--sport-strength #A78BFA` · `--sport-hiking #84CC16` · `--sport-other #94A3B8` |
| HR zones | `--z1 #94A3B8` (warm up) · `--z2 #3B82F6` (easy) · `--z3 #22C55E` (aerobic) · `--z4 #F59E0B` (threshold) · `--z5 #EF4444` (maximum) |
| Sleep | `--sleep-deep #4F46E5` · `--sleep-light #60A5FA` · `--sleep-rem #C084FC` · `--sleep-awake #F472B6` |
| Body Battery | `--bb-level #38BDF8` · `--bb-charged #34D399` · `--bb-drained #FB923C` |
| Stress | `--stress-rest #3B82F6` · `--stress-low #FCD34D` · `--stress-medium #FB923C` · `--stress-high #EA580C` |
| HRV status | `--hrv-balanced #22C55E` · `--hrv-unbalanced #F59E0B` · `--hrv-low #EF4444` · `--hrv-none #64748B` |
| Intensity mix | `--mix-easy #38BDF8` · `--mix-moderate #F59E0B` · `--mix-hard #C084FC` |
| Text variants (light theme only) | `--sport-walking-text #047857` · `--sport-running-text #0A6FCC` · `--sport-cycling-text #B45309` · `--z4-text #B45309` · `--z5-text #B91C1C` |

Map Tailwind to tokens in `src/styles/index.css` with Tailwind v4's `@theme` so classes like
`bg-surface`, `text-text-2`, `border-border`, `bg-accent`, `text-z4` work:

```css
@import "tailwindcss";
@import "./tokens.css";
@import "./fonts.css";
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
@theme {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-surface-3: var(--surface-3);
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-text: var(--text);
  --color-text-2: var(--text-2);
  --color-text-3: var(--text-3);
  --color-accent: var(--accent);
  /* …repeat for every token in 4.2… */
  --font-sans: "Inter Variable", ui-sans-serif, system-ui, sans-serif;
  --font-num: "Barlow Semi Condensed", "Inter Variable", ui-sans-serif, sans-serif;
  --radius-card: 20px;
  --radius-tile: 14px;
  --radius-control: 12px;
}
```

**Chart colours must come from tokens**, never hard-coded hex in components. Recharts needs
real colour strings for some props; read them once via
`getComputedStyle(document.documentElement).getPropertyValue('--z2')` in a `useChartTheme()`
hook that re-reads when the theme changes.

### 4.3 Typography

- UI text: **Inter Variable** (`@fontsource-variable/inter`).
- Numbers: **Barlow Semi Condensed** weights 500/600/700 (`@fontsource/barlow-semi-condensed`).
  Always with `font-variant-numeric: tabular-nums`. This gives the Garmin-like "watch data" look.
- Remove the old `public/fonts/font-*.ttf`, `DM Sans`, `Manrope` and `src/fonts.css` in Phase 7.

| Style name | Font | Size / line height | Weight | Use |
|---|---|---|---|---|
| `num-hero` | num | 64/64 | 700 | the one hero number on a page (e.g. week minutes) |
| `num-xl` | num | 44/48 | 700 | card big number |
| `num-lg` | num | 30/34 | 600 | stat tile number |
| `num-md` | num | 20/24 | 600 | table numbers, small tiles |
| `title-1` | sans | 28/34 | 700, tracking -0.02em | page title |
| `title-2` | sans | 20/26 | 650 | section title |
| `title-3` | sans | 16/22 | 600 | card title |
| `body` | sans | 15/22 | 400 | sentences |
| `body-sm` | sans | 13/18 | 400 | secondary |
| `label` | sans | 12/16 | 600, tracking 0.04em, **uppercase** | tile labels ("AVG HR") — Garmin-like |
| `caption` | sans | 12/16 | 400 | footnotes, sources |

Units next to numbers: same font as the number, 45% of its size, `text-text-2`, 2 px gap
(e.g. **42** `min`).

### 4.4 Spacing, radius, elevation, layout grid

- 4 px base. Card padding 20 px (mobile 16 px). Gap between cards 16 px (desktop 20 px).
- Radius: cards 20 px, tiles 14 px, buttons/inputs 12 px, pills/chips full.
- Elevation: dark theme uses **no shadows**, only `--border` hairlines and surface steps.
  Light theme cards: `box-shadow: 0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06)`.
- Desktop layout: left side nav 240 px (collapsible to 72 px icon rail, state saved in prefs),
  content max-width 1280 px, 12-column grid. Card spans are given per page in Section 6.
- Tablet (768–1023 px): icon rail 72 px, 6-column grid.
- Mobile (< 768 px): no side nav; bottom tab bar 64 px + safe-area inset; single column;
  16 px side gutters; no horizontal scroll anywhere (test it).

### 4.5 Motion

- Durations: `--dur-1 120ms` (hover, press), `--dur-2 200ms` (popover, tab), `--dur-3 320ms`
  (dialog, sheet), ring/goal fill `700ms`, number count-up `600ms`.
- Easing: `cubic-bezier(.2,.8,.2,1)` for enter, `cubic-bezier(.4,0,1,1)` for exit.
- Card hover (desktop only): translateY(-2px) + border to `--border-strong`.
- Button press: scale(.97).
- Rings and progress bars animate from 0 on first appearance only (not on every re-render).
- Celebration: confetti burst (canvas-confetti, 120 particles, colours `--celebrate`,
  `--accent`, `--success`, `--sport-strength`) + Pip "cheer" pose. Max once per milestone.
- `@media (prefers-reduced-motion: reduce)`: disable count-up, ring animation, confetti,
  hover lift; keep instant state changes.

### 4.6 Component specifications

Build these in `src/components/` during Phase 4. Each gets a Vitest + Testing Library test for
its key behaviour (render, accessible name, states).

| Component | Spec |
|---|---|
| `Card` | `<section>` with `bg-surface rounded-card p-5 border border-border`. Props: `title`, `icon`, `href` (makes header a link with chevron →), `source` (renders `SourceBadge` in header right), `explainer` (ⓘ popover text), `children`, `footer`. Header row: 20 px icon in a 32 px rounded-full tinted circle (tint = 14% of the card's data colour), title-3, chevron. |
| `SourceBadge` | Tiny pill: `Garmin` (watch icon), `Calculated` (sigma/function icon), `You` (pencil icon), `Sample data` (in demo). Tooltip explains: "Measured by your Garmin watch" / "Calculated by Open Garmin from your data — tap ⓘ to see how" / "Entered by you". |
| `BigNumber` | Props `value`, `unit`, `size: 'hero'|'xl'|'lg'|'md'`, `countUp` (bool). Missing value → em dash `—` in `text-text-3`, never `0`. |
| `StatTile` | Label (uppercase `label` style) above `BigNumber md/lg`, optional `DeltaChip`. Used in grids of 2–4 (Garmin stats grid). |
| `DeltaChip` | `▲ 12%` / `▼ 3 bpm` pill. Colour depends on **meaning**, not direction: prop `good: 'up'|'down'|'neutral'`. Neutral grey when no judgement. Never red for a missed goal. |
| `Explainer` | ⓘ button → Popover with: what it is (1 sentence), why it matters (1 sentence), where it comes from (source), and a "How it's calculated" link that opens the evidence dialog. Copy from Appendix E glossary. |
| `RingGauge` | SVG ring. Props `value`, `max`, `color` (token name), `size` (64/96/160), `thickness`, `label` (center number), `sublabel`, `segments?` (for multi-colour like sleep stages), `goalTick?`. Track = `--surface-3`. Round line caps. Animates stroke-dashoffset once. Accessible: `role="img"` + `aria-label="Body Battery 72 of 100"`. When `value > max` (goal exceeded) draw a second lap ring in `--celebrate` at 40% opacity. |
| `SegmentGauge` | Horizontal bar split into N coloured segments with labels, a ▼ marker at the value, optional shaded "your usual range" band. Used for training effect (0–5, 5 segments), HRV (low / unbalanced / balanced band from Garmin baseline), VO2 max. |
| `WeekDots` | 7 circles Mon→Sun (respect `week_start`). Filled with sport colour if active that day (multiple sports → split circle), outlined if planned rest/future, today has an accent ring. Under each: day letter. |
| `ProgressBar` | Rounded, 8 px, track `--surface-3`, fill colour prop, optional goal marker, animates once. |
| `Sparkline` | 100×32 SVG polyline, no axes, last point dot. Gaps in data break the line (never bridge missing days). |
| `BandLineChart` | Recharts line chart with an optional shaded band (`ReferenceArea` or Area range) for "your usual range" / Garmin HRV balanced band, and dots coloured by status. |
| `BarSeries` | Recharts bar chart; props for stacked series with token colours, goal reference line, highlighted current period, partial-week hatch pattern. |
| `StackedBars` | Daily stacked horizontal bar (stress rest/low/med/high; sleep stages) with legend. |
| `ZoneBars` | 5 horizontal bars Z5→Z1 (Garmin order: highest on top) with zone colour, friendly zone name (Appendix E), minutes, % of time. |
| `StageBar` | Single horizontal bar of sleep stages proportional to time + legend with durations and Garmin optimal-range ticks when available. |
| `CalendarHeatmap` | GitHub-style grid for the last 12 weeks (rows = weekdays). Cell colour intensity by active minutes, using `--accent` at 4 opacity steps. Click → activities on that date. Today outlined. |
| `StreamCharts` | Activity detail: up to 5 stacked Recharts AreaCharts (Pace/Speed, Heart rate, Elevation, Cadence, Power) sharing `syncId="activity"`, same x domain (time or distance), shared crosshair; HR chart background shows zone bands (`ReferenceArea` per zone in zone colour at 8% opacity). Hover emits the sample index to `RouteMap`. Max 1500 points per series (server downsamples with LTTB, Section 7.5). |
| `RouteMap` | SVG, tile-free. Route drawn as segments coloured by selected metric (pace / HR zone / elevation) using a 5-step scale; white casing under the line; start (green) / finish (checkered or accent) pins; km/mi markers every 1 unit; hover marker synced with charts; pan (drag) and zoom (wheel / pinch / +− buttons) by changing `viewBox`; "Reset view" button; caption "Drawn privately — no map service used". Background: `--surface-2` with a subtle 24 px dot grid. |
| `ScatterPlot` | Recharts scatter with optional trend line (server-provided). Used in Go deeper. |
| `EmptyState` | Pip (pose `thinking` or `sleepy`) + title + one friendly sentence + optional action button. |
| `ErrorState` | Pip (pose `oops`) + "Something went wrong loading this" + error message + "Try again". |
| `Skeleton` | Shimmering blocks (`animate-pulse`) matching each card's layout. |
| `Disclosure` | "Go deeper" collapsible: chevron rotates, content lazy-mounted on first open, state remembered per page in `localStorage` (try/catch). |
| `SegmentedControl` | Radix ToggleGroup styled as pill segments (e.g. `7D 4W 3M 1Y`). |
| `Dialog` / `Sheet` | Radix Dialog. On mobile, Dialog renders as a bottom Sheet (slides up, drag handle). |
| `Toast` | Bottom-center on mobile, bottom-right on desktop, 5 s, optional action ("Undo"). |
| `CommandPalette` | ⌘K / Ctrl+K: search activities (server search endpoint), jump to pages, toggle theme, switch demo/live. |

### 4.7 Iconography

- `lucide-react` for everything, plus **one** custom icon: running uses a custom 24×24 SVG
  runner in `src/components/icons/RunIcon.tsx` (simple stick runner, 2 px stroke, round caps,
  `currentColor`, matching lucide's style). Other sports: walking `Footprints`, cycling `Bike`,
  swimming `Waves`, strength `Dumbbell`, hiking `Mountain`, other `Activity`.
- Metric icons: sleep `Moon`, HRV `HeartPulse`, resting HR `Heart`, Body Battery `BatteryMedium`,
  stress `Gauge`, steps `Footprints`, active minutes `Timer`, streak `Flame`, milestone `Award`,
  journey `Map`, check-in `Smile`, effort `Flame`… keep a single mapping in `src/lib/icons.ts`.

---

## 5. The companion ("Pip") and the voice of the app

### 5.1 Who Pip is

Pip is an **original** small companion character: a soft rounded blob (like a pebble/droplet)
in `--accent` blue with two oval eyes and a small mouth, sometimes holding a tiny prop. It is
drawn entirely with inline SVG primitives (ellipses, paths) in `src/components/companion/Pip.tsx`
— no image files, no copied art, not resembling any existing mascot.

Poses (prop `pose`), each a variation of eyes/mouth/arms and a small accessory:

| Pose | Look | Used when |
|---|---|---|
| `wave` | one stubby arm up, smiling | greeting, onboarding |
| `cheer` | both arms up, open smile, little sparkles | milestone, goal reached |
| `proud` | eyes closed happy (^ ^), small medal | personal best, streak up |
| `thinking` | eyes looking up, hand on chin | empty states, "not enough data yet" |
| `sleepy` | half-closed eyes, "z" | sleep cards, rest-day suggestion |
| `calm` | soft smile | default |
| `oops` | small sweat drop | errors |
| `stretch` | leaning to one side | "take it easy" suggestion |

Sizes: 40 px (inline message), 72 px (card), 140 px (celebration / onboarding).
Idle animation: a gentle 4 s "breathing" scale (1 → 1.03), disabled for reduced motion.

User controls (Settings → Companion): **companion on/off** (off hides Pip art but keeps the
friendly messages), **name** (default "Pip", max 20 chars), **tone**: `cheerful` (default,
emojis allowed sparingly) or `calm` (no emojis, fewer exclamation marks).

### 5.2 Where Pip speaks

| Surface | What Pip says | Source |
|---|---|---|
| Today header | Greeting by time of day + the single most relevant observation | `companion/messages.py` → `GET /api/today` |
| Today's suggestion card | Suggestion + reasons | Section 8.6 |
| After a new activity syncs | Reaction: what it did + any PB/milestone ("That was your longest walk yet!") | `activity_reaction` template |
| Empty states | Encouraging explanation of what will appear | static copy |
| Celebration dialog | Milestone text | Appendix C |
| Weekly recap | Story narration | Section 9.5 |
| Check-in | Asks how you feel, responds to the answer | Section 9.4 |

### 5.3 Message engine rules (`server/companion/messages.py`)

- Templates live in a Python dict keyed by message id; each has variants
  (`cheerful`, `calm`) and 2–4 phrasings. Placeholders use `str.format` with **pre-formatted**
  strings (the server formats units using the user's preferences: metric/imperial).
- **Deterministic selection:** `variant_index = int(sha256(f"{user_id}:{date}:{message_id}").hexdigest(), 16) % n`
  so the message is stable all day and changes daily. Never `random`.
- **Priority order for the Today greeting observation** (first applicable wins):
  1. Unseen milestone earned since last visit → celebrate.
  2. Personal best in the last 2 days.
  3. Weekly goal reached this week (first day it's reached).
  4. Check-in said "very tired"/"sore" today → be gentle.
  5. Today's suggestion is `rest` → "Rest is part of getting fitter."
  6. Streak at risk (week ends in ≤ 2 days and goal < 100%) → friendly nudge with the exact
     remaining amount ("20 more minutes keeps your 5-week streak going").
  7. No activity for ≥ 4 days → warm "welcome back" nudge (never guilt).
  8. Default: progress-so-far sentence for the week.
- Every message object returned by the API: `{ "id", "text", "pose", "tone", "data_refs": [...] }`
  where `data_refs` are activity ids/dates so the UI can link to them.

### 5.4 Voice and copy rules (apply to ALL text in the app)

Do:
- Speak like a kind friend who knows a bit about fitness. Short sentences. Second person.
- Lead with the human meaning, then the number: "You slept 7 h 10 m — a bit more than you
  needed." not "Sleep: 7:10 (need 6:55)".
- Celebrate effort and consistency more than speed.
- Frame rest positively ("Recovery day — your body gets fitter while you rest").
- Say "your usual" instead of "baseline"/"median" in main UI (the evidence dialog may say median).
- Use sentence case for titles ("Your week", not "YOUR WEEK" or "Your Week").
- Labels above stat numbers may be uppercase (Garmin style) — only those.

Don't:
- No shaming or loss language: never "You failed", "You missed", "Only", "Just", "Behind",
  "Lazy", "Bad". Use "Not yet", "So far", "Still time".
- No medical claims or diagnoses. Never say a value is "unhealthy" or "dangerous". For unusual
  values say "Different from your usual. If you feel unwell, rest and consider talking to a
  health professional."
- No weight-loss/calorie-burn emphasis (calories can be shown in activity details only).
- No fake precision: round sleep to 5 min, distances to 0.1 km (0.01 for splits), pace to the
  second, percentages to whole numbers.
- No marketing slogans as headings (remove "Progress is a practice." etc.).
- Max one emoji per message, only in `cheerful` tone, only from: 🎉 💪 🌙 🔥 👏 🌱 ⭐.

---

## 6. Information architecture and page specifications

### 6.1 Navigation

Primary destinations (desktop side nav, top to bottom; mobile bottom tabs = first five):

| # | Label | Route | Icon | Purpose |
|---|---|---|---|---|
| 1 | Today | `/` | `Sun` | My Day: companion, suggestion, week ring, key cards |
| 2 | Activities | `/activities` | `ListChecks` | list, calendar, detail, compare |
| 3 | Journey | `/journey` | `Map` | goals, journey programme, streak, milestones, recaps |
| 4 | Health | `/health` (+ `/health/sleep`, `/health/heart`, `/health/energy`, `/health/stress`, `/health/steps`) | `HeartPulse` | wellness signals explained |
| 5 | Progress | `/progress` | `TrendingUp` | signs you're getting fitter, bests, Go deeper |
| — | Settings | `/settings` | `Settings` | bottom of side nav; on mobile in avatar menu |
| — | How it works | `/methods` (research library + methods) | `BookOpen` | bottom of side nav; mobile avatar menu |

Redirects: `/today` → `/`, `/dashboard` → `/`, `/training` → `/progress`, `/recovery` →
`/health`, `/insights` → `/progress`, `/research` → `/methods`. Unknown → `/`.

Top bar (sticky): page title (mobile) / breadcrumb (desktop), search button (⌘K), sync status
chip ("Synced 12 min ago" / spinner "Syncing… 45%" / "Not connected"), demo pill if demo,
avatar menu (Settings, How it works, theme toggle, switch demo/live, sign out if not local mode).

### 6.2 First-run onboarding (`/welcome`, shown when prefs `onboarded` is false)

Full-screen steps with Pip, progress dots, "Back"/"Next", skippable:

1. **Hi, I'm Pip** (pose `wave`): "I'll help you make sense of your watch data and cheer you on."
   Buttons: [Connect my Garmin] [Look around with sample data].
2. **Connect** (if chosen): the key flow (Section 6.10) inline.
3. **What's your main goal?** Cards (single choice): "Move more", "Start running",
   "Build a habit", "Sleep better", "Just curious". Maps to a suggested Journey (Appendix D).
4. **Your weekly goal**: suggested active minutes (Section 8.3 rule) with a slider (30–600 min,
   step 5) and sessions per week (1–7). Text: "Most people start with something that feels
   easy. You can change it any time."
5. **Make it yours**: companion name, tone, theme (Dark / Light / Match system), units.
6. **Done** (pose `cheer`): "First badge unlocked: *Hello there*." → Today.

Persist into preferences (Section 7.4.1). Demo workspace has `onboarded: true` by default but
the onboarding can be replayed from Settings.

### 6.3 Today (`/`)

Purpose: in 5 seconds the user knows how their week is going and what to do today.

Desktop wireframe (12 cols):

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Pip 72px]  Good morning, Alex.                                  Sat, Nov 8   │
│             "That was your longest walk yet — 6.2 km! 🎉"   [see activity →]  │  (col 12)
├───────────────────────────────┬──────────────────────────┬───────────────────┤
│ THIS WEEK            Garmin ⓘ │ TODAY'S SUGGESTION    ⓘ  │ STREAK         ⓘ  │
│  ◯ ring 95 / 150 min          │ [Pip stretch]            │ 🔥 5 weeks        │
│    63% · 2 of 3 sessions      │ "Easy day — a walk or    │ WeekDots M T W…   │
│  WeekDots M T W T F S S       │  gentle ride is perfect" │ "20 more min to   │
│  "55 min to go — you've got   │ chips: [Slept 6h10 <need]│  keep it going"   │
│   4 days."                    │ [HRV balanced] [BB 48]   │                   │
│  (cols 5)                     │  (cols 4)                │  (cols 3)         │
├───────────────┬───────────────┼───────────────┬──────────┴───────────────────┤
│ SLEEP      →  │ BODY BATTERY →│ RESTING HR  → │ CHECK-IN                     │
│ 7h 10m        │ ◯ 72 at wake  │ 52 bpm        │ How are you feeling today?   │
│ StageBar      │ +55 / −38     │ sparkline     │ 😫 😕 😐 🙂 😄                │
│ "a bit more   │ "charged up   │ "steady, your │ Energy ▢▢▢▢▢  Sore? no/some  │
│  than needed" │  well"        │  usual"       │                              │
│ (cols 3)      │ (cols 3)      │ (cols 3)      │ (cols 3)                     │
├───────────────┴───────────────┴───────────────┼──────────────────────────────┤
│ LATEST ACTIVITY                             → │ NEXT MILESTONE               │
│ [mini RouteMap]  Morning walk · Yesterday     │ [badge locked] 50 km total   │
│ 6.2 km · 1h 04m · 98 effort pts               │ ProgressBar 42.3 / 50 km     │
│ "Mostly easy effort — great for building base"│ "7.7 km to go"               │
│ (cols 8)                                      │ (cols 4)                     │
├───────────────────────────────────────────────┴──────────────────────────────┤
│ THINGS I NOTICED   (2–3 InsightCards, horizontal on desktop, stacked mobile) │
└──────────────────────────────────────────────────────────────────────────────┘
```

Mobile order: greeting → This week → Today's suggestion → Check-in → Streak → Latest activity →
Sleep → Body Battery → Resting HR → Next milestone → Things I noticed.

Customisation ("Edit My Day", Garmin-style): button at the bottom opens a Sheet listing cards
with drag handles (use `@dnd-kit/sortable`, keyboard accessible) and show/hide switches.
Saved to preferences `today_layout` (array of card ids). Card ids: `week`, `suggestion`,
`streak`, `sleep`, `body_battery`, `resting_hr`, `checkin`, `latest_activity`,
`next_milestone`, `insights`, `steps`, `stress`, `hrv`, `journey`.

Data: single request `GET /api/today` (Section 10). Polled every 60 s while visible; refetched
when a sync job completes.

Empty state (no data yet, connected): Pip `thinking`: "Your first sync is on its way. Recent
activities arrive first — usually within a minute." with live job progress.

### 6.4 Activities (`/activities`)

**List view (default):**
- Header: title "Activities", summary row of `StatTile`s for the filtered set: Sessions,
  Time, Distance, Effort points.
- Filter bar: search input (debounced 250 ms, server search), sport chips (multi-select, with
  sport colours), date range `SegmentedControl` (4W / 3M / 1Y / All), view toggle
  (List / Calendar). Filters live in URL query params (`?sport=running,walking&range=3M&q=park`).
- Rows grouped by week with a week header ("This week · 3 sessions · 2 h 05 m").
- Row (Garmin "All activities" vibe, more modern): sport icon in sport-colour circle · name +
  relative date ("Yesterday, 7:04") · distance · duration · avg pace/speed (sport-specific) ·
  avg HR · tiny zone bar (5-colour stacked mini bar, 48×6 px) · PB star if a best was set ·
  checkbox (compare mode only). Whole row is a link.
- Infinite scroll with cursor pagination (`limit=50`).
- Compare mode: button "Compare" → checkboxes appear → select 2–4 → sticky tray → Compare dialog
  with side-by-side table + overlaid HR charts (if samples) + "what's different" sentences.

**Calendar view:** month grid; each day shows sport dots and total minutes; click a day → side
panel with that day's activities + that night's sleep. Week totals in a right-hand column.
Current day outlined. Keyboard arrows move between days.

### 6.5 Activity detail (`/activities/:id`)

```
┌─ ← Activities ───────────────────────────────────────────────────────────────┐
│ [sport icon] Morning walk                         [Export ▾] [⋯]             │
│ Saturday, Nov 8 · 07:04 · Garmin Forerunner 165 · Mount Royal               │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Pip proud 40px] "Your longest walk yet, mostly at an easy effort. Nice!"    │
│ chips: ⭐ Longest walk  ·  🏅 Milestone: 50 km total                          │
├────────────────────────────────────────────┬─────────────────────────────────┤
│ RouteMap (colour by: Pace | HR | Elevation)│ StatGrid 2×4 (Garmin style):    │
│  height 360                                │ DISTANCE 6.21 km  TIME 1:04:12  │
│                                            │ AVG PACE 10:20/km AVG HR 112    │
│                                            │ ELEV GAIN 84 m    STEPS 7,912   │
│                                            │ EFFORT PTS 98     CALORIES 312  │
├────────────────────────────────────────────┴─────────────────────────────────┤
│ HOW HARD WAS IT?                                                             │
│ ZoneBars (Z5→Z1, friendly names)      | Garmin training effect:              │
│                                       | SegmentGauge Aerobic 2.4 "Maintaining"│
│                                       | SegmentGauge Anaerobic 0.3 "No effect"│
│                                       | Primary benefit: Base (TE label)     │
│                                       | Body Battery impact: −8              │
├──────────────────────────────────────────────────────────────────────────────┤
│ StreamCharts (time|distance toggle): Pace, Heart rate (zone bands),          │
│ Elevation, Cadence, Power — each 140 px tall, shared crosshair, synced map   │
├──────────────────────────────────────────────────────────────────────────────┤
│ SPLITS (per km/mi, computed)   | LAPS (from the watch)    [tabs]             │
│ table: # · time · pace · HR · elev ± · bar showing pace relative to average  │
├──────────────────────────────────────────────────────────────────────────────┤
│ HOW DID IT FEEL?  (your note)                                                │
│ Feel: 😫 😕 😐 🙂 😄 (watch's "How did you feel" pre-filled if present)       │
│ Effort 1–10 slider with words (watch RPE pre-filled if present)              │
│ Tags (chips, add with Enter) · Note textarea · autosave (debounced 800 ms)   │
├──────────────────────────────────────────────────────────────────────────────┤
│ ▸ Go deeper: efficiency (distance per heartbeat), pace at HR, running form   │
│   (cadence spm, stride, ground contact, vertical oscillation/ratio),         │
│   power zones, best efforts within this activity, all raw FIT session fields │
└──────────────────────────────────────────────────────────────────────────────┘
```

Rules:
- Sport-specific stats: running/walking/hiking show pace (min/km or min/mi); cycling shows
  speed (km/h or mph); swimming shows pace per 100 m; strength shows sets/reps/volume and an
  exercise table instead of map/splits.
- If details are not loaded (`detail_state != 'ready'`): map/charts area shows a card with Pip
  `thinking`: "Want the full picture? I can fetch the detailed file from Garmin." [Fetch details].
- Garmin training effect copy (Garmin's official scale, shown as Garmin-reported):
  0–0.9 "No effect", 1.0–1.9 "Minor", 2.0–2.9 "Maintaining", 3.0–3.9 "Improving",
  4.0–4.9 "Highly improving", 5.0 "Overreaching". Beginner explanation in Explainer.
- `trainingEffectLabel` mapping (Garmin-reported "primary benefit"): `RECOVERY` → Recovery,
  `AEROBIC_BASE` → Base, `TEMPO` → Tempo, `LACTATE_THRESHOLD` → Threshold, `VO2MAX` → VO2 max,
  `ANAEROBIC_CAPACITY` → Anaerobic, `SPRINT` → Sprint; unknown → title-case of the raw value.
- Export menu: JSON (this activity), original file (live only, when available), GPX
  (generated server-side from samples, Section 10).

### 6.6 Journey (`/journey`)

The "accompanied" hub. Sections:

1. **Your journey card** (hero): active journey name, "Week 3 of 8", weekly targets with
   progress bars (minutes, sessions, optional extra), a path visualisation (horizontal winding
   path SVG with 1 node per week: completed nodes filled with ⭐, current pulsing, future grey),
   Pip at the current node. Buttons: [Change journey] [Pause].
   No active journey → JourneyPicker grid of the 5 journeys (Appendix D) with "Start".
2. **Weekly goal**: current goal, suggestion if the auto-suggestion differs
   ("Ready for a little more? Try 165 min next week." [Use it] [Keep 150]).
3. **Streak**: big flame + count, longest streak, last 12 weeks as a row of week pills
   (goal met = filled `--celebrate`, partial = ring showing %, future = outline).
4. **Milestones**: grid of badges (earned in colour with date; locked in greyscale with a
   progress bar and "how to earn"). Filter: All / Earned / Next up. Click → badge detail Sheet.
5. **Weekly recaps**: list of past weeks; each opens the Story viewer (Section 9.5).
6. **Check-in history**: last 30 days mood/energy as a small emoji strip + note list.

### 6.7 Health (`/health` and sub-routes)

Tab bar (sticky under the header): **Overview · Sleep · Heart · Energy · Stress · Steps**.
Every tab has a `SegmentedControl` for range: `7D · 4W · 3M · 1Y` (default 4W) stored in the URL.

- **Overview**: 2-col grid of summary cards (one per tab) with today's/last night's value,
  a sparkline over the selected range, and a one-line sentence; each links to its tab.
- **Sleep**: last night hero (RingGauge sleep score if Garmin supplies it; else duration ring vs
  need) + StageBar with Garmin optimal ranges + stats (duration, need, bedtime, wake time,
  awake count, avg sleep HR, sleep respiration, SpO2 if present); "Your sleep over time" bar
  chart (duration bars coloured by stages stacked, need line overlay); "Bedtime rhythm" chart
  (dots for bed/wake clock times per night with your usual window band, Section 8.7);
  sentences from 8.7; Garmin `sleepScoreFeedback` shown as Garmin-reported text if present.
- **Heart**: resting HR trend (BandLineChart with your usual band), HRV card: last night avg,
  7-day avg, Garmin status (`SegmentGauge` with Garmin baseline band balancedLow–balancedUpper
  when available), HRV chart: weekly avg line + daily dots + shaded Garmin balanced band.
  Beginner explainer: "HRV is the small variation between heartbeats. Higher than *your own*
  usual is generally a sign of being well rested. Don't compare with other people."
- **Energy (Body Battery)**: today ring (latest value) + charged / drained / highest / lowest
  tiles + "at wake" value; range chart: daily high–low as floating bars with charged/drained
  numbers; list of activity impacts (activity name → `differenceBodyBattery`).
- **Stress**: daily StackedBars (rest/low/medium/high minutes) + avg stress line; today's
  breakdown donut; explainer that Garmin stress is estimated from HRV and can be high during
  exercise.
- **Steps**: daily steps bars vs Garmin step goal line (`dailyStepGoal`), weekly average,
  floors, intensity minutes (moderate + 2× vigorous) weekly bars vs Garmin's
  `intensityMinutes.goal`.

All Health charts: missing days are gaps (never zero, never interpolated); tooltips show the date,
value and "No data" for gaps.

### 6.8 Progress (`/progress`)

1. **Signs you're getting fitter** (hero, Section 8.5): up to 4 "signal cards", each with a
   sentence, a mini before/after visual, and status: `improving` (green check), `steady`
   (grey dash), `not enough data yet` (Pip thinking). Never show a "getting worse" alarm;
   a decline is phrased neutrally ("A little higher than a month ago — sleep, stress and
   illness can all do this.").
2. **Your bests** (Section 8.10): tiles for Fastest 1 km / 1 mi / 5 km / 10 km (running),
   Longest run / walk / ride (distance), Longest session (time), Most active week (minutes).
   Each tile: value, date, link to activity, "New!" chip if within 14 days.
3. **Your volume**: weekly active minutes bars for 12 weeks (stacked by sport) with goal line;
   toggle to distance. Current week hatched as partial.
4. **Consistency**: CalendarHeatmap (12 weeks) + "You've been active on X of the last 28 days".
5. **Ramp check** (Section 8.4): this week vs 4-week average gauge with sentence.
6. **▸ Go deeper** (Disclosure, collapsed by default):
   - Effort over time: daily effort points bars + 7-day and 28-day rolling average lines
     (acute vs chronic, Section 8.4.2), ratio line on secondary axis.
   - Intensity mix (4 weeks): stacked bar easy / moderate / hard + sentence (Section 8.2.3).
   - Garmin primary benefit mix: count of sessions by `trainingEffectLabel` (4 weeks).
   - Pace at heart rate (running/walking): ScatterPlot of activity avg pace vs avg HR, coloured
     by month, with trend.
   - Running form trends: cadence (spm), stride length, ground contact time, vertical
     oscillation, vertical ratio — small multiples of `Sparkline`+value, with explainers.
   - 5K estimate (Section 8.10.3), clearly labelled "estimate".
   - Relationships explorer (Section 8.12).
   - Garmin VO2 max trend if any activity reports `vo2max` (hidden otherwise).

### 6.9 How it works (`/methods`)

- Top: friendly explanation of sources (Garmin / Calculated / You) with the three badges.
- "How each number is calculated": accordion generated from `GET /api/methods` (method id,
  version, plain explanation, formula in monospace, inputs, minimum data requirements).
- Research library (existing `research-page.tsx` content, restyled with Cards, search, filter).
- Disclaimer: not affiliated with Garmin; not medical advice.

### 6.10 Settings (`/settings`)

Left sub-nav on desktop (Tabs on mobile): **Profile & goals · Companion · Heart rate zones ·
Units & time · Appearance · Garmin connection · Your data · About**.

- Profile & goals: display name, weekly active-minutes goal, sessions/week goal, primary sport,
  daily steps goal source (Garmin / custom number).
- Companion: on/off, name, tone, replay onboarding, reset dismissed tips.
- Heart rate zones: source `Garmin (from your watch)` (default; uses per-activity Garmin zone
  times) or `Custom` (max HR input; default suggestion = highest max HR seen in the last 365
  days; zones as % of max HR 50/60/70/80/90). Shows the zone table with friendly names.
- Units & time: metric/imperial; week starts Mon/Sun; timezone **searchable Select** built from
  `Intl.supportedValuesOf('timeZone')` with the browser's zone suggested first.
- Appearance: Dark / Light / Match system (visual previews); reduce motion (app-level override).
- Garmin connection: status, last checked, newest data date, key expiry reminder text,
  [Replace key] [Import last 90 days] [Import last year] [Disconnect]. Connect dialog =
  existing 3-step key flow, restyled, with Pip.
- Your data: exports (JSON archive, CSV activities, GPX per activity in activity page), delete
  imported data, delete workspace (danger zone, typed confirmation "DELETE").
- About: version, licence, not-affiliated disclaimer, link to How it works.

---

## 7. Data layer changes (backend)

### 7.1 Safety first

Phase 0 copies `.runtime/` to `.runtime-backup-20261108/` (`cp -Rp`). All re-derivation code is
**idempotent** and only writes to new tables or to the `data` JSON of existing rows after
building the new dict fully in memory. Never touch `raw` columns, the `encryption.key`, the
`connections` table (except as the existing worker already does), or `originals/` files.

### 7.2 Normalizer v2 (`server/garmin/normalize.py`)

Keep every existing output key with the same meaning (existing tests depend on them). **Add**:

Activity (`normalize_activity_v2(raw) -> dict`), from raw list/detail payloads
(read from `summaryDTO` first, then top level — same as now):

| New key | Raw source | Unit / note |
|---|---|---|
| `max_speed` | `maxSpeed` | m/s |
| `gap_speed` | `avgGradeAdjustedSpeed` | m/s |
| `elevation_loss`, `min_elevation`, `max_elevation` | `elevationLoss`, `minElevation`, `maxElevation` | m |
| `steps` | `steps` | count |
| `intensity_minutes_moderate`, `intensity_minutes_vigorous` | `moderateIntensityMinutes`, `vigorousIntensityMinutes` | min |
| `cadence_spm` | `averageRunningCadenceInStepsPerMinute` (running/walking only) | steps/min |
| `cadence_rpm` | `averageBikeCadence` / `averageBikingCadenceInRevPerMinute` (cycling) | rpm |
| `stride_length_m` | `avgStrideLength` ÷ 100 | raw is cm (verified range ~80–110) |
| `ground_contact_ms` | `avgGroundContactTime` | ms |
| `vertical_oscillation_cm` | `avgVerticalOscillation` | cm |
| `vertical_ratio_pct` | `avgVerticalRatio` | % |
| `max_power`, `normalized_power` | `maxPower`, `normPower` | W |
| `power_zones` | `powerTimeInZone_1..5` | seconds, list of 5 (None where missing) |
| `te_label` | `trainingEffectLabel` | string or None |
| `te_aerobic_message`, `te_anaerobic_message` | `aerobicTrainingEffectMessage`, `anaerobicTrainingEffectMessage` | Garmin message keys, keep raw |
| `body_battery_impact` | `differenceBodyBattery` | points (negative = drained) |
| `temperature_min`, `temperature_max` | `minTemperature`, `maxTemperature` | °C |
| `location_name` | `locationName` | string |
| `is_pr` | `isPR` / `pr` | bool |
| `lap_count` | `lapCount` | int |
| `garmin_fastest_splits` | `fastestSplit_1000`, `fastestSplit_1609`, `fastestSplit_5000` | `{ "1000": s, "1609": s, "5000": s }` seconds, only present keys |
| `total_sets`, `total_reps` | `totalSets`, `totalReps` | int |
| `normalizer_version` | constant `2` | |

**Privacy:** never copy `ownerFullName`, `ownerDisplayName`, profile image URLs, `ownerId`,
`userProfileId` into normalized data or API responses.

Daily (`normalize_daily_v2(raw_by_domain: dict) -> dict`) — build from **all** stored domains
of a day (`raw["summary"]`, `raw["sleep"]`, `raw["hrv"]`, `raw["summary_legacy"]`), so it can
be re-run offline. Keep existing keys; add:

| New key | Raw source |
|---|---|
| `hr_min`, `hr_max` | `summary.heartRate.minValue/maxValue` |
| `bb_charged`, `bb_drained`, `bb_min`, `bb_max`, `bb_latest` | `summary.bodyBattery.chargedValue/drainedValue/minValue/maxValue/latestValue` |
| `bb_at_wake` | `summary_legacy.bodyBatteryAtWakeTime` (if present) |
| `bb_events` | `summary.bodyBattery.activityEvents` → list of `{type, start_local, duration_s, impact}` (keep only those keys; inspect shape first, skip unknown shapes) |
| `stress_rest_s`, `stress_low_s`, `stress_medium_s`, `stress_high_s` | `summary.stress.*DurationInMillis` ÷ 1000 |
| `stress_qualifier` | `summary.stress.qualifier` |
| `stress_max` | `summary.stress.maxLevel` |
| `intensity_moderate`, `intensity_vigorous`, `intensity_goal` | `summary.intensityMinutes.moderate/vigorous/goal` |
| `floors_up`, `floors_down` | `summary.movement.floorsAscended/floorsDescended` |
| `steps_goal` | `summary_legacy.dailyStepGoal` (if present; else None) |
| `spo2_avg`, `spo2_min` | `summary.pulseOx.avgValue/minValue` |
| `respiration_min`, `respiration_max` | `summary.respiration.minValue/maxValue` |
| `active_calories` | `summary.calories.burnedActive` |
| `sleep_awake_count` | `sleep.awakeCount` |
| `sleep_avg_hr` | `sleep.avgHeartRate` |
| `sleep_avg_stress` | `sleep.avgSleepStress` |
| `sleep_spo2_avg`, `sleep_spo2_min` | `sleep.averageSpO2Value`, `sleep.lowestSpO2Value` |
| `nap_seconds` | `sleep.napTimeSeconds` |
| `sleep_need_baseline` | `sleep.sleepNeed.baseline` |
| `sleep_feedback` | `sleep.sleepScoreFeedback` (Garmin key string) |
| `sleep_subscores` | from `sleep.sleepScores.*`: dict of `{name: {value, qualifier, optimal_start, optimal_end}}` for keys present (e.g. `deepPercentage`, `remPercentage`, `lightPercentage`, `awakeCount`, `restlessness`, `stress`, `totalDuration`). Inspect the actual dict keys (`value`, `qualifierKey`, `optimalStart`, `optimalEnd`) by printing **key names only** for one day, then map. |
| `hrv_5min_high` | `hrv.lastNight5MinHigh` |
| `hrv_balanced_low`, `hrv_balanced_high`, `hrv_low_upper` | `hrv.baseline.balancedLow/balancedUpper/lowUpper` |
| `hrv_feedback` | `hrv.feedbackPhrase` |
| `rhr_7d_avg` | `summary_legacy.lastSevenDaysAvgRestingHeartRate` |
| `normalizer_version` | `2` |

> **Important units note on sleep_need:** the existing code stores `sleep_need` from
> `sleepNeed.actual`. Verify its unit by checking the aggregate range (minutes will be ~400–600;
> seconds would be ~25,000+). Store `sleep_need_minutes` explicitly in v2.

### 7.3 FIT parser v2 (`server/garmin/fit.py`)

Keep `parse_original` behaviour and limits; return additionally per sample:

- `cadence_spm` for running/walking/hiking = `(cadence + (fractional_cadence or 0)) * 2`;
  `cadence_rpm` for cycling = `cadence`; keep `cadence` raw for backward compatibility.
- `gct` = `stance_time` (ms), `vo` = `vertical_oscillation` (convert to cm: fitdecode gives mm
  for this field → ÷ 10; verify with the aggregate range ~6–12 cm), `vr` = `vertical_ratio` (%),
  `step_len` = `step_length` (mm → m ÷ 1000; verify range ~0.6–1.6 m), `temp` = `temperature` (°C).
- Session: `workout_feel` (0–100 in FIT; map to 5 faces: 0, 25, 50, 75, 100) and `workout_rpe`
  (FIT stores 0–100 in steps of 10 → RPE = value / 10) into `watch_feel` and `watch_rpe`.
  Verify by printing the distinct values (not personal identifiers).
- Sport detection: the session's `sport`+`sub_sport` mapped by the existing `sport_name`, plus
  `hiking` → new sport `hiking` (currently merged into walking). Add `hiking` to the Sport type.
- `parser_version: 2`.

Because sample JSON now has more keys, display downsampling happens in the API (7.5), not in
the stored JSON.

### 7.4 New tables (`server/db/models.py`)

All keyed by `user_id` with `ondelete="CASCADE"` on the user FK, created by `create_all`.

```python
class ActivityDerived(Base):            # recomputable per-activity analytics
    __tablename__ = "activity_derived"
    user_id   = PK str(64), FK users.id cascade
    activity_id = PK str(80)
    version   = int                      # ANALYTICS_VERSION when computed
    data      = JSON                     # see 8.9 output: effort_points, zone_minutes, splits,
                                         # best_efforts, efficiency, summary_sentence, …

class BestEffort(Base):
    __tablename__ = "best_efforts"
    user_id, activity_id, kind (str: "distance:1000" | "distance:5000" | "longest:distance" …) = PK
    date      = str(10), index
    sport     = str(20)
    value     = float                    # seconds for distance efforts; metres/seconds for longest
    source    = str(20)                  # "calculated" | "garmin"
    start_offset_s = float | None

class CheckIn(Base):
    __tablename__ = "checkins"
    user_id PK, date PK str(10)
    mood      = int | None  (1..5)
    energy    = int | None  (1..5)
    soreness  = int | None  (0 none, 1 some, 2 a lot)
    note      = Text default ""
    created_at, updated_at = str(40)

class MilestoneAward(Base):
    __tablename__ = "milestone_awards"
    user_id PK, milestone_id PK str(60)
    earned_on = str(10)                  # local date it was achieved
    activity_id = str(80) | None
    value     = float | None
    seen      = bool default False       # celebration shown?

class WeeklyRecap(Base):
    __tablename__ = "weekly_recaps"
    user_id PK, week_start PK str(10)
    version   = int
    data      = JSON                     # Section 9.5
    seen      = bool default False
```

#### 7.4.1 Preferences v2 (stored in existing `users.preferences` JSON — no migration)

Extend `DEFAULT_PREFS` and the Pydantic `Preferences` model (all optional with defaults; unknown
keys rejected; validate each):

```json
{
  "units": "metric", "timezone": "America/Toronto", "week_start": "monday",
  "weekly_distance": 40000, "weekly_minutes": 150, "weekly_sessions": 3,
  "primary_sport": "walking",
  "theme": "dark",                         // "dark" | "light" | "system"
  "reduce_motion": false,
  "onboarded": false,
  "goal_focus": "move_more",               // move_more | start_running | build_habit | sleep_better | curious
  "companion_enabled": true, "companion_name": "Pip", "companion_tone": "cheerful",
  "zone_source": "garmin", "max_hr": null,  // max_hr int 120..230 when zone_source = "custom"
  "steps_goal_source": "garmin", "steps_goal": 8000,
  "today_layout": ["week","suggestion","streak","checkin","latest_activity","sleep","body_battery","resting_hr","next_milestone","insights"],
  "nav_collapsed": false,
  "journey": null                          // {"id": "move_more_8w", "started": "2026-11-03", "paused": false}
}
```

Existing users: their stored prefs are merged over defaults (as now), so they get the new keys
automatically. Their existing `theme: "light"` stays light; that's fine. Keep `weekly_minutes`
semantics but its meaning becomes "weekly active minutes goal".

### 7.5 API-side downsampling (LTTB)

`server/analytics/common.py: lttb(points: list[tuple[float, float]], threshold: int)`.
Implement Largest-Triangle-Three-Buckets (standard algorithm). For activity streams pick the
index set from the **heart-rate** channel if present, else speed, else distance; then return all
channels at those indexes so charts stay aligned. Threshold 1500. Unit test: 10,000-point sine
→ 1500 points, first and last preserved, max and min of the sine preserved within 1%.

### 7.6 Provenance on every value

Every analytics response value that the UI shows is either a bare number whose source is
declared at the object level, or an object `{ "value": 52, "source": "garmin" | "calculated" |
"user", "method": "rhr_trend@1" }`. Rules:
- Straight Garmin fields → `garmin`.
- Anything aggregated by the app (sums over a week, medians, best efforts computed from samples,
  effort points, ramp, suggestion) → `calculated` + `method`.
- Notes, check-ins, RPE typed by the user → `user`. Watch "How did you feel" → `garmin`.

### 7.7 Re-derivation pipeline (`server/derive.py`)

```python
NORMALIZER_VERSION = 2
ANALYTICS_VERSION = 1   # bump when any formula in analytics/ changes

def rederive_user(store, user_id) -> None:
    # 1. For each Activity row whose data.normalizer_version != 2:
    #      new = {**row.data, **normalize_activity_v2(row.raw)} but KEEP existing detail keys
    #      (samples summary, laps, sets, events, session_metrics, detail_state, detail_error,
    #       sample_count, sample_resolution) exactly like worker.sync does today.
    # 2. For each activity with details_loaded and parser_version != 2 and an archive on disk:
    #      re-parse the original with parse_original_v2, update ActivitySamples.samples and
    #      laps/sets/session_metrics/watch_feel/watch_rpe in row.data. Catch exceptions per
    #      activity (one bad file never stops the loop).
    # 3. For each Daily row with data.normalizer_version != 2:
    #      row.data = {**row.data, **normalize_daily_v2(row.raw)}  (raw is keyed by domain)
    # 4. Recompute activity_derived for rows whose version != ANALYTICS_VERSION.
    # 5. Recompute best_efforts (delete user's rows, insert fresh) — cheap.
    # 6. Evaluate milestones (insert newly earned awards; never delete existing awards).
    # 7. Recompute weekly_recaps for completed weeks missing or with old version.
```

When it runs:
- At startup in a **background thread** (not blocking requests) for every user, after
  `Store()` creation. Log nothing personal. Expose progress via `/api/status`
  (`"rederive": {"state": "running", "progress": 40}`).
- After each successful sync job (only for affected activities/days + steps 5–7).
- The existing inline-samples upgrade in `Store.__init__` moves into this pipeline.

Test with a copy of real-shaped fixtures (Section 12), never against `.runtime/` in tests.

### 7.8 Sync changes (`server/worker.py`)

- Use `normalize_activity_v2`, `normalize_daily_v2`, `parse_original_v2`.
- Download details for the **10** newest activities without details per sync (was 3), still
  isolated per file.
- After success call `derive.after_sync(user_id, activity_ids, dates)`.
- When a new milestone is awarded during sync, it is stored unseen; the frontend shows it next
  time Today loads.
- Keep the 1–366 day range; Settings offers "Import last year" (`days=365`). Progress messages
  stay friendly ("Bringing in your sleep…").

### 7.9 Search

`GET /api/activities?q=` does case-insensitive matching on name, sport label, location name and
date string (`YYYY-MM-DD`, "nov 8"). SQLite: load the user's activity summaries (they are small)
and filter in Python; fine up to ~10k activities.

---

## 8. Analytics specification (formulas, thresholds, tests)

General rules for every function in `server/analytics/`:
- Inputs: lists of plain dicts (normalized activity `data`, daily `data`), prefs dict, `today`
  (`date` in the user's timezone). Output: plain dicts, JSON-serialisable, no NaN/inf.
- Missing values are `None`. Never treat missing as zero in averages. Sums over activities treat
  a missing duration as "excluded" and report coverage counts.
- Multisport children (`parent_id` set) are excluded from totals (count the parent once),
  exactly as `topLevel()` does today.
- Each output includes `method` id with version and, where relevant, `n` (number of
  observations used) and `window` (`{from, to}`).
- Each function gets pytest unit tests with hand-computed expected values (examples below).

### 8.1 Dates & weeks (`common.py`)

- `week_start(d, start='monday')` exactly as the TS version (tests: `2026-11-01` monday →
  `2026-10-26`; sunday → `2026-11-01`). Port the existing TS tests to pytest.
- `local_today(prefs)` uses `ZoneInfo(prefs["timezone"])`.
- `daterange(a, b)` inclusive.
- Rolling median helper ignoring None; require `min_n`.
- `spearman(xs, ys)` with average ranks for ties; returns `None` if n < 3 or zero variance.

### 8.2 Zones, effort points, intensity mix (`zones.py`)

#### 8.2.1 Zone minutes per activity
- If `zone_source == "garmin"` and activity `zones` (Garmin `hrTimeInZone_1..5`, seconds) has
  any non-None value → use them (source `garmin`).
- Else if samples with HR exist and `max_hr` is known (custom, or estimated = max of activity
  `max_hr` over last 365 days, minimum 5 activities) → compute zone seconds from samples:
  for consecutive samples `i, i+1`, `dt = min(t[i+1]-t[i], 10)` seconds (cap gaps at 10 s so
  pauses don't count), zone by `hr[i] / max_hr`: Z1 [0.50,0.60), Z2 [0.60,0.70), Z3 [0.70,0.80),
  Z4 [0.80,0.90), Z5 ≥ 0.90; below 0.50 → not counted. Source `calculated`, method
  `zones_from_samples@1`.
- Else → `None` (activity excluded from zone-based stats; coverage reported).

Test: samples at t=0,5,10,15 with HR 100,130,150,170 and max_hr 190 → ratios .526 (Z1), .684
(Z2), .789 (Z3), .895 (Z4 for the last point but it has no following interval) → Z1 5 s, Z2 5 s,
Z3 5 s, Z4 0 s.

#### 8.2.2 Effort points (app-calculated activity load) — method `effort_points@1`
Edwards' summated heart-rate-zone score:
`effort_points = Σ_{i=1..5} zone_minutes_i × i`, rounded to integer.
Example: Z1 10 min, Z2 30 min, Z3 5 min → 10×1 + 30×2 + 5×3 = 85.
If zones are `None` → `effort_points = None`. Do **not** substitute Garmin's
`activityTrainingLoad` into this; if Garmin's load exists show it separately as
"Garmin activity load" (Go deeper only).
Beginner name: **"Effort points"**. Explainer: "Minutes in each heart-rate zone, with harder
zones counting more (zone 1 × 1 … zone 5 × 5). A relaxed 30-minute walk is often 30–60 points."

#### 8.2.3 Intensity mix (4 weeks) — method `intensity_mix@1`
Over the last 28 days: `easy = Z1+Z2`, `moderate = Z3`, `hard = Z4+Z5` (minutes); percentages
of the total. Sentence rules:
- `easy ≥ 70%` → "Mostly easy — that's how fitness is built for most people."
- `hard ≥ 30%` → "Lots of hard minutes lately. Mixing in easy days helps you recover."
- else → "A mix of easy and moderate effort."
- total < 60 min → "Not enough zone data yet."

### 8.3 Activity goals (`activity_goals.py`)

#### 8.3.1 Weekly active minutes — method `active_minutes@1`
Primary: sum over the week of daily Garmin intensity minutes `intensity_moderate + 2 ×
intensity_vigorous` (this is Garmin's own definition; source `garmin` for the daily values,
`calculated` for the weekly sum). Fallback if a day has no intensity data: sum of that day's
top-level activity durations in minutes. Report `days_with_garmin_intensity` and
`days_fallback`.
> If the user's `weekly_minutes` goal was set by the user, use it; else default to Garmin's
> `intensity_goal` from the most recent day that has it; else 150.

Output for the current week: `{minutes, goal, pct, sessions, sessions_goal, remaining_minutes,
days_left, by_day: [{date, minutes, sports: [...]}], method}`.

#### 8.3.2 Goal suggestion — method `goal_suggestion@1`
- Take the last 4 **complete** weeks' active minutes (`m1..m4`), ignoring weeks before the first
  week with any data.
- If fewer than 2 such weeks → suggestion = 90 min (start_running/move_more) or the user's
  current goal (other focuses).
- `base = median(weeks)`; `suggested = round_to_5(base × 1.10)`; clamp to
  `[max(30, current_goal − 30), current_goal + 30]`; never above 600.
- Show the suggestion only if |suggested − current_goal| ≥ 10 and the user met the goal in
  ≥ 3 of the last 4 weeks (to suggest up) **or** met it in ≤ 1 of the last 4 weeks (to suggest
  down — phrased "Want a goal that fits your weeks better? Try 120 min.").
Tests: weeks [100,120,130,140], goal 120 → median 125 → 137.5 → round_to_5 = 140 (round half
up) → clamp [90,150] → 140; met goal in 3 weeks → suggest 140.

#### 8.3.3 Steps
Daily steps vs goal (`steps_goal` per prefs source); weekly average; "days at goal this week".

### 8.4 Ramp check and effort trend (`load.py`)

#### 8.4.1 Ramp check (beginner) — method `ramp_check@1`
- `this_week` = effort points so far this week, **scaled to a full week only if ≥ 4 days have
  elapsed**: `projected = this_week / days_elapsed × 7`; if fewer than 4 days elapsed, compare
  unscaled `this_week` against the same number of days from the average (`avg4 / 7 × days`).
- `avg4` = mean effort points of the 4 previous complete weeks (need ≥ 3 weeks with data).
- `ratio = comparable_this_week / comparable_avg`.
- Bands and sentences:
  - `ratio < 0.6` → `lighter` "A lighter week than usual — totally fine, especially if you
    needed rest."
  - `0.6 ≤ ratio ≤ 1.3` → `steady` "Right around your usual. Nice and steady."
  - `1.3 < ratio ≤ 1.6` → `building` "A bigger week than usual. Build gradually and keep some
    easy days."
  - `ratio > 1.6` → `big_jump` "Quite a jump from your usual! Your body likes gradual
    increases — consider an easy day."
  - insufficient history → `building_history` "I need about 3 weeks of activities to compare."
- Gauge: SegmentGauge with 4 segments (lighter / steady / building / big jump), marker at ratio.
Test: avg4 = 400, days_elapsed = 7, this_week = 560 → 1.4 → building.

#### 8.4.2 Effort over time (Go deeper) — method `effort_trend@1`
Daily series for the selected range (+ 28-day warm-up): `effort` (daily sum),
`acute` = trailing 7-day mean of daily effort, `chronic` = trailing 28-day mean,
`ratio = acute / chronic` (None if chronic < 5 or fewer than 21 days of history).
Simple rolling means (not EWMA) — easier to explain. Caption: "Compares your last week with your
last month. It describes your training; it does not predict injuries."

### 8.5 Signs you're getting fitter (`fitness.py`)

Return up to 4 signals, each `{id, status: improving|steady|declining|insufficient, sentence,
before, after, unit, n_before, n_after, method}`. The UI never uses red for `declining`.

1. **Resting heart rate** — `rhr_trend@1`: `after` = median `resting_hr` over the last 14 days
   (need ≥ 10 values); `before` = median over days −56…−43 (need ≥ 10). `diff = after − before`.
   `diff ≤ −2` → improving: "Your resting heart rate is {abs} bpm lower than six weeks ago. A
   lower resting heart rate often comes with better fitness." `|diff| < 2` → steady.
   `diff ≥ 2` → declining: "A little higher than six weeks ago — sleep, stress, heat or a cold
   can do this too."
   (If a reviewed research claim exists for RHR & fitness, link it; otherwise the sentence uses
   "often" and no citation. Do **not** add claims to `research/claims.json` without a review
   entry — see 13.)
2. **More distance per heartbeat** (efficiency) — `efficiency_trend@1`: for the user's most
   frequent of running/walking in the last 8 weeks, per activity with duration ≥ 15 min, avg
   HR present, distance present: `ef = (gap_speed or average_speed) × 60 / average_hr`
   (metres per heartbeat). `after` = median EF last 28 days (≥ 3 activities), `before` = median
   EF days −56…−29 (≥ 3). `pct = (after/before − 1) × 100`. `pct ≥ 3` → improving: "You're
   covering {pct}% more ground per heartbeat than a month ago — your heart is getting more
   efficient." `|pct| < 3` → steady. `≤ −3` → declining (neutral sentence about heat, hills,
   fatigue).
3. **Going longer** — `longest_trend@1`: longest single activity duration (top-level, any sport)
   in the last 28 days vs the 28 days before. +10% → improving: "Your longest session grew from
   {before} to {after}."
4. **Garmin VO2 max** (only if ≥ 2 activities report `vo2max` 28+ days apart): latest vs value
   ~4–8 weeks earlier; ≥ +1 → improving. Source `garmin`.
5. **Consistency** (fallback if fewer than 2 of the above have data): active days in last 28 vs
   previous 28.

Test fixture for #2: before EFs [1.20,1.22,1.18] median 1.20, after [1.26,1.25,1.27] median
1.26 → +5% → improving.

### 8.6 Today's suggestion (`today.py`) — method `today_suggestion@1`

Inputs (each may be missing): last night `sleep_seconds` and `sleep_need_minutes`, Garmin
`hrv_status` (`BALANCED`, `UNBALANCED`, `LOW`, `POOR`, None), `bb_at_wake` (or latest
`body_battery` before 10:00 if available, else `bb_max` of today), today's `resting_hr` vs
median of the previous 28 days (≥ 14 values), today's check-in (`energy`, `soreness`), and
yesterday's effort points vs the user's 75th percentile daily effort (last 28 days).

Each input becomes a **signal** with a state:

| Signal | `good` | `ok` | `low` |
|---|---|---|---|
| Sleep | ≥ need − 15 min (or ≥ 7 h if need missing) | need − 60 … need − 15 | < need − 60 (or < 6 h) |
| HRV status (Garmin) | BALANCED | UNBALANCED | LOW / POOR |
| Body Battery at wake | ≥ 60 | 35–59 | < 35 |
| Resting HR | ≤ usual + 2 | usual + 3 … +5 | ≥ usual + 6 |
| Check-in energy | 4–5 | 3 | 1–2 |
| Check-in soreness | none | some | a lot |
| Yesterday's effort | ≤ p75 | — | > p75 × 1.5 (hard day) |

Decision (first match):
1. `soreness == a lot` or ≥ 2 signals `low` → **`rest`**: title "Rest-friendly day", text "Your
   body's asking for a break. A gentle walk or stretching is plenty — rest is when you get
   fitter." Pip `sleepy`.
2. exactly 1 `low` or ≥ 3 `ok` → **`easy`**: "Easy day", "Keep it light today: an easy walk, ride
   or a relaxed jog where you can still chat." Pip `stretch`.
3. otherwise, with ≥ 2 inputs available → **`go`**: "Good day to move", "You look ready. If you
   feel like it, today's a nice day for your planned session — or try a little longer than
   usual." Pip `cheer`.
4. fewer than 2 inputs → **`unknown`**: "No strong signals today", "Go with how you feel. Wearing
   your watch overnight helps me give better suggestions." Pip `thinking`.

Response includes `signals: [{id, label, state, value_text, source}]` rendered as chips (good =
green dot, ok = amber dot, low = blue dot — **blue, not red**, to avoid alarm), and
`rules_version`. Always show the footnote: "A suggestion based on your data, not medical advice."
Tests: one per branch, including missing inputs.

### 8.7 Sleep (`sleep.py`)

- `sleep_vs_need@1`: per night `diff_min = sleep_minutes − need_minutes`. Sentence for last
  night: `≥ −15` "You got about what you needed." / `> 15` "a bit more than you needed." /
  `−60 … −15` "a little less than you needed." / `< −60` "quite a bit less than you needed —
  an early night could help." (no shaming).
- `sleep_debt_7d@1`: `Σ max(0, need − sleep)` over last 7 nights with data; shown as "About
  {h} h short this week" only if ≥ 60 min; else "You're well rested this week."
- `bedtime_rhythm@1`: from `sleep_start`/`sleep_end` (local timestamps in ms or ISO — handle both,
  current data stores numbers): convert to minutes after 18:00 (so 23:30 = 330, 01:00 = 420) to
  avoid midnight wrap. `usual_bed` = median of last 14 nights (≥ 7), `spread` = median absolute
  deviation. Band = usual ± max(30, spread). Sentence: ≥ 5 of last 7 nights within band →
  "Your bedtime has been nice and regular." else "Your bedtimes moved around this week. A
  steadier rhythm often helps sleep."
- `stage_ranges@1`: percentages of deep/light/REM/awake of total; if Garmin `sleep_subscores`
  provides `optimal_start/optimal_end` for a stage, mark in/out of range (source `garmin`). Never
  invent optimal ranges.

### 8.8 Energy & stress (`energy.py`)

- Body Battery day: `{latest, at_wake, high, low, charged, drained, events}` straight from
  Garmin. Sentence: charged ≥ drained → "You recharged more than you used — nice." else "A
  draining day — make some room to recharge tonight."
- Stress day: minutes in rest/low/medium/high, percentage of measured time, Garmin
  `stress_qualifier` mapped to friendly words (`calm`, `balanced`, `stressful`, `very_stressful`
  → "Calm day", "Balanced day", "A stressful day", "A very stressful day"; unknown → title-case).
- Activity impacts list: activities of the day with `body_battery_impact`.

### 8.9 Per-activity derived (`activity.py`) — stored in `activity_derived.data`

```json
{
  "effort_points": 98, "zone_minutes": [10.2, 30.5, 5.1, 0, 0], "zone_source": "garmin",
  "intensity": "easy",                 // dominant of easy/moderate/hard by minutes
  "splits": [{"index":1,"distance_m":1000,"time_s":372.1,"pace_s_per_km":372.1,
              "avg_hr":118,"elev_gain_m":4.2,"elev_loss_m":1.0,"cadence_spm":152,"partial":false}],
  "best_efforts": {"distance:1000": {"time_s": 340.2, "start_offset_s": 1210.0}},
  "efficiency": {"ef": 1.24, "decoupling_pct": 3.1},  // decoupling only if ≥ 40 min steady
  "summary": {"text": "Your longest walk yet, mostly at an easy effort.", "tags": ["longest_walk"]},
  "version": 1
}
```

- **Splits** (`splits@1`): from full-resolution samples with monotonic distance. Unit = 1000 m
  (metric) — compute both km and mile splits and store both (`splits_km`, `splits_mi`).
  Interpolate the exact time at each boundary linearly between samples. Last partial split
  flagged `partial: true` if ≥ 100 m, else dropped. Elevation gain per split: sum of positive
  deltas after smoothing elevation with a 5-sample moving average and ignoring |delta| < 0.5 m.
  Test with synthetic samples at constant 3 m/s: every km split = 333.3 s.
- **Best efforts inside the activity** (`best_efforts@1`, running/walking/hiking only):
  distances 1000, 1609.344, 5000, 10000, 21097.5 m. Two-pointer sliding window over
  `(time, distance)` samples; for each start index find the earliest end where
  `distance[end] − distance[start] ≥ D`, interpolate exact end time; minimum over starts. Reject
  efforts with average speed > 7 m/s for walking/hiking or > 10 m/s for running (GPS glitch).
  Complexity O(n). Test: constant 4 m/s run of 6 km → 1 km best = 250 s, 5 km = 1250 s.
  If no samples: use `garmin_fastest_splits` (source `garmin`).
- **Efficiency** (`activity_efficiency@1`): `ef` as in 8.5 #2. `decoupling_pct`
  (Go deeper only): for running activities ≥ 40 min with HR coverage ≥ 80% and `intensity ==
  easy`: split by elapsed time into halves; `ef_half = mean speed / mean HR`;
  `(ef1 − ef2) / ef1 × 100`. Caption "Under 5% means your heart rate stayed steady for the pace."
- **Summary sentence** (`activity_summary@1`): template choice:
  1. Set a best effort → "Your fastest {distance} yet — {time}! 🎉"
  2. Longest of its sport → "Your longest {sport} yet!"
  3. Intensity easy → "Mostly easy effort — great for building your base."
  4. Intensity moderate → "A steady, moderate session."
  5. Intensity hard → "A tough one! Plan an easy day next."
  6. No HR → "{distance} in {time}. Nice work."

### 8.10 Bests across activities (`efforts.py`)

- `bests@1`: for each kind (`distance:1000`, `distance:1609`, `distance:5000`, `distance:10000`,
  `longest:distance:{sport}`, `longest:duration`, `most_active_week`), return the all-time best
  and best in the last 90 days with activity id/date and `is_new` (date within 14 days).
- PB detection drives milestone/badge `pb_*` and the activity summary.
- **5K estimate** (`five_k_estimate@1`, Go deeper): Riegel's formula `T2 = T1 × (D2/D1)^1.06`
  from the best effort in the last 90 days with D1 between 3000 and 10000 m and T1 ≥ 10 min
  (choose the effort giving the fastest prediction). Show "About 31:40 — an estimate based on
  your best recent effort. Training runs are usually slower than races." Hide if no qualifying
  effort. Test: 10 km in 3000 s → 5 km ≈ 3000 × 0.5^1.06 = 1438.9 s.

### 8.11 Insights catalog (`insights.py`)

Keep the existing evidence-first insight model (id, category, tone, title, body, evidence,
dates, activity ids, method) and the research-claim linking (`claimsForInsight` logic moves to
the server: `research/claims.json` loaded at startup; `applies_to` matches insight ids). Port
the 4 existing insights (rewrite copy for beginners) and add the new ones. Each has a minimum-data
rule; if not met, it is not shown.

| id | Category | Trigger | Beginner title example |
|---|---|---|---|
| `weekly-volume` (existing, rewrite) | Activity | ≥ 1 activity this week and prior week same-weekday data | "More active than this time last week" |
| `zone-distribution` (existing → uses intensity mix) | Activity | ≥ 60 zone minutes in 28 d | "Mostly easy effort lately" |
| `sleep-context` (existing) | Sleep | ≥ 14 prior nights | "40 minutes more sleep than usual" |
| `hrv-context` (existing) | Recovery | ≥ 14 prior values | "Your HRV is in your usual range" |
| `ramp` | Activity | ramp band = building / big_jump | "A big jump this week" |
| `goal-streak` | Journey | streak ≥ 2 | "5 weeks in a row!" |
| `new-best` | Progress | best effort set in last 7 days | "New fastest 5 km" |
| `rhr-trend` | Progress | fitness signal 1 improving | "Resting heart rate is trending down" |
| `efficiency` | Progress | fitness signal 2 improving | "More distance per heartbeat" |
| `sleep-rhythm` | Sleep | bedtime rhythm computed | "Regular bedtimes this week" |
| `short-sleep-run` | Sleep | ≥ 3 of last 5 nights < need − 60 | "A few short nights in a row" |
| `rest-days` | Activity | ≥ 1 rest day per week for 4 weeks while active ≥ 3 days/week | "Good balance of activity and rest" |
| `steps-goal` | Activity | steps goal met ≥ 5 of last 7 days | "Step goal hit 5 days this week" |
| `checkin-energy` | You | ≥ 10 check-ins in 28 d and Spearman(energy, sleep) ≥ 0.4 (n ≥ 10) | "You feel more energetic after longer sleep" |

Evidence text for each: data window, n, method, and "This describes your data; it doesn't prove
cause and effect."

### 8.12 Relationships explorer (`relationships.py`, Go deeper) — `relationship@1`

- Variables (X and Y from the same list): `sleep_minutes`, `sleep_score`, `hrv`, `resting_hr`,
  `bb_at_wake`, `stress_avg`, `steps`, `active_minutes`, `effort_points` (daily), `checkin_energy`,
  `checkin_mood`.
- `lag`: 0 (same day) or 1 (X on day d, Y on day d+1).
- Pairs only where both are present. `n ≥ 14` required. Output: points, Spearman ρ, n, and
  strength words: |ρ| < 0.2 "no clear relationship", 0.2–0.4 "weak", 0.4–0.6 "moderate",
  > 0.6 "strong"; direction "tend to go up together" / "one tends to go down when the other goes
  up". Always the causation disclaimer.

### 8.13 Weekly recap (`reports.py`) — see Section 9.5 for content.

---

## 9. Engagement engine: streaks, milestones, journeys, check-ins, recaps

### 9.1 Weekly streak (`companion/streaks.py`) — `streak@1`

- A week (per `week_start`) is **met** when active minutes ≥ goal **or** sessions ≥ sessions goal
  (either counts — beginner friendly).
- `current` = number of consecutive met weeks ending with the last complete week, **plus 1 if
  the current week is already met**. The current week never breaks a streak until it's over.
- `longest` = max over history. `at_risk` = current week not met and ≤ 2 days left and
  `current ≥ 1`. `remaining` = minutes and sessions to meet it.
- Uses the goal **as it was** each week? Simplicity: use the current goal for all weeks (document
  it in METHODS.md).
- Test: weeks [met, met, not, met, met] + current week partial → current = 2, longest = 2.

### 9.2 Milestones (`companion/milestones.py`)

- Catalog in code (Appendix C, ~30 items). Each: `id`, `title`, `description`, `how_to_earn`,
  `icon` (lucide name), `tier` (`bronze` | `silver` | `gold`), `color` token, `check(ctx) ->
  (earned: bool, earned_on: date|None, activity_id|None, value|None)`, `progress(ctx) -> (current,
  target) | None` for locked display.
- `ctx` contains all top-level activities (normalized + derived), daily rows, best efforts,
  streak history, check-ins, journey state.
- Awards are **permanent** (never revoked even if data is deleted… except "Delete imported
  data", which deletes awards too since it removes the evidence).
- `earned_on` = the date of the qualifying activity/day (backfilled correctly for history: when
  a user connects with 90 days of history, earn all historical milestones with their real dates,
  but mark those earned before the connection date as `seen=True` so they don't trigger 15
  celebrations at once; show one summary celebration instead: "You unlocked 7 badges from your
  history!").
- Badge art: generated SVG component `Badge` = rounded hexagon (or circle for bronze, rounded
  square for silver, hexagon for gold) with gradient fill from the colour token, lucide icon in
  the centre, tier ring; locked = grayscale + 40% opacity + lock overlay.

### 9.3 Journeys (`companion/journeys.py`, `journeys.json`)

- A journey is a fixed list of weeks; each week has targets:
  `{ "minutes": int?, "sessions": int?, "longest_session_min": int?, "sleep_nights_at_need": int?,
  "avg_steps": int? }` plus a short tip string.
- Progress per week computed from data for that week (week 1 starts on the week containing
  `started`). Week status: `done` (all targets met), `partial` (% = mean of target completions,
  capped at 100 each), `current`, `upcoming`.
- Journeys never "fail". If a week is missed, the journey just continues; the path shows a
  smaller star. The user can "Repeat this week" (shifts remaining weeks by one: store
  `repeats: [week_numbers]` in the journey pref).
- Completing a journey awards its milestone (`journey_<id>_complete`) with a gold badge.
- Definitions in Appendix D.

### 9.4 Daily check-in (`api/journey.py`)

- `PUT /api/checkins/{date}` (date must be today or within the last 7 days) with
  `{mood: 1..5|null, energy: 1..5|null, soreness: 0..2|null, note: str ≤ 1000}`.
- UI: Today card with 5 face buttons (😫 😕 😐 🙂 😄 rendered as large lucide-ish custom SVG
  faces in Pip's style, with labels "Rough", "Meh", "Okay", "Good", "Great"), then energy
  (5 battery bars) and soreness (3 chips). Saves immediately (optimistic), Pip responds with a
  one-line reaction template (`checkin_reply_<mood>`), and the suggestion card recomputes.
- After answering, the card collapses to "You're feeling good today 🙂 · Edit".

### 9.5 Weekly recap ("Your week in stories")

Generated for each completed week (on first request after the week ends, and by `derive`).
Data:

```json
{
  "week_start": "2026-11-02", "week_end": "2026-11-08",
  "slides": [
    {"kind": "headline", "title": "Your week", "big": "3 sessions · 2 h 05 m", "pose": "wave",
     "text": "You were active on 3 days. That's your 5th week in a row!"},
    {"kind": "goal", "pct": 112, "minutes": 168, "goal": 150, "text": "Goal smashed 🎉"},
    {"kind": "highlight", "activity_id": "…", "text": "Highlight: Saturday's walk — your longest yet."},
    {"kind": "sleep", "avg_minutes": 431, "vs_usual_min": 12, "text": "You slept 7 h 11 m on average."},
    {"kind": "fitness", "signal": "rhr_trend", "text": "Resting heart rate: 2 bpm lower than last month."},
    {"kind": "milestones", "ids": ["total_50km"], "text": "New badge: 50 km club!"},
    {"kind": "next_week", "suggested_goal": 165, "text": "Ready for a little more? How about 165 minutes?"}
  ]
}
```

Slides only included when their data exists. UI: full-screen Story viewer (mobile: tap right =
next, left = back, swipe down = close; desktop: arrows/keys, click sides), progress segments
on top, each slide a big Pip + big number + sentence on a gradient background derived from the
slide's data colour. On Monday (first visit of the new week), Today shows a "Your week in
stories is ready" pill that opens it.

---

## 10. API contract

All responses are JSON, `Cache-Control: no-store` (existing middleware). All live routes require
the session cookie; mutations require `X-CSRF-Token` (existing). Every read route also exists
under `/api/demo/…` without auth. Dates are local `YYYY-MM-DD` strings. Durations in seconds,
distances in metres, speeds in m/s (frontend formats units) **except** human sentences, which
the server pre-formats with the user's units.

Write these TypeScript types in `src/lib/types.ts` and matching Pydantic response models in
`server/api/schemas.py` (use `response_model=` so FastAPI validates shapes). Keep the two in sync
manually; a test (P2-T10) loads demo responses and validates them against a JSON schema exported
from Pydantic (`model_json_schema()`) to catch drift.

```ts
type Source = 'garmin' | 'calculated' | 'user';
type Sport = 'walking' | 'running' | 'cycling' | 'swimming' | 'strength' | 'hiking' | 'other';
type Pose = 'wave' | 'cheer' | 'proud' | 'thinking' | 'sleepy' | 'calm' | 'oops' | 'stretch';

interface CompanionMessage { id: string; text: string; pose: Pose; data_refs: string[] }

interface StatusResponse {                         // GET /api/status   (poll: 5 s while a job runs, else 60 s)
  mode: 'live' | 'demo'; local_mode: boolean;
  user: { name: string };
  connection: { connected: boolean; state: string; last_checked: string | null;
                last_success: string | null; message: string | null; region: 'com' | 'cn' };
  jobs: { id: string; kind: 'sync' | 'activity'; state: string; progress: number; message: string }[];
  rederive: { state: 'idle' | 'running'; progress: number };
  data_through: string | null;
  unseen: { milestones: number; recap_week: string | null };
}

interface ActivitySummary {                        // list item
  id: string; name: string; sport: Sport; type: string; date: string; start: string;
  distance: number | null; duration: number | null; average_speed: number | null;
  gap_speed: number | null; average_hr: number | null; elevation: number | null;
  effort_points: number | null; zone_minutes: (number | null)[] | null;
  has_route: boolean; detail_state: string; location_name: string | null;
  is_best: boolean;                                // set ≥ 1 best effort / longest
  device: string; source: 'garmin' | 'imported_fit' | 'demo';
}
// GET /api/activities?from&to&sport=a,b&q&limit=50&cursor  →
interface ActivityList { items: ActivitySummary[]; next_cursor: string | null;
  totals: { sessions: number; duration: number; distance: number; effort_points: number } }

interface ActivityDetail extends ActivitySummary {   // GET /api/activities/{id}
  elapsed: number | null; moving: number | null; max_hr: number | null; max_speed: number | null;
  calories: number | null; steps: number | null; cadence_spm: number | null; cadence_rpm: number | null;
  power: number | null; normalized_power: number | null; max_power: number | null;
  elevation_loss: number | null; temperature_min: number | null; temperature_max: number | null;
  aerobic_te: number | null; anaerobic_te: number | null; te_label: string | null;
  body_battery_impact: number | null; vo2max: number | null;
  running_form: { stride_length_m: number | null; ground_contact_ms: number | null;
                  vertical_oscillation_cm: number | null; vertical_ratio_pct: number | null } | null;
  zones: { minutes: (number | null)[]; source: Source } | null;
  power_zones: (number | null)[] | null;
  streams: { index: number[]; time: number[]; distance: (number | null)[]; hr: (number | null)[];
             speed: (number | null)[]; elevation: (number | null)[]; cadence_spm: (number | null)[];
             power: (number | null)[]; lat: (number | null)[]; lon: (number | null)[] } | null; // ≤1500 pts
  splits_km: Split[]; splits_mi: Split[];
  laps: { index: number; duration: number | null; distance: number | null; hr: number | null;
          speed: number | null; power: number | null }[];
  sets: { index: number; type: string; exercise: string; reps: number | null;
          weight: number | null; duration: number | null }[];
  best_efforts: { kind: string; label: string; time_s: number; is_pb: boolean; source: Source }[];
  efficiency: { ef: number | null; decoupling_pct: number | null } | null;
  summary: CompanionMessage;
  milestones: { id: string; title: string }[];     // earned by this activity
  note: { text: string; rpe: number | null; feel: number | null; tags: string[] };
  watch_feel: number | null; watch_rpe: number | null;
  session_metrics: { name: string; value: number; unit: string }[];
}
interface Split { index: number; distance_m: number; time_s: number; pace_s: number;
  avg_hr: number | null; elev_gain_m: number | null; elev_loss_m: number | null;
  cadence_spm: number | null; partial: boolean }

// GET /api/activities/{id}/gpx   → application/gpx+xml (live and demo)
// PUT /api/activities/{id}/note  { text, rpe, feel, tags }  (existing + feel)

interface TodayResponse {                          // GET /api/today
  date: string; greeting: string; message: CompanionMessage;
  week: WeekProgress; suggestion: Suggestion; streak: Streak;
  sleep: { date: string; minutes: number | null; need_minutes: number | null; score: number | null;
           stages: { deep: number | null; light: number | null; rem: number | null; awake: number | null };
           sentence: string } | null;
  body_battery: { latest: number | null; at_wake: number | null; charged: number | null;
                  drained: number | null; sentence: string } | null;
  resting_hr: { value: number | null; usual: number | null; spark: (number | null)[]; sentence: string } | null;
  hrv: { value: number | null; status: string | null; balanced_low: number | null;
         balanced_high: number | null; sentence: string } | null;
  steps: { value: number | null; goal: number | null } | null;
  checkin: CheckIn | null;
  latest_activity: ActivitySummary & { route_preview: [number, number][] | null; summary: CompanionMessage } | null;
  next_milestone: MilestoneView | null;
  journey: JourneyView | null;
  insights: Insight[];                             // top 3
  unseen_milestones: MilestoneView[];              // → celebration dialog
  recap_ready: string | null;                      // week_start
  layout: string[];
}
interface WeekProgress { start: string; end: string; minutes: number; goal: number; pct: number;
  sessions: number; sessions_goal: number; remaining_minutes: number; days_left: number;
  by_day: { date: string; minutes: number; sports: Sport[]; is_today: boolean; is_future: boolean }[];
  sentence: string; method: string }
interface Suggestion { kind: 'go' | 'easy' | 'rest' | 'unknown'; title: string; text: string; pose: Pose;
  signals: { id: string; label: string; state: 'good' | 'ok' | 'low'; value_text: string; source: Source }[];
  method: string }
interface Streak { current: number; longest: number; at_risk: boolean;
  remaining_minutes: number; remaining_sessions: number;
  weeks: { start: string; pct: number; met: boolean }[] /* last 12 */ }

// GET /api/wellness/sleep?range=7D|4W|3M|1Y  (and /heart, /energy, /stress, /steps, /overview)
interface HealthSeries<T> { range: string; from: string; to: string; days: T[]; summary: Record<string, unknown>;
  sentences: string[]; method: string }

// GET /api/progress  → { signals: FitnessSignal[]; bests: Best[]; volume: WeekVolume[];
//                        consistency: { days: {date: string; minutes: number}[]; active_days_28: number };
//                        ramp: Ramp }
// GET /api/progress/deeper?range= → { effort_trend, intensity_mix, benefit_mix, pace_hr,
//                                     running_form, five_k_estimate, vo2max }
// GET /api/relationships?x&y&lag&range → { points: [x,y,date][]; rho: number|null; n: number; words: string }

// GET /api/journey → { journey: JourneyView | null; available: JourneyDef[]; goal: {...};
//                      goal_suggestion: {...} | null; streak: Streak; milestones: MilestoneView[];
//                      recaps: { week_start: string; seen: boolean }[]; checkins: CheckIn[] }
// PUT /api/journey  { id: string } | { action: 'pause' | 'resume' | 'repeat_week' | 'leave' }
// POST /api/milestones/seen { ids: string[] }
// GET /api/recaps/{week_start} → WeeklyRecap ;  POST /api/recaps/{week_start}/seen
// PUT /api/checkins/{date}  → CheckIn

interface MilestoneView { id: string; title: string; description: string; how_to_earn: string;
  icon: string; tier: 'bronze' | 'silver' | 'gold'; color: string; earned: boolean;
  earned_on: string | null; activity_id: string | null; progress: { current: number; target: number; unit: string } | null }

interface Insight { id: string; category: string; tone: 'positive' | 'neutral' | 'attention';
  title: string; body: string; evidence: string; dates: string[]; activity_ids: string[];
  method: string; claims: { id: string; title: string; summary: string;
  sources: { label: string; url: string }[] }[] }
// GET /api/insights → Insight[]

// GET /api/methods → { id: string; version: number; title: string; plain: string;
//                      formula: string; inputs: string[]; minimum_data: string }[]
// GET /api/research → existing research JSON passthrough (papers/reviews/claims) for /methods

// Existing, unchanged paths (keep behaviour & tests): /api/health (server liveness check),
// /api/session, /api/auth/*, /api/connection, /api/sync, /api/activities/{id}/details,
// /api/activities/{id}/original, /api/import/fit, /api/preferences, /api/export, /api/data (DELETE),
// /api/account (DELETE)
```

> ⚠️ **Route clash:** `/api/health` already exists as the server liveness check used by
> `Start.command` (`curl …/api/health`). The wellness endpoints therefore live at
> **`/api/wellness/*`** (not `/api/health/*`). The frontend route stays `/health`. Every
> reference in this plan uses `/api/wellness/*`. Keep `GET /api/health` returning
> `{"ok": true, "version": …}`.

`GET /api/data` (old) is **kept** until Phase 7 for backward compatibility of tests, then
removed together with its tests' replacements.

---

## 11. Phased task list (the work)

Legend: **‖** = can run in parallel with other ‖ tasks in the same phase. Each task: Goal →
Files → Steps → Acceptance → Verify. "Standard checks" = the command block in 0.2.

### Phase 0 — Safety and baseline

**P0-T1 Branch, backup, baseline**
- Steps: `git checkout -b redesign`; `cp -Rp .runtime .runtime-backup-20261108`; add
  `.runtime-backup-*/` to `.gitignore`; run standard checks (ruff/lint don't exist yet — skip
  those two) and save the output to `docs/baseline.txt` (counts only).
- Start the current app (`.venv/bin/uvicorn server.app:app --port 8000` after `npm run build`)
  and take "before" screenshots of every page in demo mode with Playwright or the browser
  (`docs/screenshots/before/*.png`). Demo mode only — never screenshot live personal data into
  the repo.
- Acceptance: backup exists and is the same size as `.runtime`; baseline: 31 pytest + 9 vitest
  passing; screenshots committed.

### Phase 1 — Tooling and hygiene (no behaviour change)

**P1-T1 Prettier + ESLint** ‖
- Add devDeps: `prettier`, `eslint`, `@eslint/js`, `typescript-eslint`,
  `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`.
- `eslint.config.js` (flat): recommended JS + TS, react-hooks `recommended` (rules-of-hooks
  error, exhaustive-deps **error**), no `any` (warn).
- `.prettierrc`: `{ "singleQuote": true, "printWidth": 100, "trailingComma": "all" }`.
- Scripts: `"lint": "eslint . && prettier --check ."`, `"format": "prettier --write ."`.
- Run `npm run format` once on the **existing** code in its own commit "Format existing code".
- Fix lint errors in existing code only if trivial; otherwise add `// eslint-disable-next-line`
  with a `TODO(P5)` comment (the files will be replaced).
- Acceptance: `npm run lint` passes; build + tests pass.

**P1-T2 Ruff for Python** ‖
- Add `ruff` to `[project.optional-dependencies].dev`; `[tool.ruff] line-length = 110`,
  `select = ["E","F","I","UP","B","SIM"]`. Run `ruff format server tests` + `ruff check --fix`.
- Acceptance: `.venv/bin/ruff check server tests` passes; pytest passes.

**P1-T3 CI update** (after T1, T2)
- `.github/workflows/checks.yml`: add `ruff check`, `npm run lint`, and later (Phase 6)
  Playwright. Acceptance: workflow YAML valid (`python -c "import yaml…"` or review).

**Phase 1 exit:** all standard checks pass; diff is formatting/config only.

### Phase 2 — Backend restructure and data layer

**P2-T1 Split modules without behaviour change**
- Create the layout of 3.2 for existing code: `server/db/models.py`, `server/db/store.py`,
  `server/garmin/client.py`, `server/garmin/normalize.py` (existing functions),
  `server/garmin/fit.py` (existing parse functions), `server/security.py`, `server/config.py`,
  `server/api/*.py` routers holding the **existing** endpoints, `server/main.py` with
  `create_app` (same signature: `create_app(store=None, start_worker=True,
  client_factory=GarminClient)`), `server/app.py` shim. Keep `server/storage.py` and
  `server/garmin.py` as re-export shims (`from .db.models import *` etc.) until Phase 7 so
  tests and scripts keep importing.
- Acceptance: **zero test changes needed**, all 31 pytest pass, `uvicorn server.app:app` runs,
  `scripts/validate_live.py` still imports.

**P2-T2 Normalizer v2** ‖ (after T1)
- Implement 7.2. Write tests in `tests/test_normalize_v2.py` using small hand-written raw
  dicts that mirror the observed key names (no real data). Cover: every new key, missing keys →
  None, privacy (owner fields absent), stride cm→m, stress ms→s, sleep subscores mapping.
- Acceptance: tests pass; old tests pass.

**P2-T3 FIT parser v2** ‖ (after T1)
- Implement 7.3. Build a tiny synthetic FIT file in tests? fitdecode can't write FIT. Instead,
  refactor the record/session handling into pure functions `record_to_sample(fields: dict,
  sport) -> dict` and `session_to_meta(fields) -> dict`, and unit-test those with dicts.
  Add one integration check script `scripts/check_fit_v2.py` that parses local originals and
  prints **only** aggregate ranges per channel (min/median/max) to confirm units (run once
  manually; do not commit output).
- Acceptance: cadence doubling test (85 + 0.5 → 171 spm for running; 85 rpm cycling unchanged),
  unit conversions tested; hiking sport recognised.

**P2-T4 New tables + preferences v2** (after T1)
- Add models from 7.4 and preferences from 7.4.1 with validation (theme in {dark,light,system},
  tone in {cheerful,calm}, name 1–20 chars stripped, today_layout items from the allowed set
  and unique, max_hr 120–230 or null, journey id exists in journeys.json, etc.).
- Test: create_all on a DB that already has old tables adds new ones without touching data
  (create a temp DB with the old schema via the current models, insert a row, run new
  create_all, row still there).
- Acceptance: tests pass.

**P2-T5 LTTB + common helpers** ‖
- `server/analytics/common.py` per 8.1 and 7.5, with tests listed there.

**P2-T6 Workspace dependency + demo store** (after T4)
- Implement 3.4. `Store(in_memory=True)`. `server/demo/seed.py` builds the demo store at startup
  (`app.state.demo_workspace`). Mutation rules for demo as in 3.4.
- Acceptance tests: `/api/demo/status` works without cookie; `/api/demo/connection` POST → 403;
  live routes still 401 without cookie; demo seeding < 3 s (`time.perf_counter` assert).

**P2-T7 Synthetic demo generator** (after T2, T3)
- `server/demo/generator.py`: deterministic (seed 16165, `random.Random`), 365 days ending
  "today" in `America/Toronto`. Persona "Alex", a beginner who **starts** at ~60 active
  min/week (walks) and progresses over the year to ~180 min/week with easy runs 2–3×/week
  ("walk to run" story), plus one strength session most weeks, occasional ride, a 3-week dip
  (holiday/illness) around day 200, gradual resting HR decline 62 → 55 bpm, EF improving ~8%,
  sleep 6.5–8 h with weekday/weekend rhythm, HRV 45–60 ms with Garmin-like baseline band,
  Body Battery, stress durations, steps 5k–11k with goal 7500, intensity minutes, sleep
  subscores with optimal ranges.
- Produce **Garmin-shaped raw dicts** (same keys as observed: activity list items with
  `activityId`, `activityName`, `activityType: {typeKey}`, `summaryDTO`-less top-level fields,
  `hrTimeInZone_*`, `avgGradeAdjustedSpeed`, `trainingEffectLabel`, `differenceBodyBattery`…;
  daily `summary` nested V2 shape; `sleep` `dailySleepDTO`-like; `hrv` summary) and run them
  through `normalize_*_v2`. Samples generated directly (time, distance, hr, speed, elevation,
  cadence, cadence_spm, power, lat/lon loop around a fictional park — not a real person's
  route; use coordinates in a public park area and randomise the loop shape).
- Demo user prefs: onboarded true, journey `walk_to_run_9w` started 3 weeks ago, some
  check-ins and notes, one unseen milestone so the celebration can be demoed.
- Acceptance: test asserts determinism (two runs equal), sizes (≥ 250 activities, 365 daily
  rows), every new normalized field non-null for ≥ 80% of relevant rows, generation < 2 s.

**P2-T8 Re-derivation pipeline** (after T2, T3, T4, and Phase 3 modules it calls — implement
the skeleton now calling stubs, fill in as Phase 3 lands)
- Implement 7.7 with a background thread at startup and `/api/status.rederive`.
- Test with a temp store seeded with v1-shaped rows (copy shapes from existing tests): after
  `rederive_user`, rows have `normalizer_version == 2`, original detail keys preserved, running
  it twice changes nothing (idempotent).
- **Manual check** (orchestrator): start the app against the real `.runtime` (backup exists),
  wait for rederive idle, confirm via `sqlite3` aggregate counts that activities/daily counts
  are unchanged and `activity_derived` has one row per activity.

**P2-T9 Worker updates** (after T8) — 7.8. Update `tests/test_worker.py` expectations only where
the number of detail downloads changed (3 → 10).

**P2-T10 Schema drift test** (after Phase 3 endpoints exist; can be written early with `xfail`)
- `tests/test_contract.py`: call every demo GET endpoint, validate with the Pydantic response
  models; export JSON schemas to `docs/api-schemas/*.json` (generated, committed) so the
  frontend author can read them.

**Phase 2 exit:** standard checks pass; app runs; real data re-derived with counts unchanged;
demo endpoints respond.

### Phase 3 — Analytics and engagement engine (Python) — all ‖ after Phase 2

Each task: implement the module per Section 8/9, unit tests with the examples given plus edge
cases (no data, missing values, single value, DST change week, week_start sunday), and an API
endpoint per Section 10 returning demo + live. Use the demo store in endpoint tests.

- **P3-T1** `zones.py` (8.2) + activity derived effort/zone minutes.
- **P3-T2** `activity.py` splits, in-activity best efforts, efficiency, summary sentence (8.9) +
  `GET /api/activities`, `GET /api/activities/{id}` (new shapes), `GET …/gpx`.
- **P3-T3** `efforts.py` bests + 5K estimate (8.10).
- **P3-T4** `activity_goals.py` (8.3) + `load.py` (8.4).
- **P3-T5** `fitness.py` (8.5).
- **P3-T6** `today.py` suggestion (8.6) + `GET /api/today` aggregator (uses everything; do last
  in the phase).
- **P3-T7** `sleep.py`, `energy.py` (8.7, 8.8) + `/api/wellness/*` endpoints.
- **P3-T8** `relationships.py` (8.12) + `/api/relationships`.
- **P3-T9** `insights.py` (8.11) incl. research claims linkage + `/api/insights`; port existing
  TS insight tests to pytest.
- **P3-T10** `companion/messages.py` (5.3) with deterministic selection test and a test that
  scans all templates for banned words (Section 5.4 list: failed, missed, only, just, behind,
  lazy, bad, unhealthy, dangerous) — case-insensitive whole-word.
- **P3-T11** `companion/streaks.py`, `milestones.py` (Appendix C), `journeys.py` + `journeys.json`
  (Appendix D), check-ins, recaps (`reports.py`) + `/api/journey`, `/api/milestones/seen`,
  `/api/recaps/*`, `/api/checkins/*`.
- **P3-T12** `/api/methods` registry: every `method` id used anywhere must have an entry (test:
  collect method ids from all demo responses → all present in registry).
- **P3-T13** `/api/progress`, `/api/progress/deeper`, `/api/status`.

**Phase 3 exit:** standard checks pass; `pytest --cov=server/analytics --cov=server/companion`
≥ 90% line coverage (add `pytest-cov` to dev deps); every demo endpoint returns non-empty data;
`tests/test_contract.py` passes.

### Phase 4 — Frontend foundation

**P4-T1 Install and configure** (first)
- Add deps: `tailwindcss`, `@tailwindcss/vite`, `@tanstack/react-query`, `radix-ui` (or the
  individual `@radix-ui/react-*` packages for dialog, popover, tooltip, tabs, select, switch,
  toggle-group, dropdown-menu, slider), `clsx`, `tailwind-merge`, `canvas-confetti`
  (+ `@types/canvas-confetti`), `@dnd-kit/core`, `@dnd-kit/sortable`,
  `@fontsource-variable/inter`, `@fontsource/barlow-semi-condensed`. Dev: `@testing-library/react`,
  `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`, `@playwright/test`.
  Use the latest stable versions, commit `package-lock.json`.
- `vite.config.ts`: add `tailwindcss()` plugin; keep proxy; manualChunks for `recharts`, `react`.
  `vitest` environment `jsdom` for `*.test.tsx`.
- Confirm CSP still OK: fonts are bundled into `/assets` (self), no inline scripts.
  `style-src 'unsafe-inline'` already allowed (Recharts/Radix inline styles).
- Acceptance: build passes; a temporary page renders a Tailwind-styled div with `bg-surface`.

**P4-T2 Tokens, fonts, base styles** — Section 4.2–4.5 into `src/styles/*`. Theme controller
in `providers.tsx` (`data-theme` on `<html>`, system listener, `meta[name=theme-color]` updated
to `--bg`). Acceptance: toggling theme in a test page switches all tokens; screenshot both.

**P4-T3 UI primitives** ‖ (after T2) — `components/ui/*` per 4.6 with tests.
**P4-T4 Data display + charts** ‖ (after T2) — `components/data/*`, `components/charts/*`
  with tests (RingGauge aria-label; Sparkline breaks on null; ZoneBars order Z5→Z1; RouteMap
  renders path count and handles < 2 GPS points; StreamCharts renders N charts for N available
  channels). Build a **dev-only gallery route** `/__gallery` (only when `import.meta.env.DEV`)
  showing every component in every state with demo-like fixtures — used for visual review.
**P4-T5 Pip + celebration** ‖ (after T2) — `components/companion/*` per 5.1 (all 8 poses in the
  gallery), `Celebration` dialog with confetti (reduced-motion aware), `CompanionMessage`
  (Pip + speech bubble).
**P4-T6 App shell, routing, workspace, API layer** (after T3)
- `app/*`, `lib/api.ts` (port existing CSRF/error logic; base prefix from workspace),
  `lib/queries.ts` (hooks for every endpoint in Section 10; query keys prefixed by mode;
  status polling interval 5 s when a job is running else 60 s; when a job transitions to
  complete, `invalidateQueries()` for that mode), `lib/format.ts` (port + extend formatters;
  tests for pace 5:00, imperial conversions, `—` for null), `layout/*` (SideNav collapsible,
  BottomTabBar, TopBar with sync chip, demo pill, avatar menu), route table with lazy pages and
  the redirects from 6.1, ⌘K CommandPalette, keyboard shortcuts, toasts.
- Session bootstrapping: port the logic from old `App.tsx` (GET `/api/session`; if no user and
  `local_mode` → POST `/api/auth/local`; set CSRF). If no live session and not local mode →
  default to demo workspace and show "Sign in / Connect" in avatar menu.
- Acceptance: navigating all routes shows placeholder pages inside the shell on desktop and
  mobile widths; tests for api error handling and workspace switching.

**Phase 4 exit:** standard checks pass; `/__gallery` shows all components in dark and light;
reviewer (orchestrator) compares against Section 4 specs item by item.

### Phase 5 — Pages (‖ after Phase 4; each page is one task)

For every page: implement the spec in Section 6, all four states (loading/empty/error/data),
mobile + desktop layouts, a Testing Library test of the main interactions (with mocked query
data), and a Playwright smoke test (Phase 6 adds them all; write it now if easy).

- **P5-T1 Today** (6.3) incl. Edit My Day sheet, check-in card, celebration on unseen
  milestones (POST seen after showing), recap-ready pill.
- **P5-T2 Activities list + calendar + compare** (6.4).
- **P5-T3 Activity detail** (6.5) incl. map/charts sync, splits/laps tabs, notes autosave,
  fetch-details flow, export menu, Go deeper.
- **P5-T4 Journey** (6.6) incl. JourneyPicker, path visualisation, milestones grid + badge sheet,
  goal suggestion accept, recap Story viewer (9.5).
- **P5-T5 Health** (6.7) all tabs.
- **P5-T6 Progress** (6.8) incl. Go deeper + relationships explorer.
- **P5-T7 Onboarding** (6.2).
- **P5-T8 Settings + Connect dialog** (6.10) — port the connect/sign-in logic from the old
  `ConnectDialog` exactly (key flow, region select, local mode, register/login fallback), with
  the new design.
- **P5-T9 How it works** (6.9) — port research page.

**Phase 5 exit:** every route renders fully with demo data; no console errors
(Playwright listens to `console` errors and fails on any); old `src/pages.tsx`,
`src/dashboard.tsx`, `src/components.tsx`, `src/App.tsx` (old), `src/styles.css`,
`src/analytics.ts`, `src/demo.ts`, `src/research*.ts*`, `src/context.ts`, `src/types.ts`
(old) are **deleted** and nothing imports them.

### Phase 6 — Quality pass

**P6-T1 Playwright suite**: `tests/e2e/*.spec.ts`, config runs `npm run build` then starts
uvicorn with a temp `OPEN_GARMIN_DATA_DIR` (never `.runtime`) and `OPEN_GARMIN_LOCAL_MODE=0`,
uses the **demo** workspace. Projects: desktop-dark, desktop-light, mobile-dark (iPhone 13
viewport). Specs: visit every route; open an activity; hover stream chart and assert map marker
appears; do a check-in; open a recap story and advance; switch theme; open ⌘K and search;
assert no horizontal overflow on mobile (`document.documentElement.scrollWidth <= innerWidth`).
Save full-page screenshots to `docs/screenshots/after/<project>/<route>.png`.
**P6-T2 Accessibility**: add `@axe-core/playwright`; zero serious/critical violations on every
route. Keyboard: every interactive element reachable, visible focus ring (`--accent`, 2 px,
offset 2 px), dialogs trap focus, Escape closes. Charts have text alternatives (aria-label with
a summary sentence, plus a "Show as table" toggle on main charts).
**P6-T3 Performance**: route-level code splitting; initial JS (gzip) < 250 KB excluding the
lazy chart chunk — measure from `vite build` output; Today API < 300 ms on demo (pytest timing
assertion with margin); no request waterfalls on Today (single `/api/today`).
**P6-T4 Copy pass**: grep the `src/` tree and server templates for banned words (5.4) and
marketing slogans from 2.2; every metric has an Explainer with glossary text (Appendix E).
**P6-T5 Contrast check**: script `scripts/check_contrast.mjs` computing WCAG contrast for
text tokens on surfaces in both themes (text ≥ 4.5, text-2 ≥ 4.5, text-3 ≥ 3.0 for captions
only, accent on surface ≥ 3.0 for UI). Fix token values if any fail (document changes here in
the plan's Section 4.2 table).

**Phase 6 exit:** Playwright + axe pass in all projects; screenshots committed; contrast script
passes.

### Phase 7 — Cleanup and docs

- **P7-T1** Remove `GET /api/data`, old shims (`server/storage.py`, `server/garmin.py`) after
  moving all imports (tests, `scripts/validate_live.py`), old fonts in `public/fonts`,
  `src/fonts.css`. Update `index.html` (title "Open Garmin", `theme-color` `#0A0C10`).
- **P7-T2** `docs/METHODS.md` generated from the `/api/methods` registry (script
  `scripts/export_methods.py`) + human intro. README rewritten: what it is (beginner companion),
  screenshots, start instructions (unchanged commands), privacy, sources, not-affiliated
  disclaimer. Move `WEB_APP_PLAN.md`, `HEALTH_AUDIT.md`, `RESEARCH.md` into `docs/archive/`.
- **P7-T3** Final verification on the **real** workspace: `Start.command` (stop other servers on
  8000 first), confirm Today loads with real data, rederive completed, numbers sanity-checked by
  the orchestrator against Garmin Connect for 3 activities (distance, time, avg HR equal).

**Phase 7 exit:** Definition of done (0.3).

### Phase 8 — Optional (only if the user asks)

- Opt-in map tiles (MapLibre + a self-hosted or user-chosen tile URL; CSP extended only when
  enabled; default off).
- Investigate whether the **documented** Personal API OpenAPI spec offers endpoints for VO2 max
  history, training status, race predictions, personal records or Garmin badges. Add only
  documented ones, behind feature detection.
- PWA install + offline shell; local notifications for streak-at-risk (browser Notification API,
  opt-in).

---

## 12. Testing and verification strategy

| Layer | Tool | What |
|---|---|---|
| Normalizers, parsers | pytest | hand-written raw dicts mirroring observed keys; privacy; units |
| Analytics & companion | pytest (+ pytest-cov ≥ 90%) | every formula with worked examples from Section 8/9; edge cases; determinism |
| API | pytest + FastAPI TestClient | auth/CSRF unchanged (existing tests), demo vs live isolation, contract validation, 403s in demo |
| Re-derivation | pytest | idempotency, preserves detail keys, never touches raw |
| Frontend units | Vitest + Testing Library | formatters, components states, page interactions with mocked hooks |
| E2E + visual | Playwright (+ axe) | every route, 3 projects, screenshots, no console errors, no horizontal scroll |
| Manual | orchestrator | compare screenshots against Section 4/6; real-data sanity check (P7-T3) |

Fixture rules: **never** copy real values from `.runtime` into fixtures or docs. Key names and
shapes may be copied; values must be invented.

---

## 13. Guardrails: things you must never do

1. Never delete, reset, overwrite, move or commit `.runtime/` or the backup. Never run tests
   against `.runtime` (tests use `tmp_path`).
2. Never print, log, store in fixtures, commit or send personal data, API keys, tokens or the
   encryption key. Aggregate counts/ranges only when inspecting.
3. Never call Garmin endpoints other than those already used in `server/worker.py` /
   `server/api` unless Phase 8 discovery confirms they are **documented** Personal API endpoints.
   No password/SSO scraping, no unofficial Connect endpoints.
4. Never write to the user's Garmin account.
5. Never add external network requests from the browser: no CDNs, Google Fonts, map tiles,
   analytics, error trackers. CSP must stay at least as strict as now (`default-src 'self'`).
6. Never use Garmin logos, Garmin's badge artwork, Garmin's icons, or Garmin's exact brand colour
   as the app's brand. Garmin metric names (Body Battery, HRV status, Training Effect, sleep
   score) may be used **only** to label Garmin-reported data. App-calculated metrics must not
   use Garmin feature names (no "Training Readiness", "Training Status", "Load Focus",
   "Acute Load"): use "Today's suggestion", "Ramp check", "Intensity mix", "Effort points".
   Keep "Not affiliated with, sponsored by or endorsed by Garmin" in About, How it works and
   README.
7. Never invent data: missing stays missing (`—` / gaps / empty states). Never fill gaps with 0.
8. Never present a single numeric readiness/recovery score. Never give medical advice or
   diagnose.
9. Never add claims to `research/claims.json` without a matching reviewed entry in
   `research/reviews.json` (`tests/test_research.py` enforces this — keep it passing).
10. Never remove or weaken security tests (CSRF, origin, isolation, key-echo, headers, deletion
    scope). If a move breaks one, fix the code, not the test.
11. Never use shaming language (5.4). Never use red for missed goals.
12. Never hard-code hex colours in components; use tokens.
13. Never write a component file > ~200 lines or a JSX line > 100 characters.
14. Never break `Start.command` or the `server.app:app` import path.
15. Never build a recreation of an existing app's mascot or badges; Pip and badges are original.

---

## 14. Decisions already made and open questions

### 14.1 Decisions (don't ask; just follow)

| Topic | Decision | Why |
|---|---|---|
| Audience | Beginners getting fitter | User requirement |
| Tone | Playful, warm, companion "Pip", never shaming | User requirement |
| Analytics location | Python server | single tested implementation; samples on server |
| Demo | Server-side synthetic workspace at `/api/demo` | same code path as live |
| DB | new tables only, re-derive from raw/originals | user has real data; no migration tool needed |
| Charts | Recharts 3 (existing) with `syncId` | known, adequate; fewer new deps |
| Styling | Tailwind v4 + CSS-variable tokens + Radix | ends the 57 KB stylesheet; accessible primitives |
| Theme | Dark default; light; system | Garmin-like |
| Map | tile-free SVG, upgraded | privacy + CSP |
| Readiness | words-only suggestion with visible rules | helpful for beginners, honest, no fake score |
| Load metric | Edwards zone score as "Effort points" | uses Garmin zones available on every activity; simple to explain; Garmin's own load is absent in this account |
| Streaks | weekly, minutes OR sessions | rest days never break a streak |
| LLM | none | privacy, determinism |
| Units of goal | weekly active minutes (Garmin intensity minutes) | beginner-friendly, sport-agnostic |

### 14.2 Open questions — stop and ask the user only about these

1. **App name.** "Open Garmin" uses Garmin's trademark in the product name. Keep it, or rename
   (e.g. "Open Stride", "Pacepal", "Trailmate") before README/branding work in Phase 7?
   (Default if no answer: keep the current name; the work does not depend on it.)
2. **Companion name/art sign-off.** After P4-T5, show the user the gallery screenshot of Pip's
   poses and ask if they like it before Phase 5 uses it everywhere.
3. **Default theme for the existing user** whose saved preference is `light`: switch them to dark
   once, or respect the saved value? (Default: respect the saved value.)

---

## 15. Appendices

### Appendix A — Friendly zone names (use everywhere)

| Zone | Name | One-liner |
|---|---|---|
| Z1 | Warm-up | Very easy — like a stroll. |
| Z2 | Easy | You can chat comfortably. Builds your base. |
| Z3 | Steady | Breathing harder, short sentences. |
| Z4 | Hard | Only a few words at a time. |
| Z5 | All-out | Can't talk. Short bursts only. |

### Appendix B — Companion message catalog (starter set; write ≥ 2 phrasings each, both tones)

| id | cheerful example | calm example |
|---|---|---|
| `greet_morning` | "Good morning, {name}!" | "Good morning, {name}." |
| `greet_afternoon` / `greet_evening` | "Hey {name}, good afternoon!" | "Good evening, {name}." |
| `milestone` | "New badge: {title}! 🎉" | "You earned a new badge: {title}." |
| `pb` | "Your fastest {distance} yet — {time}! 💪" | "A new best for {distance}: {time}." |
| `goal_reached` | "Weekly goal reached! Everything else is a bonus. 🎉" | "You've reached your weekly goal." |
| `gentle_checkin` | "Feeling sore? Let's keep today easy." | "You mentioned soreness. An easy day may help." |
| `rest_day` | "Rest day vibes 🌙 — this is when you get fitter." | "A rest day helps your body adapt." |
| `streak_risk` | "{minutes} more minutes keeps your {streak}-week streak going! 🔥" | "{minutes} minutes left to keep your {streak}-week streak." |
| `welcome_back` | "Welcome back! Any movement today counts. 🌱" | "Welcome back. Anything you do today counts." |
| `week_progress` | "{minutes} minutes so far this week — {pct}% of your goal." | same |
| `activity_reaction_*` | see 8.9 summary templates | — |
| `checkin_reply_1..5` | 1: "Sorry today's rough. Be kind to yourself." … 5: "Love that! Let's make it a good one." | calmer equivalents |
| `empty_first_sync` | "Your first sync is on its way — recent activities arrive first." | same |
| `not_enough_data` | "I need a bit more history for this one. Keep wearing your watch!" | "More history is needed for this." |

### Appendix C — Milestone catalog (implement all; ids are stable forever)

| id | Title | How to earn | Tier |
|---|---|---|---|
| `hello` | Hello there | Finish onboarding | bronze |
| `first_activity` | First step | Record your first activity | bronze |
| `first_run` | First run | Record your first run | bronze |
| `first_walk_5k` | 5K stroll | Walk 5 km in one go | bronze |
| `first_run_1k` | Non-stop kilometre | Run 1 km continuously (best effort exists) | bronze |
| `first_run_5k` | 5K runner | Run 5 km in one activity | silver |
| `first_run_10k` | 10K runner | Run 10 km in one activity | gold |
| `long_60` | Hour of power | One activity ≥ 60 min | silver |
| `sessions_10` / `_25` / `_50` / `_100` | 10 / 25 / 50 / 100 sessions | Total top-level activities | bronze/silver/gold/gold |
| `total_25km` / `_50km` / `_100km` / `_250km` / `_500km` | Distance clubs | Total distance all sports | bronze→gold |
| `week_goal_1` | Goal getter | Meet your weekly goal once | bronze |
| `streak_2` / `_4` / `_8` / `_12` / `_26` | Streaks | Weekly streak length | bronze→gold |
| `active_150` | 150 club | ≥ 150 active minutes in a week | silver |
| `variety_3` | Mix it up | 3 different sports in 4 weeks | silver |
| `early_bird` | Early bird | Activity starting before 07:00 | bronze |
| `night_owl` | Night owl | Activity starting after 21:00 | bronze |
| `strength_5` | Strong start | 5 strength sessions | silver |
| `steps_goal_7` | Step it up | Steps goal met 7 days in a row | silver |
| `sleep_need_5` | Well rested | Slept ≥ need on 5 nights in one week | silver |
| `bedtime_regular` | Steady rhythm | Bedtime within your usual window 7 nights in a row | silver |
| `checkin_7` | Checking in | 7 check-ins | bronze |
| `pb_any` | Personal best | Set any best effort | bronze |
| `rhr_down` | Heart getting fitter | Fitness signal "resting HR" improving | gold |
| `comeback` | Comeback | Activity after ≥ 14 days without one | bronze |
| `journey_<id>_complete` | Journey complete | Finish a journey | gold |

### Appendix D — Journey definitions (`server/companion/journeys.json`)

Write original week-by-week targets (not copied from any branded programme):

1. `move_more_8w` — "Move more" (focus `move_more`): weekly minutes 60, 75, 90, 100, 115, 125,
   140, 150; sessions 3 each week. Tips e.g. week 1 "Short walks count. Aim for three this week."
2. `walk_to_run_9w` — "Walk to run" (focus `start_running`): sessions 3/week; minutes 60, 70, 75,
   80, 90, 90, 100, 100, 110; longest session target 20, 22, 25, 25, 28, 30, 30, 32, 35 min.
   Tips describe alternating walk/jog in the user's own words (the app cannot verify intervals;
   it tracks minutes and sessions only). Final week bonus milestone `first_run_5k` suggested.
3. `habit_4w` — "Build a habit" (focus `build_habit`): sessions 3, 3, 3, 4; minutes optional.
4. `sleep_rhythm_4w` — "Sleep rhythm" (focus `sleep_better`): nights at need 3, 4, 5, 5;
   tip about consistent bedtime; also tracks bedtime regularity.
5. `steps_6w` — "Step it up": weekly average steps = baseline (median last 14 days, rounded to
   250) + 500 × week number, capped at the steps goal + 2000.

### Appendix E — Glossary for Explainers (one-sentence "what" + "why")

| Metric | What it is | Why it matters |
|---|---|---|
| Active minutes | Minutes of moderate activity, with vigorous minutes counting double (Garmin's intensity minutes). | A simple way to see if you're moving enough each week. |
| Effort points | Minutes in each heart-rate zone, with harder zones counting more. Calculated by Open Garmin. | Lets you compare how hard different sessions and weeks were. |
| Heart-rate zones | Bands of your heart rate from very easy (1) to all-out (5). | Most of your fitness is built in the easy zones. |
| Resting heart rate | Your lowest steady heart rate during the day, measured by your watch. | It often drops slowly as you get fitter. Compare only with yourself. |
| HRV | The tiny variation between heartbeats overnight. | Higher than *your* usual tends to mean you're well rested. |
| HRV status | Garmin's label comparing your recent HRV with your own range. | A quick read on how you're recovering. |
| Body Battery | Garmin's 0–100 estimate of your energy reserves. | Shows how sleep charges you and activity/stress drain you. |
| Stress | Garmin's 0–100 estimate from your heart rhythm while you're still. | Long stressful stretches can affect sleep and recovery. |
| Sleep need | How much sleep Garmin thinks you need tonight. | Helps you see if you're getting enough. |
| Sleep score | Garmin's 0–100 rating of last night's sleep. | A quick summary of sleep quality. |
| Training effect | Garmin's 0–5 score of how much a workout improves fitness. | 2–3.9 maintains/improves fitness — perfect for most sessions. |
| Pace | Time per kilometre (or mile). Lower = faster. | Track how your speed changes over weeks. |
| Cadence | Steps per minute while running or walking. | Comfortable cadence varies by person; changes are gradual. |
| Distance per heartbeat | How far you travel for each heartbeat at a similar effort. | Going up over weeks means your heart is getting more efficient. |
| Ramp check | This week's effort compared with your recent weeks. | Big sudden jumps are harder on the body than gradual builds. |
| Streak | Weeks in a row you met your weekly goal. | Consistency matters more than any single workout. |

---

*End of plan.*
