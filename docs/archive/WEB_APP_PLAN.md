# A training dashboard built on Garmin data

Product and delivery plan — October 31, 2026

**Build an open-source web application that helps Garmin users understand their training, examine their activities, and see how they are responding over time.** Make it available through a public website with guided connection and a useful demo. The primary experience should require no installation or developer tools.

The proposed advantage is a carefully designed training workflow, transparent calculations, and strong access to the underlying data. The application can use Garmin's existing Python client; creating a separate general-purpose Python library is unnecessary.

## Product direction

The application should answer four questions well:

1. What have I done, and what changed this week?
2. What did this particular session accomplish?
3. Am I progressing in the activities I care about?
4. How do sleep, recovery signals and training relate in my own history?

Activities are the main objects. Sleep and recovery provide context around them. Insight summaries explain patterns, with direct access to the sessions and measurements behind each statement.

Start with recreational and committed endurance athletes, with running as the first deeply supported sport. Include cycling and strength activities from the beginning; expand their specialist analysis after validating the relevant data. Preserve swimming, multisport, indoor, manual, and unfamiliar activities without forcing them into running assumptions.

The first version should feel valuable to an FR165 owner without limiting the data model to that watch. Advanced-watch users should see additional supported measurements naturally, rather than receive an entirely different application.

## Inspiration and differentiation

Bevel's current product includes a daily timeline, a training calendar, configurable fitness charts, detailed activity/interval breakdowns, and strength progression. WHOOP connects activity effort with recovery and trends. These are useful workflow references; neither basic activity charts nor a recovery score alone would distinguish this product. [Bevel feature notes](https://help.bevel.health/en/articles/11194113), [WHOOP Strain overview](https://www.whoop.com/us/en/thelocker/how-does-whoop-strain-work-101/).

| Design influence                               | Apply it here                                                                       |
| ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| Bevel's calm presentation                      | Clear hierarchy, restrained color, understandable summaries, deliberate spacing     |
| WHOOP's connection between effort and response | Put a session in the context of the surrounding training and next morning's signals |
| Garmin's depth                                 | Preserve sport-specific measures, units, laps, sensor data and long-term trends     |
| Open-source analysis                           | Explain formulas, expose source data, version calculations, support exports         |

Use an original visual language. A screen should move from **summary → evidence → detail**. Its first view should be understandable in seconds, while a curious athlete can inspect exact values, select intervals, compare sessions, and export the result.

Do not lead the MVP with a new universal readiness percentage. A precise-looking score would require substantial validation and could hide the information this audience values. Start with clearly separated recovery signals and Garmin-reported scores where the approved source actually supplies them.

## Public availability and Garmin access

The target journey is: **open the website → try the demo → create an app account → connect Garmin → see recent training → let history fill in.** Self-hosting can remain an optional open-source distribution, but should not be the public user's required path.

There is a launch dependency to resolve early. Garmin describes the Personal API as access to one's own account and says it is not intended for commercial applications serving multiple end users. The public documentation does not establish that a shared hosted service may collect everyone's personal keys. A free or open-source label does not answer that question. Confirm the actual terms and Garmin's position before publicly accepting keys. [Personal API FAQ](https://developer.garmin.com/gc-developer-program/personal/personal-faq).

Plan two access implementations behind the same application data model:

