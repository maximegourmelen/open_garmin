# Open Garmin — Redesign v2: "Quiet, precise, premium"

> **Audience:** an orchestrating agent and the sub-agents it delegates to.
> Read Sections 0–3 before doing anything. Every task in Section 11 is self-contained: goal,
> files, steps, acceptance criteria. The previous plan (playful companion + gamification) has
> been executed and **rejected by the user**. It is archived at `docs/archive/REDESIGN_PLAN_V1.md`
> for reference only. Where the two plans disagree, **this plan wins**.

Plan date: 2026-11-09. Repository: `/Users/maximeg/Documents/Python/open_garmin`.
Starting point: branch `redesign` at `a500bab`.

---

## Table of contents

0. Ground rules
1. What the user said, and what it means
2. Audit of the current app (evidence)
3. The new direction
4. Design language (tokens, type, layout, components, charts, motion)
5. Copy and voice
6. Information architecture and navigation
7. The guidance system (onboarding, tour, explanations, help)
8. Page specifications
9. Consistency contract (one vocabulary, one format, one number)
10. Backend and API changes
11. Phased task list
12. Verification and QA
13. Guardrails
14. Decisions made, and open questions
15. Appendices: glossary copy, page intros, removal list, review checklist

---

## 0. Ground rules

### 0.1 What you are building

A **re-skin and re-think of the frontend** of Open Garmin (React + FastAPI) so that it feels
like a premium, minimalist, professional product — closer to Oura, Whoop, Linear, or Apple
Health than to a game. The backend (data, analytics, security, sync, demo workspace) is
largely good and is **kept**; it gets targeted fixes (Section 10).

The result must be:

1. **Minimal and calm.** Monochrome interface, one restrained accent, colour used only to encode
   data. Lots of whitespace. Typography does the work, not boxes and badges.
2. **Intuitive.** Fewer pages, fewer controls, one obvious thing to look at per screen. A new user
   understands the app in under a minute without reading documentation.
3. **Self-explaining.** A short welcome, an optional guided tour, a one-line description on every
   page, an info drawer on every metric, a Guide page, and empty states that teach.
4. **Consistent.** One vocabulary, one number format, one card anatomy, one range control, one
   chart style. The same number shows the same value on every page.
5. **Correct.** No contradictory numbers, no raw enums, no wrong units, no broken icons.

### 0.2 How to work

- **Branch:** `git checkout -b redesign-v2` from `redesign`. Commit after every task:
  `V2-P3-T2: Build metric info drawer`. End every commit message with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Checks after every task** (a task is not done if any fail; if a check already failed before
  your task, stop and report instead of fixing unrelated code):
  ```sh
  cd /Users/maximeg/Documents/Python/open_garmin
  .venv/bin/python -m pytest -q
  .venv/bin/ruff check server tests
  npm run lint
  npm test
  npm run build
  node scripts/check_contrast.mjs
  node scripts/check_ui_rules.mjs      # created in V2-P1-T4
  ```
- **Phase order is strict.** Tasks marked `‖` inside a phase may run in parallel sub-agents.
- **Design checkpoint (mandatory).** After Phase 2 (design foundation), stop, capture the
  component gallery screenshots, and **ask the user to approve the look** before building pages.
  The user is unhappy with the current result; don't build eight pages on an unapproved style.
- **Look at your work.** Every UI task ends with screenshots (desktop 1440×900 and mobile
  390×844, light and dark) that the agent itself opens and checks against the review checklist
  in Appendix D. "Tests pass" is not the same as "it looks right".
