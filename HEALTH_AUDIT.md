# Personal Suite Health: Garmin integration audit

Inspected October 31, 2026. This is a local implementation audit, not a universal Garmin device specification. The account contains historical activities; their presence does not establish which device produced each one. No personal measurements, identifiers, routes, or credentials are reproduced here.

## Current ingestion

The app pins `garmin-health-data==2.16.0`. It runs that package's CLI in a subprocess, using a dedicated home directory to share the saved login between macOS and Docker. Originals are retained and parsed into `garmin.db`; the application adds Garmin-specific tables in `health.db`. [Dependency file](/Users/maximeg/Documents/Python/personal_suite/apps/health/requirements.txt:4), [integration](/Users/maximeg/Documents/Python/personal_suite/apps/health/garmin.py:1).

The first sync requests activity history back to a fixed 2015 boundary and approximately the most recent month of daily data. Later syncs revisit the preceding two days plus today. Daily history advances in 30-day batches, stopping at the lower boundary or after six empty batches. Automatic sync runs roughly hourly during waking hours, with targeted morning sleep checks. These are application choices, not Garmin API limits.

Useful existing behavior includes a sync lock, a saved status, stopping automatic sync after rejected authentication, recent-data refresh, retained originals, and bounded history work. Risks include the fixed account-history boundary, empty-batch heuristics, parsing subprocess output to classify failures, and optional exceptions that can leave the top-level status successful despite a missing enrichment. [Sync implementation](/Users/maximeg/Documents/Python/personal_suite/apps/health/garmin.py:142).

Authentication supports password/MFA and a manual browser-ticket fallback. Passwords pass through rather than being persisted by this app; tokens are saved. The official Personal API could remove this SSO workflow for covered domains. Migration would require a new Personal API key; the existing unofficial tokens should not be assumed interchangeable.

## Data currently consumed

| Group | Fields or structures consumed | Origin and limitations |
| --- | --- | --- |
| Daily totals | Total/active/resting calories; resting/min/max heart rate; steps/goal; distance; floors; moderate/vigorous intensity minutes/goal | Custom daily-summary fetch, not just the extraction database |
| Daily wellness | Stress average/max; Body Battery high/low/charged/drained/latest; SpO2 average/low; waking respiration average | Custom summary parser; raw response retained |
| Time series | Heart rate, stress, Body Battery, respiration, steps, floors and intensity minutes | Extraction tables; source cadence varies; not a claim of continuous sensor-resolution data |
| Sleep | Start/end/date/offset; stage durations and intervals; scores/qualifiers; movement/restlessness; HRV/status; SpO2; respiration; sleep need; breathing disruption | Summary and child tables; absent data must be distinguished from unsupported features |
| Activities | Identifiers, names/types, timing, durations, distance, elevation, speed, calories, HR/zones, training effects, device metadata and parent relationships | Activity JSON and original files; individual activities populate different subsets |
| Detailed activities | GPS, heart rate, cadence, speed, distance, altitude, power, running dynamics; laps/splits/events; user effort/feel | FIT/TCX and supplemental metrics; not all files contain every metric |
| Strength | Active/rest sets, exercise guesses, repetitions, duration, weight, start time | App reads retained exercise-set JSON because normalized extraction tables are empty locally |
| Fitness | Running/cycling VO2 max, fitness age and its contributing factors, records and race predictions | Some custom fetches; availability differs by history/device/account |
| Context | Activity weather; gear details/totals and activity associations | Custom unofficial Connect endpoints |
| Coach | Active plan, adaptive week, workout steps and pace/HR/power targets | Custom training-plan/workout endpoints |
| Training analysis | Load, load focus, status, readiness, recovery estimates | Mixture of FIT-decoded values and app calculations; not all Garmin-reported values |