- **Personal-key connection:** implement and validate the requested flow for the pilot. Use it for public hosting only if that deployment is permitted.
- **Business-program connection:** if shared hosting requires it, use the approved business integration and consent flow. Reassess history and domain coverage because it is a separate API program, not merely a different login. [Business program FAQ](https://developer.garmin.com/gc-developer-program/enterprise/program-faq/).

The product experience remains a public website in either case. A demo and optional file-import experience can be available while hosted access is being resolved. Do not promise automatic Garmin connection, historical backfill, or unrestricted scale before this gate passes. No outreach or application has been submitted as part of this plan.

## Navigation and main screens

Use five destinations: **Today, Activities, Training, Recovery, Insights**. Keep connection, exports, units and preferences in Settings. On mobile, use a compact bottom navigation; on desktop, use a quiet side navigation and give charts more space.

| Screen     | Main purpose                                 | Essential content                                                                      |
| ---------- | -------------------------------------------- | -------------------------------------------------------------------------------------- |
| Today      | Understand today's position quickly          | Briefing, this week's progress, latest session, recovery context, sync freshness       |
| Activities | Review and compare training sessions         | Searchable history, calendar/list views, filters, rich activity detail, comparison     |
| Training   | Understand volume, intensity and progression | Weekly volume, zone distribution, comparable load series, sport-specific trends, goals |
| Recovery   | Inspect the response to training             | Sleep, HRV, resting HR, respiration and Body Battery trends where available            |
| Insights   | Review meaningful changes and questions      | Session observations, weekly review, progress trends, evidence and caveats             |

**Today** should have one dominant element: a short briefing linked to evidence. Below it, show the current training week and recent activities. Put recovery context alongside these on desktop and immediately after them on mobile. Daily steps and calories belong in a secondary section that users can pin if they care about them.

An illustrative briefing, using synthetic values, might read: “You have run 28 km this week, compared with 24 km at the same point last week. Yesterday's easy run stayed within your selected HR zones. Last night's sleep was 50 minutes below your recent median.” Each sentence opens its evidence. The comparison must align the same weekdays and local time; partial weeks should not be compared silently with complete weeks.

**Activities** should be the strongest part of the application:

- Filter by sport, date, duration, distance and tags. Add device and structured-workout filters only when reliable metadata exists.
- Show a compact training calendar alongside a detailed list; save the user's preferred view.
- Activity detail starts with purpose or workout type, duration, distance, pace/speed, HR and available training effects. Let users choose and reorder secondary metrics.
- Synchronize chart selection across pace/speed, HR, elevation and power, with a linked route where GPS exists. Switch between elapsed time, active time and distance with explicit definitions.
- Inspect laps, manually marked intervals, workout steps, pauses, and the selected segment. Label detected intervals as inferred.
- Compare two to four activities. Allow both time/distance alignment and side-by-side summaries; never imply identical courses or conditions without evidence.
- Add app-owned notes, session effort and tags. Preserve imported Garmin notes separately. These edits do not write back to Garmin.

No-GPS activities still receive complete usable pages. Treadmill sessions, pool swims, strength workouts and manual entries should not appear broken because they lack a map or detailed samples.

**Training** should show the training week in concrete units: sessions, minutes, distance by sport, elevation, intensity distribution and consistency. Support 4-, 12-, and 26-week views. Goals can be app-owned weekly targets or a dated event; a simple local calendar can compare planned and completed sessions later. Garmin Coach import and workout upload are not assumed.

**Recovery** should put actual measurements first. Show last night's values against personal history, plus recent training on the same timeline. Distinguish Garmin HRV status, statistical departures from a personal baseline, and a user's subjective fatigue. Explain missing sleep and changes of device or measurement source. Full sleep-stage timelines are conditional on validated inputs.

**Insights** should organize observations by session, week, and longer-term progress. A weekly review should say what changed, which sessions drove it, how the body's signals changed, and what question to watch next. Avoid an endless stream of generic praise or unsupported daily instructions.

## An evidence-based insight system

Start with deterministic calculations and templated language. Each insight must retain its inputs, dates, comparison group, method version and source links. Optional generative text can later paraphrase validated results; it must not invent metrics, calculate statistics itself, or receive the user's data without an explicit product choice.

| Insight                  | Required evidence                                              | Initial rule and guardrails                                                                   |
| ------------------------ | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Weekly training change   | Complete activity summaries                                    | Compare the same portion of each week; separate sports and distinguish missing sync from rest |
| Intensity distribution   | Valid HR samples or reported zone times, plus zone definitions | Show minutes and shares; display measurement coverage; unknown time remains unknown           |
| Session execution        | Recorded laps/steps and an explicit target                     | Compare planned and actual intervals; a workout name alone does not establish its target      |
| Easy-session progression | Several genuinely comparable steady sessions                   | Compare speed at similar HR or HR at similar speed; show sample count and matching criteria   |
| Activity context         | Session timestamps, preceding training, next-day measurements  | Describe temporal association without claiming the session caused the response                |
| Sleep consistency        | Valid local sleep start/end history                            | Show duration and timing variability; preserve travel/DST context                             |
| Strength progression     | Exercise identity, valid sets/reps/weights                     | Compare the same exercise and equipment; body-weight work is not zero load                    |
| Personal bests           | Sufficient historical activity samples                         | Label “best in imported history”; disclose incomplete history and pause rules                 |

For the MVP, ship the first two, sleep consistency, and a concise weekly review. Add progression and session-execution analysis after the activity data model is proven.

Use baseline windows and minimum sample counts as published product rules, then tune them with pilot data. An initial baseline can use a preceding 28-day window with at least 14 valid nights for basic comparisons. This is an implementation proposal, not a clinically validated threshold. Where a compatible Garmin baseline is supplied, preserve it as a distinct source. Exclude the current observation from its historical comparison and identify poor coverage.

Preserve load methods separately. Garmin-reported activity load, an app-calculated HR-based measure, and duration × user-entered effort are different quantities. Do not add them together or silently fill one series with another. A cross-sport chart can always show duration and zone time; it need not pretend to quantify muscular fatigue from HR alone.

Do not infer injury risk, diagnose illness, or declare a session safe based on these measurements. Display uncertainty rather than converting every departure into a red warning. Avoid causal habit claims from small self-selected samples. Behavioral journals and exploratory correlations can come after the core training experience is working.

## Data coverage and device support

The published Personal API includes activity summaries/originals and wellness domains such as sleep, HRV, heart rate, Body Battery, SpO2 and fitness age. Its documented paths do not establish full parity with Garmin Connect. Detailed training-status/readiness, adaptive Coach schedules, gear, weather, and full sleep-stage timelines need separate validation. Their absence from the documented path list is a limitation to investigate, not a promise that an alternative response will supply them. [Personal API reference](https://developer.garmin.com/gc-developer-program/personal/swagger-docs/).

| Data class                                           | Planned treatment                                             |
| ---------------------------------------------------- | ------------------------------------------------------------- |
| Activity and wellness summaries                      | Base MVP, after live contract verification                    |
| Activity sample streams, laps, GPS and sensor fields | Decode preserved original files; conditional on file contents |
| Garmin training effects/load/VO2 values              | Display only when returned; retain source and units           |
| Advanced running/cycling/swimming metrics            | Optional sections activated by observed, valid data           |
| Strength exercise edits and set metadata             | Verify API/FIT parity; add local corrections if needed        |
| App-calculated trends, comparisons and notes         | Label as calculated or entered here                           |
| Unavailable or unverified domains                    | Omit dependent features gracefully; explain why on request    |

Support is a combination of endpoint coverage, device capability, settings, sensors and history. Do not hardcode a simple watch-model allowlist as the source of truth. Record whether a feature is documented, observed, tested, unavailable or unknown. Changes of device and sensor should be visible in longitudinal analysis.

The first compatibility corpus should cover the FR165, an advanced multisport watch, an Edge/power-meter activity, strength sessions, an indoor activity, a pool swim, and a multisport parent with children. Use volunteered and sanitized fixtures. Never commit production health data or private routes.

The existing Health app provides useful implementation examples and a private validation baseline. Its unofficial endpoints should not become hidden dependencies of this product. Its undocumented FIT message-140 decoder can be evaluated later as an explicitly experimental extension; app-generated readiness/status should not be presented as Garmin values.

## Onboarding and synchronization

1. **Explore first.** Let visitors inspect synthetic demo data immediately. Make clear that it is a demo.
2. **Create an app account.** A short email-link flow is a reasonable initial choice; Garmin connection is a separate step.
3. **Connect Garmin.** For an authorized personal-key deployment, link to Garmin's key page and provide short illustrated instructions. The app cannot create the key itself. Explain that the hosted service will hold a revocable credential to sync the account.
4. **Choose useful defaults.** Ask only primary sports, units, week start and optional training goal. Infer a timezone from available profile data but let the user correct it.
5. **Deliver the first useful screen.** Fetch recent summaries and the newest activity page first. Load activity originals for recent sessions, then when users open older sessions. Fill the selected history in the background.
6. **Report progress.** Distinguish “recent training ready,” “older activities loading,” “some details unavailable” and “connection needs attention.” The app remains usable throughout.

Suggested product defaults: recent 90-day summaries/activity history, recent 7-day wellness details, and originals for the latest 10 activities, followed by a user-selected deeper import. These are workload choices, not claims about Garmin retention or request limits. Adjust after the pilot measures actual request costs.

Garmin's Personal API is a pull integration. Sync on demand and on a controlled server schedule; do not imply a live watch connection or an upload webhook. The UI needs both “last checked Garmin” and the timestamp of the newest available source data. A successful poll does not mean the watch has uploaded today's session.

Use per-domain checkpoints and bounded requests; revisit mutable recent dates and known updated activities. Support pagination, API-specific range splitting, jittered retries and Retry-After. Fair scheduling across accounts prevents one backfill from monopolizing requests. Respect a site-wide cooldown when appropriate. Never invent a numerical Garmin quota.

A revoked/expired key pauses further sync and offers a simple replacement flow. Already imported data remains available according to the user's retention choice. Disconnect, delete imported data and delete the app account are separate actions with clear results. Document backup-expiry behavior for deleted data.

## Proposed implementation

Use **React + TypeScript** for a responsive frontend and **Python + FastAPI** for the application API and ingestion. Reuse Garmin's official Python client behind an internal connector. Use **PostgreSQL** for hosted account, activity and wellness records, private object storage for originals, and a background worker backed initially by a durable database job table. This is a proposed stack, with versions selected and pinned at implementation time.

The architecture is:

```text
Browser → authenticated application API → per-user normalized data
                        ↓
                 durable job queue
                        ↓
             Garmin connector / FIT parser
                        ↓
           source archive + versioned calculations
```

Store Garmin credentials and tokens on the server, encrypted using a managed key service with access limited to the connector worker. Never put them in a URL, browser local storage, analytics, logs, or a shared SDK default cache file. Isolate caches by app account and credential revision. If the official authenticator's cache behavior does not fit this deployment, adapt the small documented token exchange rather than introducing a global credentials file. [Official Python client](https://github.com/garmin/connect-personal-api-python).

Minimum domain model: app users; Garmin connections; devices/source metadata; activities and parent-child relationships; laps/segments; sample streams; daily wellness; sleep sessions; app notes/tags/effort; training goals; import jobs; metric definitions; and versioned insights with evidence references.

Keep source payloads/originals separate from normalized records. Preserve original values and units; use UTC-aware timestamps with supplied local dates/offsets. Store a metric's source, calculation version and quality state. Never overwrite observed data with a derived estimate. Unknown source identifiers remain unknown rather than being guessed.

Stream large files to private storage, validate archives, limit extraction sizes, and parse outside web requests. Use compact sample storage and precomputed chart summaries rather than one unbounded database row per metric per second. Fetch exact samples for selected activities/segments as needed. Parser failures should leave the original intact for replay.

Ship private-by-default accounts and activities, explicit user isolation in every query and file download, protected sessions, request limits, redacted errors, backups, export and deletion. Public sharing, if introduced later, should be opt-in with route hiding and a preview of what will be shared. Ensure map and analytics providers do not receive private route coordinates incidentally.

Include Garmin/device attribution beside applicable views and in exports; verify the applicable current program requirements during launch review. [Garmin API brand guidelines](https://developer.garmin.com/downloads/brand/Garmin-Developer-API-Brand-Guidelines.pdf).

## MVP and subsequent scope

**MVP:** public landing/demo; connection and sync status; Today; searchable activity history; strong running activity detail with synchronized charts/laps; basic cycling/strength pages; training volume and HR zones; sleep/HRV/RHR context; session notes and effort; deterministic weekly review; export and deletion.

**Next:** activity comparison and comparable-session progression; better cycling power analysis; verified strength progression; swimming/multisport detail; app-owned training calendar; richer data-quality explanations; optional additional language generation.

**Later:** exploratory lifestyle associations, supported training-plan integrations, shared views, coach collaboration, other data sources, and a standalone reusable package if the app actually creates one worth maintaining.

The initial release should not depend on a new universal recovery score, all-day live sensor streams, advanced proprietary Garmin endpoints, an AI chat interface, full nutrition tracking, or a social network. Each would substantially expand scope without proving the core training experience.

## Delivery plan and release gates

Engineering estimate: approximately **6–8 focused weeks for one experienced full-time developer** for a controlled public beta. This is a planning estimate, not a commitment; Garmin access decisions and external approvals are outside it.

| Phase                       | Approximate effort | Deliverable and exit criterion                                                                                                            |
| --------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Feasibility and access      | 3–5 days           | Verify hosted access route; run bounded API pilot; record coverage and history limits; identify required feature reductions               |
| Product prototype           | 4–5 days           | Clickable Today, Activity detail and Training views; representative synthetic missing-data states; test main tasks with prospective users |
| Data foundation             | 7–10 days          | Isolated connections, progressive sync, originals, parsing, checkpoints and replay; source-to-normalized reconciliation passes            |
| Core application            | 7–10 days          | Real-data activity exploration, training week and recovery context; responsive keyboard-accessible interactions                           |
| Insights and beta hardening | 5–8 days           | Reproducible weekly insights, exports/deletion, performance/security checks and feedback from a small external cohort                     |

Begin limited technical validation with the current FR165 account, then recruit roughly 10–20 beta testers across at least three relevant device/activity groups. This is a recruitment target, not an assumption that users are already available.

Release checks should cover duplicate prevention; edited activities/sleep; interrupted jobs; expired keys; 429s; deleted source activities; manual/no-GPS entries; multisport double counting; sensor gaps; UTC/local travel and DST; HR-zone revisions; units; and wrong-user access attempts. Decide explicitly whether source deletions remove local data or preserve it as an archive, and make that behavior visible.

The first dashboard should become useful before full history import. Set a provisional target of under 60 seconds on a representative account and measure it during the pilot. Cached screen changes should feel immediate; dense charts should load progressively. Do not promise this target until measured against Garmin response times and permitted request behavior.

Success means a new user can connect without help, understand their current week, inspect why a session matters, verify an insight's evidence, and take their data back out. Track those task outcomes and user-reported usefulness; avoid optimizing for daily visits or the number of generated insights.

## Immediate next work

Prepare the hosted-access decision record, a field-to-screen coverage matrix, a bounded live API validation script, and a prototype of the three primary screens. Review those together before implementing the full application. A successful pilot should establish whether the requested personal-key model can support the public experience and which training features deserve the first release.