- **Never touch `.runtime/`** (the user's real data and encrypted Garmin key). Never commit it.
- **When the brief and your taste disagree, the brief wins.** If the brief is impossible, make the
  smallest change that meets the acceptance criteria and explain it in the commit body.

### 0.3 Definition of done

- All phase exit criteria pass; all checks above are green.
- `Start.command` still launches the app in local mode with the user's data intact.
- Demo workspace shows every page fully populated and **plausible** (Section 10.4).
- Playwright suite passes on desktop and mobile, light and dark; screenshots are saved to
  `docs/screenshots/v2/` and every one passes the Appendix D checklist.
- The cross-page consistency test (V2-P6-T2) passes.
- README, `docs/METHODS.md` and the in-app Guide are updated.

---

## 1. What the user said, and what it means

User feedback on the current build (2026-11-09), paraphrased faithfully:

> Still quite bad. Unintuitive to use. No introductory features apart from the initial setup.
> No explanation of how to use it. Inconsistencies. The layout is really terrible. Doesn't feel
> premium at all. It should feel way more minimalist and professional. We need a complete change
> of vibe.

Translated into requirements:

| Complaint | Requirement in this plan |
|---|---|
| Unintuitive | Four primary destinations instead of five-plus-two; each page answers one question; consistent page anatomy (Section 6, 8) |
| No introduction / explanation | A guidance system: welcome, tour, page intros, metric info drawer, Guide page, teaching empty states (Section 7) |
| Inconsistencies | A written consistency contract with automated checks (Section 9, V2-P1-T4, V2-P6-T2) |
| Terrible layout | Strict 12-column grid, sections instead of a ragged bento of cards, one hero per page (Section 4.4, 8) |
| Not premium / not minimalist / not professional | Remove the mascot, confetti, emoji, badge walls, streak flames, eyebrow slogans and badge noise; new neutral palette and type system (Section 3, 4, 5) |

---

## 2. Audit of the current app (evidence)

Reviewed on 2026-11-09 from `docs/screenshots/after/**` and the source. These are the concrete
problems. Agents must not "patch" them one by one in the old components; they disappear by
following the plan. Each is listed so that the QA phase can verify it is gone.

### 2.1 Vibe: why it reads as cheap

1. **The mascot.** Pip (a blue blob) appears on onboarding, Today, the suggestion card, empty
   states and celebrations. It sets a childish tone that contradicts "professional".
2. **Gamification clutter.** Journey page with a winding path of stars, 40+ milestone badges,
   streak flames, "Your weekly recap is ready" yellow banner, confetti, emoji mood faces.
3. **Badge noise.** Almost every card header carries a pill ("Sample data", "Calculated",
   "You") plus an ⓘ plus a chevron. On Today there are 8 "Sample data"/"Calculated" pills on one
   screen. They compete with the data.
4. **Marketing eyebrows came back.** "LISTEN TO YOUR BODY", "GROWING IN YOUR OWN WAY",
   "MAKE IT YOURS", "MOVE WITH PURPOSE", "MY DAY · MONDAY, NOVEMBER 9" in uppercase accent text
   above every title, plus slogan subtitles ("Your readings, with room for real life.").
5. **Triple titles.** Top bar breadcrumb "Workspace / Today" + top bar title "Today" + page
   heading. Three labels for one thing.
6. **Everything is a card.** Cards inside cards (Progress: "Your bests" card containing 8 cards).
   Rounded 20 px boxes everywhere flatten the hierarchy.
7. **Colour everywhere.** Bright saturated blue accent on nav, links, rings, sparklines, buttons
   and chips; green "chips" for every reason; yellow progress bars; sport colours on list icons.
   Nothing stands out because everything does.
8. **Sporty condensed numerals** (Barlow Semi Condensed) mixed with Inter give a "watch face"
   look rather than a refined product look.

### 2.2 Layout

1. **Today** is a ragged bento: a tall suggestion card next to a short Streak card leaves a
   large hole; row 2 leaves the right column empty; Body Battery/Resting HR/Next milestone sit at
   three different heights; "Things I noticed" is half-width with nothing beside it.
2. **No single focal point** on any page. Today has ~11 cards of equal visual weight.
3. **Check-in form** (5 emoji, a slider, 3 chips, a textarea and a button) occupies a full card on
   Today and a full screen height on mobile, for an optional action.
4. **Journey** page is ~5,800 px tall: 52 "Week of …" rows each with "Watch again →".
5. **Settings** spreads ~20 fields over 8 sub-pages; "Save changes" floats outside the panel;
   native `<select>`s clash with the styled inputs.
6. **Health Overview** is five identical cards with identical blue sparklines and no scale.
7. **Activities** list has numeric columns without headers; the meaning of the tiny coloured
   bar at the end of each row is never explained.

### 2.3 Inconsistencies (same app, different answers)

1. **This week's activity:** Today says "You've moved **20 minutes** this week"; the insight on the
   same page says "You have moved for **37 minutes** this week"; Activities says
   "This week · 1 sessions · **37m 00s**". Two definitions (Garmin intensity minutes vs recorded
   duration) presented with the same words.
2. **Sleep duration** shown as "7h 15m" in one card and "Sleep: **435 min**" in the suggestion
   chips and "You slept about 435 minutes" in insights.
3. **Durations** appear as `37m 00s`, `12h 08m`, `7h 15m`, `2160 → 2340 s`, `39m 00s`.
4. **Dates** appear as `2026-11-09` (Latest activity), `Nov 9`, `Monday, November 9`,
   `Today, 10:12`.
5. **Range controls:** Health uses `7D 4W 3M 1Y`; Activities `4W 3M 1Y All`; Progress has none.
6. **Names:** "Energy" tab vs "Body Battery" card; "Progress" vs "Signs you're getting fitter";
   "How it works" (nav) vs "Methods" (route); "sessions" vs "activities".
7. **Hard-coded units:** `server/api/today.py` formats PB distance as `f"... km"` regardless of
   the imperial preference.
8. **Canned sentences** that ignore the data: Resting HR always says "Close to your usual.";
   Health → Heart says "Your readings will appear here when available." directly under "56 bpm".

### 2.4 Bugs and incorrect displays

1. **Milestone icons render as text** (`{item.icon}` in `src/pages/Journey/JourneyPage.tsx:402`
   and `:528` prints "flame", "footprints", "hand", "person-standing"…).
2. **Sleep stage "usual" ranges have wrong units:** "Light 239m (45–55m usual)" — Garmin's
   optimal ranges are percentages of total sleep, displayed as minutes.
3. **Bedtime rhythm chart** plots raw minutes (Y axis "240…320") with a smoothed spline that
   invents values between nights. Must be clock times, no interpolation.
4. **Sleep-over-time Y axis** in minutes ("600, 450, 300") instead of hours.
5. **Raw enums:** "Garmin says: GOOD", "Rem 96m".
6. **Pluralisation:** "1 sessions".
7. **Duplicated text:** Sleep tab repeats "About 4.7 h short this week" and "Your bedtime has
   been nice and regular" below the charts.
8. **Ramp check** shows a unitless ring "134" and calls one 60-point Monday session "a bigger
   week than usual" (pro-rated comparison after one day; `server/analytics/load.py:44-47`).
9. **Fitness signals** show `1 → 1 m/beat` and `2160 → 2340 s` (rounding destroys the signal;
   seconds shown raw).
10. **Volume chart** shows identical 120-minute bars for 11 consecutive weeks — either the demo
    generator or the metric is capped. Investigate (Section 10.4).
11. **Bests grid** uses mixed formats (`6m 12s` for a pace-like 1 km time, `39m 00s`).

### 2.5 Missing guidance

- Onboarding is the only introduction, and its first screen is a mascot saying hello. Two equal
  buttons, no visual of what the app does, no explanation of the Garmin key.
- No tour, no page descriptions that explain how to use the page, no help entry point, no
  explanation of what "Effort points", the zone bar, "Ramp check", "Body Battery", "HRV status",
  or "distance per heartbeat" mean, beyond tiny ⓘ popovers with one sentence.
- Empty states describe the absence but not what to do.

### 2.6 What is good and must be kept

- **Backend architecture:** `server/analytics/*` pure functions, `server/garmin/*`, `derive.py`,
  `worker.py`, `workspace.py` live/demo split, contract schemas in `docs/api-schemas/`.
- **Security model** (CSRF, origin checks, CSP, scrypt, rate limiting, Fernet-encrypted keys) and
  every security test.
- **Honest data rules:** missing data stays missing, provenance tracked, nothing invented,
  not medical advice.
- **Frontend stack:** React 19, TS, Router 7, Tailwind v4, Radix, TanStack Query, Recharts,
  lucide-react. Small files, tests per page. Keep the stack; change the design.
- **Local mode** (`Start.command`, `/api/auth/local`).
- **Tests:** 101 pytest tests and the vitest suite. Adapt tests when UI changes; never delete a
  security or analytics test.

---

## 3. The new direction

### 3.1 Product promise

> **Open Garmin is a private, precise view of your Garmin data.** It shows what changed, what's
> normal for you, and what it means — clearly, without noise.

### 3.2 Principles (ranked; the higher one wins)

1. **Correct before clever.** Every number has one definition, one format, and the same value
   everywhere. Missing stays missing.
2. **One focal point per screen.** Each page has one hero (a number, a chart, or a sentence). The
   rest is supporting detail, visually quieter.
3. **Explain in place.** Every metric label can be clicked to learn what it is, how to read it,
   and what's normal for *you*. No jargon without a path to its explanation.
4. **Quiet by default.** Monochrome UI. Colour only encodes data. No decoration that doesn't carry
   information.
5. **Personal baselines over absolute judgements.** Compare the user with their own usual range
   ("within your normal range"), not with praise or scolding.
6. **Private.** No external network calls from the browser. Fonts and icons bundled.

### 3.3 Who it's for

Same user as before (a Garmin owner who wants to understand their data and get fitter), but
addressed as an **adult**: plain, precise language; no cheerleading; no childish visuals. Beginners
are served by **explanations**, not by mascots.

### 3.4 What is removed (from the UI; see Appendix C for files)

| Removed | Replaced by |
|---|---|
| Pip mascot, all poses, companion name/tone settings | Nothing. Neutral summary sentences in plain text |
| Confetti, celebration dialogs | A small, quiet "New record" tag on the activity and in Records |
| Journey page, journey programmes, path visual | Weekly goal (Settings + Overview "This week") |
| Milestone badge wall (40+ badges) | Records table in Trends (real personal bests only) |
| Streak flame card | One line in Trends → Consistency: "Weekly goal met 22 weeks in a row" |
| Weekly recap "stories" viewer | Weekly report page (`/trends/week/:weekStart`), printable, calm |
| Emoji mood check-in card | Optional one-line "How do you feel?" 1–5 scale, collapsed, on Overview |
| "Edit My Day" drag-and-drop layout | Fixed, well-designed Overview layout |
| Health "Overview" tab | Overview page already shows the latest health metrics |
| Per-card "Sample data"/"Calculated"/"You" pills | Demo banner (once, app-wide) + source footnote per section |
| Eyebrows, slogans, breadcrumb top bar | Page title + one factual description line |

The **backend data** behind removed features (milestones, journeys, check-ins tables) is not
dropped (no destructive migrations). Endpoints that only served removed UI are removed from the
router (Section 10.2); stored rows remain harmless.

### 3.5 What is kept and promoted

Weekly goal progress; today's guidance (renamed "Today" guidance, rewritten neutrally); sleep,
heart (resting HR + HRV), Body Battery, stress, steps; activity list, calendar, detail with map,
synced charts, splits, zones, training effect; personal records; fitness trends; ramp/load;
notes on activities; exports; research-backed methods (now inside the Guide).

---

## 4. Design language

The look in one paragraph: **a white (or near-black) page, generous margins, a narrow text-only
sidebar, large precise numbers in a refined sans with tabular figures, thin hairline dividers,
small grey labels, and charts that are the only colourful thing on the screen.** Think of a
well-typeset annual report or a premium health app: confident, quiet, exact.

### 4.1 Colour tokens (replace `src/styles/tokens.css` entirely)

Theme default: **"Match system"** (light or dark follows the OS). Both themes are first-class.

**Interface (neutrals + one accent)**

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#FAFAF9` | `#0B0B0C` | page background |
| `--surface` | `#FFFFFF` | `#131314` | panels, popovers, drawer |
| `--surface-2` | `#F4F4F3` | `#1A1A1C` | hover, inputs, selected row, segmented track |
| `--border` | `#E8E7E4` | `#232325` | hairlines, panel borders |
| `--border-strong` | `#D6D5D1` | `#323235` | inputs, focusable outlines |
| `--text` | `#161616` | `#EDEDEC` | primary text and numbers |
| `--text-2` | `#5E5E5B` | `#A3A3A0` | secondary text, labels, units |
| `--text-3` | `#8C8C88` | `#76767A` | captions, axis ticks, disabled (never body copy) |
| `--primary` | `#161616` | `#EDEDEC` | primary button background (ink) |
| `--on-primary` | `#FFFFFF` | `#0B0B0C` | text on primary button |
| `--accent` | `#3E5BD8` | `#8EA2F7` | links, focus ring, selected state, "current" in charts |
| `--accent-soft` | `rgba(62,91,216,.08)` | `rgba(142,162,247,.12)` | selected nav item bg, highlighted period |
| `--positive` | `#2E8A5F` | `#5BC491` | "better than usual" delta, goal met |
| `--caution` | `#B07415` | `#E0A94A` | "outside your usual range" |
| `--negative` | `#C2433D` | `#EB7A73` | destructive actions, errors only |

Rules:
- **Primary buttons are ink** (`--primary`), not blue. One primary button per view at most.
- **The accent is rare:** focus rings, links, the active nav item's indicator, the "current
  period" in charts. If a screen shows more than ~3 accent-coloured elements outside charts,
  something is wrong.
- **Positive/caution colours only appear on deltas and status dots**, never as large fills.
- No gradients, no glows, no shadows in dark mode. Light mode panels: border only, no shadow.
  Popovers/drawers/dialogs: `0 8px 30px rgba(0,0,0,.08)` (light), border only (dark).

**Data palette (charts only; same hue family in both themes, lightness tuned per theme)**

| Group | Tokens (light / dark) |
|---|---|
| Series default | `--data-1` `#3E5BD8` / `#8EA2F7` (single-series charts use this) |
| Comparison / baseline | `--data-muted` `#C9C8C4` / `#3A3A3D` (previous period, "your usual" band uses this at 40%) |
| HR zones | `--z1 #A6A6A2`, `--z2 #6F8FE8`, `--z3 #4FA883`, `--z4 #D99A3D`, `--z5 #D2615A` (dark: +8% lightness) |
| Sleep stages | `--sleep-deep #34418F`, `--sleep-light #7D93E6`, `--sleep-rem #9C86D9`, `--sleep-awake #D9A0AE` |
| Body Battery | `--bb #4E9FC4`; charge `--positive`, drain `--caution` |
| Stress | `--stress-rest #7D93E6`, `--stress-low #D9C27A`, `--stress-med #D99A3D`, `--stress-high #C9673D` |
| Sports (charts only) | walking `#4FA883`, running `#3E5BD8`, cycling `#D99A3D`, swimming `#4E9FC4`, strength `#8C79C9`, hiking `#7C9A4A`, other `#A6A6A2` |

**Sport colours are not used in lists, icons or chips.** In the Activities list, sport icons are
monochrome `--text-2`. Sport colour appears only where a chart needs to separate sports.

Update `scripts/check_contrast.mjs` to the new tokens: text tokens ≥ 4.5:1 on `--bg` and
`--surface` (text-3 ≥ 3:1, captions only), data colours ≥ 3:1 against `--surface`.

### 4.2 Typography

- **Font:** Geist Variable (`@fontsource-variable/geist`) for everything, with
  `font-variant-numeric: tabular-nums` on all numbers. Verify the package with
  `npm view @fontsource-variable/geist version` before installing; if unavailable, use
  Inter Variable (already installed) with `font-feature-settings: "cv11", "ss03"`.
- **Remove** Barlow Semi Condensed (`@fontsource/barlow-semi-condensed`).
- Maximum two weights on any component: 400 and 560/600.
- **No uppercase labels** and no letter-spaced eyebrows anywhere.

| Style | Size / line | Weight | Tracking | Use |
|---|---|---|---|---|
| `display` | 44/48 | 560 | −0.03em | the single hero number of a page |
| `metric-lg` | 28/32 | 560 | −0.02em | metric tiles in a strip |
| `metric-md` | 20/26 | 560 | −0.01em | secondary stats, table emphasis |
| `title` | 24/32 | 600 | −0.02em | page title |
| `heading` | 15/22 | 600 | −0.005em | section heading |
| `body` | 14/22 | 400 | 0 | sentences, table cells |
| `label` | 13/18 | 400 | 0 | metric labels (sentence case, `--text-2`) |
| `caption` | 12/16 | 400 | 0 | footnotes, axis ticks, source lines (`--text-3`) |

Units: same font, 55% of the number's size, `--text-2`, preceded by a thin space
(`U+2009`): `56 bpm`, `7 h 15 min`. Never bold units.

### 4.3 Spacing, radius, borders

- 4 px base unit; use the scale 4, 8, 12, 16, 24, 32, 48, 64.
- Page padding: 48 px top / 40 px sides (desktop), 20 px top / 16 px sides (mobile).
- Vertical rhythm between page sections: 48 px desktop, 32 px mobile.
- Radius: panels 12 px, controls 8 px, tags 6 px, avatar/dots full. Nothing at 20 px.
- Borders: 1 px `--border`. Dividers between rows: 1 px `--border`, full-bleed inside a panel.

### 4.4 Layout grid

- Desktop ≥ 1024 px: sidebar 224 px (fixed, full height, `--bg` with right hairline), content
  area max-width **1120 px**, centred in the remaining space, 12 columns, 24 px gutter.
- Tablet 768–1023 px: sidebar collapses to 64 px icon rail with tooltips; 8 columns.
- Mobile < 768 px: top app bar (56 px) + bottom tab bar (56 px + safe area); single column.
- **Rows must be even.** Panels in the same row share a height (CSS grid `align-items: stretch`)
  and a row's spans sum to 12. No orphan half-width panels. Every page layout in Section 8 gives
  explicit spans.
- **Sections, not card soup.** A page is a sequence of sections: `heading` + optional
  description + content. Content is either a panel (bordered, 12 px radius, 24 px padding) or
  bare (tables, charts on the page background). **Never nest panels.**

### 4.5 Page anatomy (identical on every page)

```
Title                                                   [page actions, e.g. range control]
One factual sentence describing what this page shows and how to use it.     ⓘ About this page
───────────────────────────────────────────────────────────────────────────────────────────
Section heading                                                       [section action]
content…
```

- No breadcrumb, no top bar on desktop. Title is `title` style, description is `body` in
  `--text-2`, max 72 characters per line.
- "ⓘ About this page" opens the page intro popover (Section 7.3).
- Detail pages (activity, weekly report) add a back link above the title: `← Activities`.

### 4.6 Components (rebuild/restyle in `src/components/`)

Each gets a Vitest test for accessible name, keyboard behaviour and states, and appears in the
dev gallery (`/dev/components`, dev builds only).

| Component | Spec |
|---|---|
| `Button` | Variants `primary` (ink), `secondary` (surface + border), `ghost` (text only), `danger` (negative text, border). Height 36 (32 small). 8 px radius. No icons on primary unless needed. Press: opacity .85, no scale. |
| `IconButton` | 32×32, ghost, required `aria-label`, tooltip. |
| `Panel` | Replaces `Card`. Bordered surface, 12 px radius, 24 px padding (16 mobile). Optional `header` slot (heading + action). **No icon tint circles, no badges in header.** |
| `Section` | `heading`, optional `description`, optional `action`, optional `footnote` (source line). Handles spacing. |
| `Metric` | The core data primitive: `label` (with info trigger), `value`, `unit`, optional `delta` ("+3 vs usual"), optional `status` dot, optional `sparkline`, optional `caption`. Sizes `lg`/`md`. Missing value → `—` in `--text-3` and caption "No reading". |
| `MetricStrip` | A row of 3–5 `Metric`s inside one panel separated by vertical hairlines (horizontal on desktop, 2-col grid on mobile). The standard way to show key numbers. |
| `MetricLabel` | Label text + subtle ⓘ (appears in `--text-3`, 14 px). Click/Enter opens the Metric drawer for that glossary id. Whole label is the button. |
| `Delta` | Text, not a pill: `▲ 4 bpm` / `▼ 12 min` / `Within usual`. Colour by *meaning* (`good: 'up'|'down'|'neutral'`): positive/caution/`--text-2`. |
| `StatusDot` | 6 px dot + text: `Within your usual range` (`--text-3` dot), `Above usual`/`Below usual` (`--caution`), `Better than usual` (`--positive`). |
| `Tag` | Small text tag, 6 px radius, `--surface-2` bg, `--text-2`. For "New record", "Estimate", "Garmin". Max one per row. |
| `RangeControl` | Segmented control `7D · 30D · 90D · 1Y` (Activities adds `All`). Same component, same position (page header right), URL param `?range=`. |
| `Tabs` | Underline tabs (2 px `--text` underline on active, `--text-2` inactive). No pills, no icons. |
| `DataTable` | Header row in `caption` style, right-aligned numeric columns with tabular figures, 44 px rows, hover `--surface-2`, whole-row links, sticky header on long tables, sortable columns where stated. |
| `Select`, `Combobox` | Radix Select styled like inputs; timezone uses Combobox with search. No native selects. |
| `Input`, `NumberInput`, `Switch`, `Slider` | 36 px, 8 px radius, `--border-strong`, focus ring 2 px `--accent` at 40%. |
| `Drawer` | Right-side sheet, 440 px desktop, full-height bottom sheet on mobile. Used for Metric info and filters. |
| `Dialog` | Centred, 480 px, for confirmations only. |
| `Popover`, `Tooltip` | Radix. Tooltip delay 400 ms. |
| `Banner` | Full-width thin bar above page content (demo mode, sync errors, key expiring). One at a time. |
| `Callout` | Inline neutral box (`--surface-2`, no border) with optional dismiss. Used for page intros and hints. |
| `EmptyState` | Small monochrome line icon (24 px), heading, 1–2 sentences explaining *why* and *what to do*, one action. No illustration, no mascot. |
| `ErrorState` | Same anatomy: "Couldn't load this section", technical detail in a disclosure, "Try again". |
| `Skeleton` | Static `--surface-2` blocks shaped like the content (no shimmer animation; optional 1.5 s opacity pulse when motion allowed). |
| `Disclosure` | "Show advanced metrics" text button with chevron; content lazy-mounted. |
| `Toast` | Bottom-right, ink background, white text, 4 s, optional Undo. |
| `CommandPalette` | ⌘K: pages, activities (server search), settings, actions (Connect, Sync now, Toggle theme, Take the tour). |
| `Kbd` | Keyboard key chip for shortcuts help. |

### 4.7 Charts (one chart language)

Rebuild `src/components/charts/` on Recharts with one `ChartFrame`:

- **Frame:** optional title (`heading`), the current value (`metric-md`) and a one-line reading
  of the chart in `--text-2` ("Averaging 7 h 02 min, 18 min less than the previous 30 days").
- **Heights:** S 120 px, M 200 px, L 280 px. Pick per page spec; don't invent sizes.
- **Axes:** no axis lines; horizontal gridlines only, 1 px `--border`, dashed `2 4`; ticks
  `caption` in `--text-3`; at most 4 Y ticks; **Y values in display units** (hours for sleep,
  clock times for bedtime, `m:ss` for pace with inverted axis, km/mi per preference).
- **Lines:** `type="linear"` (never `monotone`/spline), 1.75 px, no dots except the latest point
  and hovered point. **Gaps for missing days**, never zero, never interpolated (`connectNulls=false`).
- **Bars:** 2 px top radius, max 24 px wide, 40% gap. Current incomplete period drawn in
  `--data-1` at 40% opacity (no hatching). Goal line: 1 px dashed `--text-3` with a small label.
- **"Your usual range" band:** `--data-muted` fill at 40%, labelled once in the legend.
- **Tooltip:** `--surface` panel, border, date on the first line, values with units, "No data"
  for gaps. Crosshair: 1 px `--border-strong` vertical line.
- **Legends:** inline text with 8 px squares, above the chart, left aligned. Only when >1 series.
- **Accessibility:** every chart has `role="img"` with an `aria-label` summary and a
  "View as table" ghost button that swaps the chart for a `DataTable`.
- Chart colours are read from CSS variables through `useChartTheme()` (existing pattern), which
  re-reads on theme change.

Chart inventory: `TrendLine` (with optional band), `Bars` (single/stacked, goal line),
`RangeBars` (floating low–high, for Body Battery), `StageBar` (sleep stages, horizontal),
`ZoneBars` (Z5→Z1 horizontal), `Sparkline` (60×20, no axes), `CalendarHeatmap` (12 weeks,
single-hue 4 steps of `--data-1`), `StreamCharts` (activity: stacked, `syncId`, shared crosshair),
`RouteMap` (SVG, tile-free), `BulletChart` (value vs comparison band, for load), `ClockScatter`
(bedtime/wake per night, Y axis 18:00→12:00 wrapping, usual window band).

### 4.8 Iconography

- lucide-react at **16 px, stroke 1.5**, `--text-2`. Icons only where they aid scanning
  (sidebar, sport type in lists, actions). **No icons in section headings or metric labels.**
- Sport icons (monochrome): walking `Footprints`, running custom `RunIcon` (keep, restyle to
  1.5 stroke), cycling `Bike`, swimming `Waves`, strength `Dumbbell`, hiking `Mountain`,
  other `Activity`. Single mapping in `src/lib/sport.ts`.

### 4.9 Motion

- Durations: 120 ms (hover/press), 180 ms (popover, tabs), 240 ms (drawer, dialog).
  Easing `cubic-bezier(.2,0,0,1)`.
- No count-up numbers, no ring fill animations, no confetti, no hover lift.
- Drawers slide; popovers fade+scale from 98%. Respect `prefers-reduced-motion` and the
  in-app "Reduce motion" setting (instant changes).

---

## 5. Copy and voice

### 5.1 Voice

**Precise, plain, adult.** Like a good physician's summary or a well-written product: short
declarative sentences, second person, no hype.

Do:
- Lead with the fact, then the context: "7 h 15 min of sleep. 45 min less than you needed."
- Compare with the user's own baseline: "Within your usual range (52–58 bpm)."
- Use numbers with units, formatted per Section 9.2.
- Say what to do when it's useful: "Easy day recommended: sleep was short and HRV is below your
  usual range."
- Be honest about uncertainty: "Not enough readings yet — needs 14 nights."

Don't:
- No exclamation marks. No emoji. No "Nice!", "Great job", "You've got this", "Hey Alex".
- No slogans, eyebrows or taglines. No ALL CAPS.
- No anthropomorphised app ("I noticed…", "I'll help you…").
- No medical claims or diagnoses. No shaming ("You missed your goal").
- No raw identifiers or enums in UI text (`GOOD`, `AEROBIC_BASE`, `today_suggestion@1`).

Greeting: Overview shows the date as title ("Monday, 9 November") and a one-sentence summary
below; no "Good afternoon, Alex".

### 5.2 Rewrite rules for existing server sentences

`server/companion/messages.py` and sentence builders in `server/analytics/*` produce user-facing
text. Rewrite all of them to the voice above (one tone; remove `cheerful`/`calm` variants and
deterministic phrase rotation — one phrasing per message id is enough). Move them into
`server/copy/` (Section 10.3). Each sentence must be derived from the actual data it describes
(fixes 2.3.8).

### 5.3 Automated copy checks

`scripts/check_ui_rules.mjs` (V2-P1-T4) scans `src/**/*.tsx`, `src/content/**`, and
`server/copy/**` and fails on:
- `!` inside user-facing string literals/JSX text (allowlist: `!==`, `!=`, `!value` code),
- emoji (Unicode `\p{Extended_Pictographic}`),
- `uppercase` / `tracking-[` / `tracking-wide` Tailwind classes,
- the words `Pip`, `companion`, `confetti`, `streak flame`, `Hey `, `Nice`, `Great job`,
- hard-coded hex colours in `src/` outside `src/styles/tokens.css`,
- `type="monotone"` in charts,
- `<select` native elements.

---

## 6. Information architecture and navigation

### 6.1 Destinations

| # | Label | Route | Question it answers |
|---|---|---|---|
| 1 | **Overview** | `/` | How am I doing today and this week? |
| 2 | **Activities** | `/activities`, `/activities/:id` | What did I do, and how did it go? |
| 3 | **Health** | `/health/sleep`, `/health/heart`, `/health/body-battery`, `/health/stress`, `/health/steps` | How is my body doing? |
| 4 | **Trends** | `/trends`, `/trends/week/:weekStart` | Am I getting fitter? Am I consistent? |
| — | Guide | `/guide`, `/guide/:topic` | How does this app work? What does this metric mean? |
| — | Settings | `/settings` | Goals, units, zones, connection, data |

Redirects (keep old links working): `/today`, `/dashboard` → `/`; `/journey` → `/trends`;
`/progress`, `/training`, `/insights` → `/trends`; `/health` → `/health/sleep`;
`/health/energy` → `/health/body-battery`; `/recovery` → `/health/heart`; `/methods`,
`/research` → `/guide/methods`; `/welcome` stays. Unknown → `/` with a toast "Page not found".

### 6.2 Sidebar (desktop)

```
Open Garmin                       ← wordmark, 15 px, 600, --text. No logo tile.

  Overview                        ← 16 px icon + label, 36 px rows, --text-2;
  Activities                         active: --text + --accent-soft bg + 2 px accent bar left
  Health
  Trends

  ⌕ Search            ⌘K

  (flex space)

  ● Synced 12 min ago             ← caption; spinner + "Syncing 45%" while running;
                                     "Not connected" with link when no key; click → Settings › Connection
  Guide
  Settings
  [A] Alex              ⌄         ← account menu: Theme (Light/Dark/System), Take the tour,
                                     Keyboard shortcuts, Switch to sample data / my data, Sign out
```

Health sub-pages are **tabs on the Health page**, not sidebar children.

### 6.3 Mobile

- Top app bar: page title (left), search and help icons (right). No breadcrumbs.
- Bottom tab bar: Overview, Activities, Health, Trends, More (sheet with Guide, Settings, account
  menu items). Labels always visible, 11 px.

### 6.4 Demo mode

- A thin `Banner` across the top of the content area on every page:
  "You're viewing sample data. — Connect your Garmin to see your own. [Connect] [Hide]".
  "Hide" collapses it to a small "Sample data" tag next to the page title (persisted per session).
- No per-card "Sample data" badges anywhere.

### 6.5 Keyboard

`⌘K`/`Ctrl K` search · `g o` Overview · `g a` Activities · `g h` Health · `g t` Trends ·
`g s` Settings · `?` shortcuts help · `[` / `]` previous/next activity on detail · `Esc` closes.

---

## 7. The guidance system

This is the direct answer to "no introduction, no explanation". Six layers, from first launch to
deep reference. All copy lives in `src/content/` (TypeScript modules, typed) so it can be
reviewed in one place and reused (tour, drawers, Guide pages).

### 7.1 Welcome (`/welcome`, first run only — 3 steps)

Full-page, centred column (max 520 px), progress as "Step 1 of 3" text (no progress bars).

1. **What this is.** Title "See your Garmin data clearly." Three short rows with a 16 px icon:
   - "Sleep, heart rate, HRV, stress and activities in one private place."
   - "Every number compared with your own usual range."
   - "Runs on this computer. Your data never leaves it."
   Right side (desktop) or below (mobile): a **static, real screenshot-like render** of the
   Overview metric strip using demo numbers (render the actual `MetricStrip` component with
   fixture data, scaled 0.9, non-interactive). Buttons: **[Connect Garmin]** (primary) ·
   [Explore with sample data] (secondary). Link: "How does the Garmin connection work?" →
   opens Guide topic in a drawer.
2. **Connect** (only if chosen). The existing key flow (`ConnectFlow.tsx`), restyled as a
   numbered checklist: (1) Open Garmin Connect developer page ↗, (2) Create a personal key,
   (3) Paste it here. Each step has a 1-line explanation and a "Why?" disclosure. Security note:
   "Stored encrypted on this computer. You can remove it any time." After submit: live sync
   progress ("Importing the last 90 days — 34%") and the user can continue while it runs.
3. **Your weekly goal.** Two fields side by side: Active minutes per week (suggested value from
   `activity_goals.py` with the reason: "Based on your last 4 weeks") and Activities per week.
   Units (Metric/Imperial) and week start (Mon/Sun) inline below. Copy: "You can change this any
   time in Settings." Button: **[Go to Overview]**.

Then land on Overview and **offer the tour** (7.2) with a `Callout`:
"New here? Take a 1-minute tour of the Overview. [Start tour] [Not now]".

Preferences written: `onboarded`, `weekly_minutes`, `weekly_sessions`, `units`, `week_start`.
Removed from onboarding: goal focus picker, journey picker, companion name/tone, theme.

### 7.2 Guided tour (coach marks)

- 5 steps on Overview, then optional 2 steps on an activity detail:
  1. Sidebar — "Four places: Overview, Activities, Health, Trends."
  2. This week — "Progress towards your weekly goal. Active minutes come from your watch's
     intensity minutes."
  3. Metric strip — "Last night's readings. Click any label to learn what it means and what's
     normal for you." (opens the Sleep drawer as a demo, then closes it)
  4. Today guidance — "A suggestion for today based on sleep, HRV, Body Battery and recent load.
     Not medical advice."
  5. Search — "Press ⌘K to jump to any activity or page."
  6–7 (on first visit to an activity detail): charts/map sync; notes.
- Implementation: `src/features/tour/` — a spotlight overlay (SVG mask around the target's
  `getBoundingClientRect`, 8 px padding, 12 px radius) + Radix Popover anchored to the target;
  `Back`, `Next`, `Skip tour`, "2 of 5". Targets marked with `data-tour="week"` etc. Focus is
  trapped in the popover; `Esc` skips. Re-measures on resize/scroll. No new dependency.
- Persisted in prefs `tour_completed: string[]` (ids: `overview`, `activity`). Replay from the
  account menu, the Guide, or the command palette.

### 7.3 Page intros

- Every page has a one-line description under the title (Appendix B).
- First visit to each page shows a `Callout` under the header with 2–3 bullets "How to read this
  page" and a "Got it" dismiss (Appendix B). Dismissed ids stored in prefs
  `dismissed_hints: string[]`. After dismissal, the same content is available via
  "ⓘ About this page" next to the description.

### 7.4 Metric drawer (the core explanation surface)

Every metric label in the app (`MetricLabel`) opens the same right-side `Drawer`:

```
Resting heart rate                                              ✕
Your heart rate when fully at rest, measured by your watch overnight.

Your number           54 bpm   last night
Your usual range      52–58 bpm   (median of last 30 days ± typical variation)
[ TrendLine S, last 30 days with usual band ]

How to read it
A lower resting heart rate over months usually means better aerobic fitness.
A sudden rise of 5+ bpm above your usual can follow poor sleep, stress, alcohol or illness.

Where it comes from
Garmin · Reported by your watch.  →  How we use it (method)

Related   HRV · Sleep · Stress
```

- Content: `src/content/glossary.ts` keyed by metric id (Appendix A lists all ids and copy).
- Personal numbers come from a new endpoint `GET /api/metrics/:id/summary` (Section 10.2).
- "How we use it" links to `/guide/methods#<method-id>`.
- The drawer is also reachable from the Guide's metric index and the command palette
  ("Explain: HRV").

### 7.5 Guide (`/guide`)

Replaces "How it works"/Methods/Research as the help centre. Left list of topics, content right.

- **Getting started**: what the app does, the four pages, demo vs your data, take the tour.
- **Connecting Garmin**: the key, what is synced, how often (hourly), how to import history,
  how to disconnect, troubleshooting (expired key, 429 rate limit, no data yet).
- **Understanding your metrics**: index of every glossary entry; each opens its drawer.
- **How the numbers are calculated**: the existing methods registry (`GET /api/methods`),
  restyled as readable sections with formula blocks.
- **Research**: the existing research library (claims + sources), restyled as a table with
  search.
- **Privacy and your data**: what's stored where, exports, deletion.
- **Why don't my numbers match Garmin Connect?**: rounding, time zones, sync timing, missing
  detail files, app-calculated vs Garmin-reported.
- **Keyboard shortcuts**.
- Disclaimer: not affiliated with Garmin; not medical advice.

### 7.6 Empty and partial states that teach

Every section defines three texts: *why it's empty*, *what will appear*, *what to do*. Examples:

| Situation | Heading | Body | Action |
|---|---|---|---|
| Connected, first sync running | Importing your data | Recent days arrive first, usually within a minute. Older history continues in the background. | Progress bar (job %) |
| No HRV readings | No HRV readings yet | HRV needs a compatible watch worn overnight. Readings appear after the next sync. | Which watches support HRV? → Guide |
| Activity without details | Detailed data not downloaded | The map, charts and splits need the activity's original file from Garmin. | [Download details] |
| Trends need more data | Needs 4 weeks of data | Trends compare recent weeks with earlier ones. You have 9 days so far. | — |
| Search no results | No activities match "park" | Try a different word or clear the sport filter. | [Clear filters] |

### 7.7 Help menu

`?` in mobile top bar and the account menu on desktop: Take the tour · Guide · Keyboard
shortcuts · What's new (short changelog in `src/content/changelog.ts`).

---

## 8. Page specifications

All pages follow the anatomy in 4.5, handle loading (skeleton), empty (7.6), error, and data
states, and use only the components in 4.6/4.7. Spans refer to the 12-column grid.

### 8.1 Overview (`/`)

Purpose: in 5 seconds, know how last night went, how the week is going, and what's sensible today.

```
Monday, 9 November                                                     (no range control)
Short sleep and HRV below your usual — an easy day makes sense. 20 of 150 active minutes so far.
───────────────────────────────────────────────────────────────────────────────────────────
[Demo banner if demo]

Last night                                                                    span 12
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ Sleep ⓘ          │ Resting HR ⓘ     │ HRV ⓘ            │ Body Battery ⓘ   │
│ 7 h 15 min       │ 56 bpm           │ 48 ms            │ 72  at wake      │
│ ▼ 45 min vs need │ Within usual     │ ▼ Below usual    │ ▲ 6 vs usual     │
│ ~~~~ sparkline   │ ~~~~             │ ~~~~             │ ~~~~             │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘

This week                                     span 7 │ Today                       span 5
┌────────────────────────────────────────────────┐ │ ┌──────────────────────────────────┐
│ 20 / 150 active min   ▬▬▬▬▬▭▭▭▭▭▭▭▭▭▭  13%    │ │ │ Easy day                          │
│ 1 of 3 activities · 37 min recorded            │ │ │ Sleep was 45 min short and HRV is │
│ ▁ ▂ ▁ ▁ ▁ ▁ ▁   daily active minutes M–S       │ │ │ below your usual range. A walk or │
│                                                │ │ │ gentle ride fits today.           │
│ Ramp: on track (see Trends)                    │ │ │ · Sleep 7 h 15 min (need 8 h)     │
└────────────────────────────────────────────────┘ │ │ · HRV 48 ms (usual 52–63)         │
                                                   │ │ · Body Battery 72                 │
                                                   │ │ How this works →                  │
                                                   │ └──────────────────────────────────┘

Recent activities                                              View all →     span 12
 [icon] Park walk        Today, 10:12        3.1 km    37:12    11:53 /km    112 bpm
 [icon] Strength         Sun, 09:50          —         32:05    —            117 bpm
 [icon] Easy run         Sat 7 Nov, 08:43    5.4 km    35:02    6:28 /km     142 bpm

Worth knowing                                                                span 12
 · Sleep has been 30 min shorter than your 90-day average for 2 weeks.          →
 · Resting heart rate is at its lowest in 6 months.                             →
 (max 3, each links to the relevant page; source footnote below)

How do you feel today?   1  2  3  4  5   Add note                      (one line, optional)
```

- Uses one request `GET /api/overview` (Section 10.2), polled every 60 s while visible and
  refetched when a sync job finishes.
- The summary sentence under the title is server-generated (`copy.overview_summary`).
- "This week" active minutes and "recorded" time are **both labelled** (fixes 2.3.1).
- Mobile order: summary → Last night (2×2 grid) → Today → This week → Recent → Worth knowing →
  How do you feel.
- No customisation. No milestone, streak, check-in form, or recap banner.

### 8.2 Activities (`/activities`)

```
Activities                                        [7D 30D 90D 1Y All]  [List | Calendar]
Every activity synced from your watch. Select one for its map, charts and splits.
──────────────────────────────────────────────────────────────────────────────────
┌ MetricStrip: Activities 21 │ Time 12 h 08 min │ Distance 77.7 km │ Effort 1,318 pts ┐
[Search activities…]   [Sport ▾ (multi)]                               [Compare]
DataTable grouped by week:
  This week · 1 activity · 37 min                                              (caption)
  Sport  Name / date            Distance   Time     Pace/Speed   Avg HR   Effort
  ⋯
```

- Table columns with headers; numeric right-aligned; sport-specific pace/speed column header
  reads "Pace / speed". Effort column shows points with a tiny 5-segment zone bar **with a
  tooltip legend** and a column-header ⓘ (drawer: Effort).
- Records set in an activity show a `Tag` "Record" after the name (max one tag).
- Filters in URL (`?q=&sport=&range=`). Sport filter is a multi-select popover, not a row of chips.
- Calendar view: month grid, each day shows up to 3 small monochrome sport icons and total
  minutes; week totals column on the right; click day → drawer with that day's activities and
  that night's sleep.
- Compare: select 2–4 rows (checkbox column appears) → sticky bottom bar → `/activities/compare?ids=`
  page (not a dialog) with side-by-side `DataTable` and overlaid HR/pace charts.
- Infinite scroll (cursor, 50).

### 8.3 Activity detail (`/activities/:id`)

```
← Activities
Easy run                                                          [Export ▾]  [⋯]
Saturday 7 November 2026 · 08:43 · Forerunner 165 · Mount Royal
Mostly easy effort, 0:12 faster per km than your average easy run this month.   (one sentence)
──────────────────────────────────────────────────────────────────────────────────
MetricStrip (sport-specific, 6 max): Distance · Time · Avg pace · Avg HR · Elevation gain · Effort

Route   span 7                                 │ Effort   span 5
[RouteMap 360 px, colour by Pace|HR|Elevation] │ ZoneBars Z5→Z1 with zone names + minutes
                                               │ Training effect: Aerobic 2.4 Maintaining
                                               │                  Anaerobic 0.3 No effect
                                               │ Primary benefit: Base  · Body Battery −8
Charts   [Time | Distance]                                                       span 12
StreamCharts: Pace · Heart rate (zone bands) · Elevation · Cadence · Power (only those present)

Splits | Laps   (Tabs)                                                           span 12
DataTable: km · time · pace · HR · elev ± · relative pace bar

Notes                                                                            span 12
How did it feel? 1–5 (watch value pre-filled) · Effort (RPE 1–10) · Note · Tags  (autosave)

▸ Show advanced metrics: running form, efficiency, pace at HR, power zones, best efforts,
  raw session fields
```

- Strength: replace Route/Charts/Splits with an Exercises table (sets, reps, weight) and HR chart.
- No details: Route+Charts area replaced by the empty state from 7.6 with [Download details].
- Previous/next activity arrows in the header (`[`/`]`).
- Training-effect labels and `trainingEffectLabel` mapping as in v1 plan 6.5 (keep).

### 8.4 Health (`/health/:tab`)

Tabs: **Sleep · Heart · Body Battery · Stress · Steps**. Range control in the header
(`7D 30D 90D 1Y`, default 30D, in URL). Every tab has the same structure:

1. **Latest** — `MetricStrip` (hero metric first, 3–4 supporting).
2. **Main trend** — `TrendLine`/`Bars` L with "your usual range" band, chart reading sentence.
3. **Secondary chart(s)** — M, in a 6+6 row.
4. **What this means** — a short paragraph from the glossary + "Learn more" (drawer).
5. Source footnote.

| Tab | Latest strip | Main chart | Secondary |
|---|---|---|---|
| Sleep | Duration (hero, vs need) · Sleep score (Garmin) · Bedtime · Wake · Awakenings | Duration bars in **hours**, stacked by stage, need as dashed line | `StageBar` for last night with Garmin optimal ranges **in %** (2.4.2) · `ClockScatter` bedtime/wake with usual window |
| Heart | Resting HR (hero) · HRV last night · HRV 7-day avg · HRV status (Garmin, humanised) | Resting HR `TrendLine` with usual band | HRV `TrendLine` (daily dots + weekly avg) with Garmin balanced band · Max/min HR range |
| Body Battery | At wake (hero) · Highest · Lowest · Charged · Drained | `RangeBars` daily low–high | Activity impacts table (activity → change) · Charged vs drained bars |
| Stress | Average (hero) · Rest time · Low · Medium · High | Stacked bars (rest/low/med/high minutes, Y in hours) | Average stress `TrendLine` · Explanation that exercise raises measured stress |
| Steps | Today (hero, vs goal) · 7-day average · Floors · Intensity minutes this week | Steps bars with goal line | Intensity minutes weekly bars vs Garmin goal |

Humanise every Garmin enum (`GOOD` → "Good", `BALANCED` → "Balanced", `UNBALANCED` →
"Unbalanced", `LOW` → "Low", `POOR` → "Poor"); one mapping in `src/lib/garminLabels.ts`.

### 8.5 Trends (`/trends`)

```
Trends                                                               [30D 90D 1Y]
How your fitness, volume and consistency are changing over time.
────────────────────────────────────────────────────────────────────────
Fitness signals                                                       span 12
DataTable-like rows (no cards):
  Resting heart rate     56 → 54 bpm      ▼ 2 bpm   Improving     [sparkline]   →
  Efficiency             1.42 → 1.47 m/beat  ▲ 3.5%  Improving    [sparkline]   →
  Longest activity       36:00 → 39:00    ▲ 3 min   Steady        [sparkline]   →
  VO2 max (Garmin)       44 → 45          ▲ 1       Improving     [sparkline]   →
  (status words: Improving / Steady / Declining / Not enough data; declining is neutral grey text)

Volume                                         [Time | Distance | Effort]     span 12
Weekly Bars L, stacked by sport only when >1 sport, goal line for Time, current week 40%.

Consistency  span 6                         │ Load  span 6
CalendarHeatmap 12 weeks                    │ BulletChart: this week vs 4-week average band
"Active on 20 of the last 28 days."         │ "On track" / "Higher than usual" / "Lighter week"
"Weekly goal met 22 weeks in a row (best 28)."│ "Too early in the week to compare" before day 4

Records                                                              span 12
DataTable: Record · Value · Date · Activity →   (Fastest 1 km / 1 mi / 5 km / 10 km, longest
run / walk / ride, longest activity, most active week). "New" tag if within 14 days.

Weekly reports                                                       span 12
Last 8 weeks as rows: Week of 2 Nov · 2 h 48 min · 5 activities · goal met ✓ → report.
"Show all weeks" expands (paginated by 12).

▸ Show advanced analysis: effort over time (acute/chronic), intensity mix, primary benefit mix,
  pace at heart rate, running form trends, 5K estimate, relationships explorer.
```

### 8.6 Weekly report (`/trends/week/:weekStart`)

A calm, printable document page (max-width 720 px): title "Week of 2 November", summary
sentence, MetricStrip (active minutes vs goal, activities, distance, effort), daily bars,
activities table, sleep/RHR/HRV averages vs previous week with deltas, records set,
"Compared with your previous 4 weeks" paragraph. `Print` button uses a print stylesheet.
Data: existing `reports.py` weekly recap (reshaped, Section 10.2).

### 8.7 Guide — see 7.5.

### 8.8 Settings (`/settings`)

One scrolling page, max-width 720 px, with a sticky in-page section index on the left (desktop).
Sections, each a `Section` with rows (label + description left, control right, hairline between):

1. **Goals** — Weekly active minutes · Activities per week · Daily steps goal (Use Garmin's /
   Custom number).
2. **Units and region** — Units · Week starts on · Time zone (Combobox, browser zone first).
3. **Heart-rate zones** — Source (From your watch / Custom) · Max HR (custom only, with
   suggestion) · zone table preview.
4. **Appearance** — Theme (Light / Dark / Match system, as 3 small visual swatches) · Reduce motion.
5. **Garmin connection** — status row, last sync, newest data, key expiry · [Sync now]
   [Import history ▾ 90 days / 1 year] [Replace key] [Disconnect].
6. **Your data** — Export (JSON / CSV) · Delete imported data · Delete workspace (Dialog with
   typed confirmation).
7. **Help** — Replay welcome · Take the tour · Reset hints.
8. **About** — version, licence, not affiliated with Garmin, not medical advice.

**Autosave**: each control saves on change (debounced 500 ms for text/number) with an inline
"Saved" caption that fades after 2 s; errors inline under the control. No global Save button.
Removed: display-name prominence (keep in account menu), companion settings, primary sport,
goal focus.

---

## 9. Consistency contract

### 9.1 Vocabulary (use exactly these words in UI, API copy, Guide)

| Concept | Term | Never |
|---|---|---|
| A recorded workout | **activity / activities** | session, workout (except "Strength workout" as a name) |
| Garmin intensity minutes (moderate + 2× vigorous) | **active minutes** | moved, minutes moved, intensity minutes (except when citing Garmin) |
| Total recorded time of activities | **activity time** | active minutes, moved |
| App-calculated TRIMP | **effort** (unit **pts**) | effort points, training load, load points |
| Garmin's 0–100 energy | **Body Battery** | energy |
| Resting heart rate | **resting HR** (label), "resting heart rate" (prose) | RHR |
| Heart rate variability | **HRV** | — |
| Personal best | **record** | PB, best, milestone |
| User's baseline range | **your usual range** | normal, typical, average range |
| This week vs 4-week average | **load** | ramp, ramp check |
| The daily recommendation | **Today** (panel title), "suggestion" (prose) | readiness, Pip says |
| Data from the watch | **Garmin** | measured, device |
| App computations | **Calculated** | derived, estimated (unless it is an estimate: then **Estimate**) |

Add `src/content/vocabulary.ts` exporting these labels; components import labels from there.

### 9.2 Formatting (single module `src/lib/format.ts`, server mirror in `server/copy/format.py`)

| Kind | Format | Examples |
|---|---|---|
| Duration, summary | `H h MM min`, `M min` under 1 h | `7 h 15 min`, `37 min`, `12 h 08 min` |
| Duration, activity/table | clock | `37:12`, `1:04:12` |
| Pace | `m:ss /km` or `/mi` | `6:28 /km` |
| Speed | 1 decimal | `17.2 km/h` |
| Distance | 1 decimal (2 under 1 km in tables) | `5.4 km`, `0.85 km` |
| Heart rate | integer | `142 bpm` |
| HRV | integer | `48 ms` |
| Counts | locale grouping | `9,427 steps`, `1,318 pts` |
| Percent | integer | `13%` |
| Date, list | relative within 6 days, else short | `Today, 10:12`, `Sun, 09:50`, `7 Nov`, `7 Nov 2025` (other year) |
| Date, title | long | `Monday, 9 November` |
| Week | `Week of 2 Nov` | — |
| Clock time | 24 h or 12 h from browser locale | `22:56` / `10:56 pm` |
| Missing | `—` + caption "No reading" | never `0`, never blank |
| Pluralisation | `plural(n, 'activity', 'activities')` | `1 activity` |

Units follow the user's metric/imperial preference **everywhere, including server sentences**
(server formats with the user's prefs; fixes 2.3.7). The API returns raw numbers + unit; text
sentences arrive pre-formatted from the server using `server/copy/format.py`. Both formatters
share a fixture test (`tests/fixtures/format_cases.json`) so client and server agree.

### 9.3 One number, one source

- **Week summary** is computed once on the server (`analytics/activity_goals.py`) and reused by
  Overview, Activities header (for "This week"), Trends, and the Weekly report. Never recomputed
  in React.
- **Usual range** for any daily metric: one function `usual_range(values, days=30)` in
  `analytics/common.py` (median ± MAD-based spread, min 14 readings) used by Overview, Health,
  Metric drawer and insights.
- **Sentences reference the numbers on screen.** If a sentence mentions a value, the same value
  appears formatted identically nearby.

### 9.4 Sources

Each section has one footnote line (caption): "Source: Garmin" / "Calculated from your
activities · How?" / "Garmin + calculated · How?". The "How?" opens the method in the Guide.
Per-metric source is in the Metric drawer. No source pills in headers.

---

## 10. Backend and API changes

Keep everything not mentioned here.

### 10.1 Fixes (correctness)

| Issue | Fix | File(s) |
|---|---|---|
| Sleep stage optimal ranges shown as minutes | Return `optimal_range_pct: [lo, hi]` and also `optimal_range_minutes` computed from total sleep | `analytics/sleep.py`, wellness API |
| Bedtime as raw minutes | Return `bedtime_minutes_from_noon` / `wake_minutes_from_noon` (0–1440 from 12:00) so the chart never wraps; plus usual window in same units | `analytics/sleep.py` |
| Load judged on day 1 | If fewer than 4 days elapsed in the week: `status="too_early"`, no ratio judgement | `analytics/load.py` |
| Fitness signal rounding | Return values at precision appropriate to the metric (efficiency 2 decimals, durations in seconds + formatted) and `unit` | `analytics/fitness.py` |
| Canned "Close to your usual." / HRV sentence | Compute status vs `usual_range` and build the sentence from it | `api/today.py` → `server/copy/` |
| Hard-coded km | Format distances with user units | `api/today.py` and any `f"... km"` (grep `" km"` in `server/`) |
| "Moved" mixes definitions | Week summary exposes `active_minutes` (Garmin intensity) and `activity_seconds` separately with labels; insights use the vocabulary in 9.1 | `analytics/activity_goals.py`, `analytics/insights.py` |
| Raw enums in text | Server sentences humanise Garmin enums | `server/copy/` |

### 10.2 API surface

New / changed (update `docs/api-schemas/*.json` via `scripts/export_api_schemas.py`, keep
`tests/test_contract.py` passing; mirror under `/api/demo`):

- `GET /api/overview` — replaces the Today payload for the UI:
  `{ date, summary_sentence, last_night: {sleep, resting_hr, hrv, body_battery} (each: value,
  unit, usual_range, status, delta, spark[]), week: {active_minutes, goal_minutes,
  activity_count, goal_activities, activity_seconds, daily_active_minutes[7]}, today:
  {kind, title, sentence, reasons[{label, value, usual}]}, recent_activities[3], notes[≤3],
  feeling_today }`. Keep `/api/today` for one release returning the same object (alias), then
  remove.
- `GET /api/metrics/{metric_id}/summary?days=30` — for the Metric drawer: `{ id, latest, unit,
  usual_range, series[{date, value}], source, method_id }`. Metric ids from Appendix A.
- `GET /api/trends?range=` — merges what `/api/progress/*` returned: `signals`, `volume`,
  `consistency` (incl. `goal_weeks_in_a_row`, `best_goal_run`), `load`, `records`,
  `weeks[]` (summary rows).
- `GET /api/reports/week/{week_start}` — weekly report (reshaped from `reports.py`).
- `PATCH /api/preferences` — accepts new fields `tour_completed: list[str]`,
  `dismissed_hints: list[str]` (ids validated against a known set) and drops UI use of
  `companion_*`, `goal_focus`, `today_layout`, `journey`, `primary_sport` (keep accepting them
  for backward compatibility; ignore in UI). Change default `theme` to `"system"`.
- **Remove from router** (keep code until V2-P7 cleanup, then delete with tests adapted):
  journey selection/pause/repeat, milestone list/seen, story/recap viewer endpoints, companion
  message endpoints. Keep check-in POST/GET (reused by "How do you feel today?").

### 10.3 Copy module

Create `server/copy/` with `format.py` (units/durations/dates per 9.2), `sentences.py` (all
user-facing sentence builders, one phrasing each, voice per 5.1), `labels.py` (Garmin enum →
label). Move sentence code out of `companion/messages.py`, `analytics/*` into it. Unit tests
for every sentence builder with at least: normal, missing data, imperial units.

### 10.4 Demo realism

The demo is the first impression. `server/demo/generator.py` must produce a year that looks
real:
- Weekly active minutes vary (roughly 60–260, a deload week every ~5 weeks, one 10-day illness
  gap with elevated resting HR and low HRV, one holiday week with no activities).
- Not every day has every metric (≈5% of nights missing sleep, ≈10% missing HRV).
- Records set at plausible times (a few in the last 60 days so "New" tags appear).
- A gradual fitness improvement (RHR −3 bpm over the year, efficiency +4%).
- Investigate and fix the flat 120-minute weeks (2.4.10).
- Deterministic (seeded); `tests/test_demo_generator.py` asserts the variability properties.

---

## 11. Phased task list

Format per task: **Goal · Files · Steps · Acceptance**. Run the 0.2 checks after each task.

### Phase 0 — Baseline

**V2-P0-T1 Branch and baseline.**
Files: none. Steps: create `redesign-v2`; run all checks; capture current screenshots to
`docs/screenshots/v2-before/` with the existing Playwright setup.
Acceptance: all checks green (or failures recorded in `docs/baseline-v2.txt` and reported).

### Phase 1 — Correctness and consistency foundation (‖ T1–T3, then T4)

**V2-P1-T1 ‖ Copy module and formatters (server).**
Files: `server/copy/{__init__,format,sentences,labels}.py`, `tests/test_copy.py`,
`tests/fixtures/format_cases.json`. Steps: implement 9.2 formats and 10.3; move sentence
builders; remove tone variants. Acceptance: tests cover every format kind in metric and imperial;
`grep -rn '" km"' server/` returns nothing outside `copy/format.py`.

**V2-P1-T2 ‖ Analytics fixes.**
Files: `server/analytics/{sleep,load,fitness,activity_goals,insights,common}.py` + tests.
Steps: all rows of 10.1; add `usual_range()`. Acceptance: new tests for each fix (stage % range,
bedtime from noon, `too_early` load, efficiency precision, separate active/activity time).

**V2-P1-T3 ‖ Demo realism.**
Files: `server/demo/generator.py`, `tests/test_demo_generator.py`. Steps: 10.4.
Acceptance: test asserts weekly active-minute std-dev > 30, ≥1 zero-activity week, missing-night
ratio 3–8%, ≥2 records in last 60 days; seed time < 3 s.

**V2-P1-T4 Frontend formatters, vocabulary, UI rules script.**
Files: `src/lib/format.ts` (+ tests using the shared fixture), `src/lib/garminLabels.ts`,
`src/content/vocabulary.ts`, `scripts/check_ui_rules.mjs`, `package.json` script
`check:ui`. Steps: 9.1, 9.2, 5.3. The rules script runs in report mode (warn) until Phase 5
ends, then in fail mode (flag `--strict`, added to CI in V2-P6). Acceptance: format tests pass
against the shared fixture; script runs and lists current violations.

**Phase 1 exit:** all checks green; server sentences pass the voice tests.

### Phase 2 — Design foundation (‖ T2–T4 after T1)

**V2-P2-T1 Tokens, fonts, base styles.**
Files: `src/styles/tokens.css`, `src/styles/index.css`, `src/styles/fonts.css`,
`package.json`, `scripts/check_contrast.mjs`. Steps: 4.1–4.3; theme default `system`; remove
Barlow; Tailwind `@theme` mappings for every token. Acceptance: contrast script passes for both
themes; no hex colours in `src/` outside tokens (rules script).

**V2-P2-T2 ‖ Core components.**
Files: `src/components/ui/*` — Button, IconButton, Panel (replaces Card), Section, Tag,
RangeControl, Tabs, DataTable, Select, Combobox, Input, NumberInput, Switch, Slider, Drawer,
Dialog, Popover, Tooltip, Banner, Callout, EmptyState, ErrorState, Skeleton, Disclosure, Toast,
Kbd. Steps: 4.6. Remove `Badge`/`SourceBadge` usage from the kit. Acceptance: vitest per
component (accessible name, keyboard, states).

**V2-P2-T3 ‖ Data components.**
Files: `src/components/data/{Metric,MetricStrip,MetricLabel,Delta,StatusDot}.tsx`.
Acceptance: Metric renders missing as `—` + "No reading"; Delta colours by meaning; MetricLabel
is a button with accessible name "About <metric>".

**V2-P2-T4 ‖ Chart kit.**
Files: `src/components/charts/*`. Steps: 4.7 (ChartFrame + inventory, `ClockScatter`,
`BulletChart`, `RangeBars` new; restyle others; delete `Gauges.tsx` ring/segment gauges except a
minimal `SegmentScale` for training effect). Acceptance: tests for gaps (null → break), Y-axis
formatters (hours, clock, pace inverted), "View as table" toggle.

**V2-P2-T5 Dev gallery and design checkpoint.**
Files: `src/gallery.tsx` → `/dev/components` (dev only). Steps: show every component in all
states, both themes; capture `docs/screenshots/v2/gallery-{light,dark}.png`.
Acceptance: **STOP. Show the user the gallery screenshots and a mock Overview built from
gallery components with demo data. Proceed only after explicit approval.** Record feedback in
the commit body of follow-up fixes.

### Phase 3 — Shell, navigation, removal

**V2-P3-T1 App shell.**
Files: `src/app/AppShell.tsx`, `src/layout/{SideNav,MobileTopBar,BottomTabBar,AccountMenu,PageHeader}.tsx`,
delete `src/layout/TopBar.tsx`, update `src/layout/navigation.ts`. Steps: 6.2, 6.3, 4.5.
Acceptance: no breadcrumb anywhere; sidebar full height; tests for active state and redirects.

**V2-P3-T2 Routes and redirects.**
Files: `src/app/routes.tsx` (or current router file). Steps: 6.1 table. Acceptance: test that
every old path redirects to the right new path.

**V2-P3-T3 Demo banner and sync status.**
Files: `src/components/ui/Banner.tsx` usage, `src/app/WorkspaceProvider.tsx`. Steps: 6.4;
remove all per-card "Sample data" badges. Acceptance: grep for `Sample data` finds only the
banner and tag.

**V2-P3-T4 Remove the playful layer.**
Files: see Appendix C. Steps: delete Pip, Celebration, CompanionMessage, Journey page,
StoryViewer, EditMyDay, dnd-kit and canvas-confetti deps; remove related tests (not security or
analytics tests); router entries per 10.2. Acceptance: `npm ls canvas-confetti @dnd-kit/core`
empty; rules script finds no `Pip`/`confetti`; build size reported in commit body.

**V2-P3-T5 Command palette and shortcuts.**
Files: `src/layout/CommandPalette.tsx`, `src/features/shortcuts/`. Steps: 4.6, 6.5.
Acceptance: tests for ⌘K open, `g a` navigation, `?` help dialog.

### Phase 4 — Guidance system (‖ T2–T4 after T1)

**V2-P4-T1 Content modules.** Files: `src/content/{glossary,pageIntros,guide,changelog}.ts`.
Steps: transcribe Appendices A and B; types enforce required fields. Acceptance: test that every
`MetricLabel` id used in `src/` exists in the glossary (static scan).

**V2-P4-T2 ‖ Metric drawer + endpoint.** Files: `server/api/metrics.py`, tests;
`src/features/metric-drawer/`. Steps: 7.4, 10.2. Acceptance: drawer opens from any MetricLabel,
shows personal latest/usual range/30-day chart; works in demo; keyboard + focus return tested.

**V2-P4-T3 ‖ Welcome flow.** Files: `src/pages/Welcome/*` (replaces Onboarding), restyled
`src/components/connection/ConnectFlow.tsx`. Steps: 7.1. Acceptance: 3 steps; skippable;
demo path lands on Overview with tour callout; prefs persisted; existing onboarding tests adapted.

**V2-P4-T4 ‖ Tour.** Files: `src/features/tour/*`, `data-tour` attributes. Steps: 7.2.
Acceptance: tests for step navigation, skip, persistence, replay; reduced motion respected;
target re-measure on resize.

**V2-P4-T5 Page intros and hints.** Files: `PageHeader`, `Callout`; prefs fields. Steps: 7.3.
Acceptance: first visit shows callout; dismissal persists across reload (live and demo).

**V2-P4-T6 Guide page.** Files: `src/pages/Guide/*` (replaces Methods). Steps: 7.5 (methods and
research content restyled). Acceptance: every topic renders; deep links `/guide/methods#id` scroll
to the method.

### Phase 5 — Pages (‖ each, after Phase 4)

**V2-P5-T1 Overview** (8.1, `GET /api/overview`).
**V2-P5-T2 Activities list, calendar, compare page** (8.2).
**V2-P5-T3 Activity detail** (8.3).
**V2-P5-T4 Health tabs** (8.4).
**V2-P5-T5 Trends + weekly report** (8.5, 8.6, `GET /api/trends`, `/api/reports/week/:id`).
**V2-P5-T6 Settings** (8.8, autosave).

Each page task: Files: `src/pages/<Page>/*` (≤ 200 lines per file) + page test + server endpoint
changes if listed. Acceptance for every page:
- Matches the wireframe structure and spans; rows even at 1440 and 1024 widths.
- Loading, empty (7.6 copy), error, data states tested.
- Every metric label opens the drawer.
- Light/dark/mobile screenshots saved to `docs/screenshots/v2/<page>-*.png` and checked
  against Appendix D by the agent (list any failing items in the commit body and fix them).
- No Phase 1 rules-script violations in the page's files.

**Phase 5 exit:** rules script switched to `--strict` and passing.

### Phase 6 — Quality

**V2-P6-T1 Visual QA pass.** Walk every page at 1440, 1024, 390 widths in both themes; fix
against Appendix D. Produce `docs/screenshots/v2/` final set.

**V2-P6-T2 Cross-page consistency test.** Playwright (demo workspace): read "active minutes this
week" from Overview, Trends weekly row and the weekly report — equal. Same for last night's sleep
(Overview vs Health › Sleep), resting HR (Overview vs Heart), activity count this week
(Overview vs Activities). Fails on mismatch.

**V2-P6-T3 Accessibility.** axe-core in Playwright for every page (0 serious/critical), full
keyboard walkthrough of welcome → tour → drawer → settings, focus visible everywhere, charts have
table alternatives.

**V2-P6-T4 Performance.** Route-level code splitting; initial JS < 250 KB gzip (report actual);
Overview interactive < 1 s on local server with demo data; no request waterfalls (one query per
page section max).

**V2-P6-T5 User review.** Stop and present the screenshot set and a 5-line summary to the user.
Apply requested changes as V2-P6-T5a, T5b…

### Phase 7 — Cleanup and docs

**V2-P7-T1** Delete unused server endpoints/modules from 10.2 (journeys, milestones, stories,
companion messages) and their tests; keep DB tables. **V2-P7-T2** Update README (new
screenshots, new navigation), `docs/METHODS.md`, `CONTRIBUTING.md` (design rules link to this
plan's Sections 4, 5, 9). **V2-P7-T3** Verify live workspace with the user's real data in local
mode (read-only checks via `scripts/validate_live.py`), report anything that renders empty.

---

## 12. Verification and QA

- **Unit:** pytest for analytics, copy, API contracts; vitest for components, formatters,
  pages.
- **Contract:** `tests/test_contract.py` validates every response against `docs/api-schemas/`.
- **E2E:** Playwright desktop 1440×900 and mobile 390×844, light and dark; routes, redirects,
  welcome, tour, drawer, settings autosave, consistency test, axe.
- **Static rules:** `check_ui_rules.mjs --strict`, `check_contrast.mjs`, ESLint, Prettier, ruff.
- **Visual:** screenshots reviewed by the agent against Appendix D at the end of every UI task,
  and by the user at the two checkpoints (V2-P2-T5, V2-P6-T5).
- Every item in Section 2 is re-checked in V2-P6-T1 and marked fixed in the commit body.

---

## 13. Guardrails

- Never delete, overwrite, reset or commit `.runtime/`.
- Never weaken security (CSRF, origin checks, CSP, rate limits, key encryption) or remove a
  security test.
- Never invent data or Garmin endpoints. Missing stays missing.
- No external network calls from the browser (no CDNs, Google Fonts, map tiles, analytics).
- No destructive DB migrations; only additive tables/fields.
- No medical claims. Keep "not medical advice" in the Today panel footnote and the Guide.
- No Garmin logos or copied Garmin artwork; "Garmin", "Body Battery" are referenced as the
  source of data only.
- Don't add a dependency without stating why in the commit body; prefer what's installed.
- Don't skip the two user checkpoints.

---

## 14. Decisions made, and open questions

### 14.1 Decisions (follow; the user can overturn them at a checkpoint)

1. Remove the mascot, confetti, emoji, journeys, milestone badges, streak card, story viewer,
   Edit My Day.
2. Four primary destinations: Overview, Activities, Health, Trends; plus Guide and Settings.
3. Monochrome UI with ink primary buttons and a single restrained indigo accent.
4. Geist (fallback Inter), no condensed numerals, no uppercase labels.
5. Theme default: match system.
6. Explanations through a single Metric drawer and a Guide, not inline essays.
7. Server owns all numbers and sentences; React formats and draws.
8. Settings autosave; one page.

### 14.2 Open questions (ask the user at the V2-P2-T5 checkpoint, not before)

1. Accent colour: indigo `#3E5BD8` as proposed, or fully monochrome (accent = ink)?
2. Keep the optional "How do you feel today?" line on Overview, or remove check-ins entirely?
3. Keep weekly goal "in a row" count in Trends, or remove all streak notions?
4. Light or dark as the default when the OS has no preference?

---

## 15. Appendices

### Appendix A — Glossary (metric ids and drawer copy)

Each entry: **id** · title · *what* (1 sentence) · *how to read* (2–3 sentences) · source ·
method id (if calculated). Write final copy in `src/content/glossary.ts` from these.

| id | Title | What | How to read | Source |
|---|---|---|---|---|
| `sleep_duration` | Sleep | Time asleep last night, excluding time awake in bed. | Compare with your sleep need. A single short night matters less than a pattern over a week. | Garmin |
| `sleep_need` | Sleep need | Garmin's estimate of how much sleep you needed, adjusted for recent sleep, activity and HRV. | Being under your need for several nights in a row is worth addressing. | Garmin |
| `sleep_score` | Sleep score | Garmin's 0–100 rating of last night based on duration, stages and restfulness. | 80+ is good, 60–79 fair, below 60 poor (Garmin's scale). Look at the trend, not one night. | Garmin |
| `sleep_stages` | Sleep stages | How your night split between deep, light and REM sleep and time awake. | Garmin's suggested ranges are percentages of total sleep. Stage estimates from a wrist device are approximate. | Garmin |
| `bedtime_regularity` | Bedtime regularity | How consistent your bed and wake times are. | Regular times within about 30 minutes are linked to better sleep quality. | Calculated |
| `resting_hr` | Resting heart rate | Your heart rate when fully at rest, measured overnight. | Lower over months usually means better aerobic fitness. A rise of 5+ bpm above your usual can follow poor sleep, stress, alcohol or illness. | Garmin |
| `hrv` | HRV | The variation in time between heartbeats overnight, in milliseconds. | Compare only with your own usual range, never with other people. Below your range can mean incomplete recovery. | Garmin |
| `hrv_status` | HRV status | Garmin's assessment of your 7-day HRV average against your personal baseline. | Balanced means within your baseline. Unbalanced or Low suggests stress, illness or hard training. | Garmin |
| `body_battery` | Body Battery | Garmin's 0–100 estimate of your energy reserves from HRV, stress, sleep and activity. | Higher at wake means better overnight recharge. Look at how much you charged overnight, not just the number. | Garmin |
| `stress` | Stress | Garmin's 0–100 estimate of physiological stress from HRV during the day. | 0–25 rest, 26–50 low, 51–75 medium, 76–100 high. Exercise and caffeine raise it too. | Garmin |
| `steps` | Steps | Steps counted by your watch today. | Your Garmin step goal adapts to your recent activity. | Garmin |
| `active_minutes` | Active minutes | Garmin's intensity minutes: moderate minutes plus vigorous minutes counted twice. | Health guidelines suggest at least 150 per week. Your weekly goal is in Settings. | Garmin |
| `activity_time` | Activity time | Total recorded time of your activities. | Includes easy parts and pauses inside activities, so it is usually higher than active minutes. | Garmin |
| `effort` | Effort | A score of how hard an activity was, from time spent in each heart-rate zone. | Higher zones count more. Useful to compare activities and weeks with each other. | Calculated (`zones.effort`) |
| `hr_zones` | Heart-rate zones | Five ranges of heart rate from very light (zone 1) to maximum (zone 5). | Most training for fitness should be in zones 1–2. | Garmin or Calculated |
| `training_effect` | Training effect | Garmin's 0–5 rating of an activity's impact on aerobic and anaerobic fitness. | 2–2.9 maintains, 3–3.9 improves, 4+ highly improves. | Garmin |
| `load` | Load | This week's effort compared with your average of the previous 4 weeks. | Rising more than about 30% in a week increases injury risk; build gradually. | Calculated (`load.ramp`) |
| `efficiency` | Efficiency | Distance covered per heartbeat on runs and walks. | Rising efficiency at similar effort is a sign of improving fitness. | Calculated (`fitness.efficiency`) |
| `vo2max` | VO2 max | Garmin's estimate of your maximum aerobic capacity. | Changes slowly; look at months, not days. | Garmin |
| `usual_range` | Your usual range | The range your readings normally fall in, from your last 30 days. | Readings outside it are worth noticing, not worrying about. Needs at least 14 readings. | Calculated (`common.usual_range`) |
| `record` | Records | Your best performances, such as fastest 5 km or longest ride. | Records only count activities with reliable GPS or distance data. | Calculated (`efforts.records`) |

### Appendix B — Page descriptions and first-visit intros

| Page | Description (under title) | First-visit bullets |
|---|---|---|
| Overview | Generated summary sentence (e.g. "Short sleep and HRV below your usual — an easy day makes sense.") | Last night's readings compared with your usual range · Progress towards your weekly goal · A suggestion for today, with its reasons |
| Activities | Every activity synced from your watch. Select one for its map, charts and splits. | Use the range and sport filter to narrow the list · Effort shows how hard each activity was · Select several to compare them |
| Activity | One-sentence activity summary. | Hover a chart to see that point on the map · Switch between time and distance · Add how it felt under Notes |
| Health › Sleep | How long and how well you slept, compared with what you needed. | Bars show each night by stage · The dashed line is your sleep need · Bedtime regularity is shown below |
| Health › Heart | Resting heart rate and HRV, compared with your usual range. | The shaded band is your usual range · Compare only with yourself · Short-term changes often follow sleep or stress |
| Health › Body Battery | Garmin's estimate of your energy through each day. | Each bar shows a day's lowest and highest level · Activities and stress drain it; rest charges it |
| Health › Stress | Garmin's stress estimate from heart-rate variability. | Exercise raises measured stress · Look at rest time as much as high stress |
| Health › Steps | Daily steps and weekly active minutes. | The line is your daily step goal · Active minutes count vigorous time double |
| Trends | How your fitness, volume and consistency are changing over time. | Fitness signals compare recent weeks with earlier ones · Load warns when a week rises sharply · Weekly reports summarise each week |
| Guide | How Open Garmin works and what each number means. | — |
| Settings | Goals, units, heart-rate zones, your Garmin connection and your data. | — |

### Appendix C — Removal list

Frontend: `src/components/companion/*` (Pip, Celebration, CompanionMessage, tests),
`src/pages/Journey/*` (JourneyPage, StoryViewer, tests), `src/pages/Today/EditMyDay.tsx`,
`src/pages/Today/card-labels.ts`, `src/pages/Today/*` (replaced by `src/pages/Overview/*`),
`src/pages/Onboarding/*` (replaced by `src/pages/Welcome/*`), `src/pages/Methods/*` (replaced by
`src/pages/Guide/*`), `src/pages/Health/HealthPage.tsx` Overview tab, `src/layout/TopBar.tsx`,
`src/components/ui/{Badge,SourceBadge,Card}.tsx` (replaced by Tag/Section footnote/Panel),
`src/components/charts/Gauges.tsx` rings. Dependencies: `canvas-confetti`, `@dnd-kit/core`,
`@dnd-kit/sortable`, `@fontsource/barlow-semi-condensed`.

Backend (Phase 7, after router removal in Phase 3): `server/companion/{journeys.py,journeys.json,
milestones.py,messages.py}` (sentences moved to `server/copy/`), journey/milestone/story
endpoints in `server/api/journey.py` and `server/api/insights.py`, their tests
(`test_journeys.py`, `test_journey_api.py`, `test_milestones.py`, `test_companion_messages.py`).
`server/companion/streaks.py` logic moves to `analytics/activity_goals.py`
(`goal_weeks_in_a_row`) with its test. **Keep DB tables.**

### Appendix D — Visual review checklist (run on every screenshot)

Layout
- [ ] One clear focal point; nothing else competes with it.
- [ ] Rows are even; no empty holes; spans sum to 12; no nested panels.
- [ ] Consistent page anatomy: title, description, actions on the right.
- [ ] Generous whitespace; section spacing 48 px desktop / 32 px mobile.
- [ ] No horizontal scroll at 390 px; tap targets ≥ 40 px.

Visual
- [ ] Colour only in charts and status/delta text; ≤ 3 accent elements outside charts.
- [ ] At most one primary (ink) button visible.
- [ ] No badges/pills in panel headers; no icons in headings.
- [ ] No uppercase text, no eyebrows, no emoji, no exclamation marks.
- [ ] Numbers use tabular figures and correct units with thin space.

Consistency and correctness
- [ ] Every number formatted per 9.2; durations, dates and units consistent.
- [ ] Vocabulary per 9.1 ("activities", "active minutes", "effort", "Body Battery").
- [ ] Any sentence that mentions a number matches the number shown.
- [ ] No raw enums, no "1 activities", no `—` without "No reading" context.
- [ ] Charts: display units on axes, no smoothing, gaps for missing data.

Guidance
- [ ] Page description present; "About this page" works.
- [ ] Every metric label opens the drawer.
- [ ] Empty states explain why and what to do.
- [ ] Demo banner (in demo) and nothing else saying "Sample data".