Sources: [daily summary mapping](/Users/maximeg/Documents/Python/personal_suite/apps/health/garmin.py:600), [watch read model](/Users/maximeg/Documents/Python/personal_suite/apps/health/watch.py:1), [Coach fetches](/Users/maximeg/Documents/Python/personal_suite/apps/health/coachworkout.py:208), [FIT interpretation](/Users/maximeg/Documents/Python/personal_suite/apps/health/firstbeat.py:1), [training calculations](/Users/maximeg/Documents/Python/personal_suite/apps/health/training.py:1).

## Directly observed gaps

The local database contains usable daily series, sleep detail and detailed activity metrics. Some schema areas are empty, including training readiness, acclimation, running tolerance, activity beat-to-beat HRV, swim lengths and women's-health tables. This is an observation about this account, not evidence of library failure or a universal FR165 feature restriction.

Training-load rows exist while their acute/chronic load and training-status columns are unpopulated. The main activity table's training-load column is also unpopulated. Merely counting rows would overstate the data available.

The strength tables are empty although retained exercise JSON contains sets. An inspection of those saved sets found `messageIndex` present but null throughout; the app has a custom parser to avoid dropping them. This is a concrete candidate for an upstream parser investigation. It has not been reproduced in a clean installation or checked against a current upstream fix. [App workaround](/Users/maximeg/Documents/Python/personal_suite/apps/health/watch.py:866).

Recent saved activity FIT files contain message 140, which the app interprets for training load/EPOC, training effects, recovery time, benefit and VO2 max. Presence of those fields was verified locally; their interpretation has not been independently validated across devices or firmware. An experimental decoder should retain numeric field IDs and identify its decoding version. It should not promise that every watch writes them. [Current decoder](/Users/maximeg/Documents/Python/personal_suite/apps/health/firstbeat.py:1).

The app computes training status and readiness using its own rules and weights. These outputs must remain explicitly app-derived. They should not be exported under names implying Garmin supplied the values. Likewise, an HRV status fallback or inferred time-zone offset should retain its provenance.

## Official-API migration assessment

The official SDK supplies plausible paths for daily summaries, heart rate, HRV, SpO2, Body Battery, sleep summaries, fitness age and activity originals. A returned JSON object still needs mapping and validation. Reusing the current private endpoint path against the Personal API host is not a sufficient migration strategy. [Official client source](https://github.com/garmin/connect-personal-api-python/blob/main/src/garmin_personal_api/client.py).

The following require explicit compatibility checks before removing the existing extractor:

- Full sleep-stage intervals, movement/restlessness and breathing-disruption detail.
- Intraday stress, respiration, steps, floors and intensity samples, versus daily aggregates.
- Gear, activity weather, records, race predictions and adaptive Coach plans.
- Dedicated training readiness, status, load history and running tolerance on devices that expose them.
- Strength exercise labels/edits and rest sets, beyond whatever survives in an original FIT.
- Daily VO2-max history versus values attached to individual activities.

These are assessment questions, not confirmed permanent omissions. The published specification is narrower than the app's current private-endpoint surface. [Garmin Personal API reference](https://developer.garmin.com/gc-developer-program/personal/swagger-docs/).

## Data contract worth preserving

Store UTC-aware timestamps alongside supplied local timestamps, calendar dates, offsets and device metadata. The app currently returns local naive timestamps and sometimes infers an offset from nearby dates; a reusable library should preserve that uncertainty rather than erase it. DST transitions and travel can change offsets within a day.

Normalize units explicitly: Garmin JSON and FIT can use different weight scales, durations and coordinates. The app already converts weather temperature from Fahrenheit and wind from knots, strength weights from grams, and FIT semicircles to degrees. Keep source units and values available for diagnosis. Treat zero, null, negative sentinels and “not measured” as distinct states.

A useful result should explain whether data is missing because the source lacks it, the device does not support it, a request failed, or parsing discarded it. Unknown should remain unknown. This distinction, together with reproducible offline parsing, is more valuable than adding another collection of endpoint wrappers.
