# How Open Garmin calculates its numbers

Open Garmin separates Garmin readings, your notes and check-ins, and calculations made in this app. A missing reading stays missing. Each calculated view names a method and version so its meaning can be checked.

This reference is generated from the `/api/methods` registry by `python scripts/export_methods.py`. The in-app **How it works** page provides the same explanations beside research notes.

## Active minutes

**Method:** `active_minutes@1`

How much you moved this week.

**Calculation:** Garmin moderate minutes + 2 × vigorous minutes; activity duration when intensity is missing.

**Inputs:** daily intensity minutes, activity duration.

**Minimum data:** One day or activity.

## Goal suggestion

**Method:** `goal_suggestion@1`

A weekly goal that follows your recent rhythm.

**Calculation:** Round 110% of the median of four complete weeks to the nearest five minutes; limit changes to 30 minutes.

**Inputs:** weekly active minutes, current goal.

**Minimum data:** Two complete weeks or a beginner starter goal.

## Steps

**Method:** `steps@1`

Your daily steps and recent average.

**Calculation:** Mean over days with readings; compare with Garmin or custom goal.

**Inputs:** daily steps, step goal.

**Minimum data:** One day with steps.

## Weekly effort change

**Method:** `ramp_check@1`

How this week compares with your recent weeks.

**Calculation:** Current effort divided by mean of the previous four weeks; project only after four days.

**Inputs:** effort points.

**Minimum data:** Three prior weeks.

## Effort trend

**Method:** `effort_trend@1`

Your recent effort beside your longer pattern.

**Calculation:** Seven-day mean and 28-day mean of daily effort points.

**Inputs:** effort points.

**Minimum data:** Seven and 21 days respectively.

## Resting heart-rate trend

**Method:** `rhr_trend@1`

Whether your resting heart rate changed from your usual.

**Calculation:** Median of 14 days now versus a 14-day window six weeks earlier.

**Inputs:** resting heart rate.

**Minimum data:** Ten readings in each window.

## Distance per heartbeat

**Method:** `efficiency_trend@1`

How much ground you cover per heartbeat on similar walks or runs.

**Calculation:** Median of speed × 60 / average heart rate in each of two four-week windows.

**Inputs:** activity speed, average heart rate.

**Minimum data:** Three eligible activities in each window.

## Longest session

**Method:** `longest_trend@1`

How your longest outings compare across months.

**Calculation:** Maximum activity duration in each of two four-week windows.

**Inputs:** activity duration.

**Minimum data:** One activity in each window.

## Garmin VO₂ max trend

**Method:** `vo2max_trend@1`

How Garmin's estimate has changed.

**Calculation:** Latest reported estimate compared with one from four to eight weeks earlier.

**Inputs:** Garmin VO₂ max.

**Minimum data:** Two readings a month apart.

## Movement consistency

**Method:** `consistency_trend@1`

How many days you chose to move.

**Calculation:** Active days in the latest four weeks versus the preceding four weeks.

**Inputs:** activity dates.

**Minimum data:** One recorded activity.

## Heart-rate zones

**Method:** `zones_from_samples@1`

Time spent at different heart-rate levels.

**Calculation:** Classify each recorded sample using five percentages of maximum heart rate.

**Inputs:** heart-rate samples, maximum heart rate.

**Minimum data:** Two usable samples.

## Effort points

**Method:** `effort_points@1`

A simple measure of how long and how hard a session was.

**Calculation:** Sum of zone minutes weighted 1 through 5.

**Inputs:** heart-rate zone minutes.

**Minimum data:** Time in all five zones.

## Effort mix

**Method:** `intensity_mix@1`

The share of easy, moderate and hard minutes lately.

**Calculation:** Add zones 1–2, zone 3 and zones 4–5 over 28 days.

**Inputs:** zone minutes.

**Minimum data:** 60 measured minutes.

## Activity details

**Method:** `activity_detail@1`

A session's splits, best efforts and pace pattern.

**Calculation:** Calculate from full-resolution recorded samples.

**Inputs:** activity samples.

**Minimum data:** Recorded activity.

## Activity summary

**Method:** `activity_summary@1`

A short observation about your session.

**Calculation:** Choose the first applicable template from best, longest and intensity evidence.

**Inputs:** activity details.

**Minimum data:** Recorded activity.

## Personal bests

**Method:** `bests@1`

Your best recorded effort for each distance or duration.

**Calculation:** Smallest time for fixed distances; largest duration or distance for longest records.

**Inputs:** activity efforts.

**Minimum data:** One qualifying effort.

## 5K estimate

**Method:** `five_k_estimate@1`

A rough estimate from a recent longer effort.

**Calculation:** Riegel formula: T₂ = T₁ × (5000 / D₁)^1.06.

**Inputs:** recent 3–10 km best effort.

**Minimum data:** One effort of at least 10 minutes in 90 days.

## Sleep shortfall

**Method:** `sleep_debt_7d@1`

How much reported sleep need was unmet this week.

**Calculation:** Sum max(0, need − sleep) over seven nights with data.

**Inputs:** sleep duration, Garmin sleep need.

**Minimum data:** One night with sleep data.

## Bedtime rhythm

**Method:** `bedtime_rhythm@1`

Whether your bedtimes stayed near your usual time.

**Calculation:** Median bedtime over 14 nights; band is at least 30 minutes or the median absolute deviation.

**Inputs:** local sleep start.

**Minimum data:** Seven nights in 14 days.

## Body Battery

**Method:** `body_battery@1`

Garmin's reported charge and drain for the day.

**Calculation:** Display reported values without recalculation.

**Inputs:** Garmin Body Battery.

**Minimum data:** One day reported by Garmin.

## Stress breakdown

**Method:** `stress_day@1`

How Garmin divided measured time into stress levels.

**Calculation:** Convert Garmin duration milliseconds to minutes; divide by measured time.

**Inputs:** Garmin stress durations.

**Minimum data:** One day reported by Garmin.

## Relationship explorer

**Method:** `relationship@1`

How two of your daily values moved together.

**Calculation:** Spearman rank correlation on paired days; an optional one-day lag.

**Inputs:** paired daily readings.

**Minimum data:** 14 paired days.

## Weekly story

**Method:** `weekly_recap@1`

A recap built from your recorded week.

**Calculation:** Select slides when activity, sleep and progress data exist.

**Inputs:** activities, daily readings, goals.

**Minimum data:** One completed week.

## Weekly streak

**Method:** `streak@1`

How many weeks in a row you reached a movement goal.

**Calculation:** A week counts when minutes or sessions meet the current goal; an unfinished week cannot end a streak.

**Inputs:** activities, intensity minutes, current goals.

**Minimum data:** One complete week.

## Journey progress

**Method:** `journey_progress@1`

How you are doing against each week's chosen targets.

**Calculation:** Mean of each target's completion, capped at 100%.

**Inputs:** activities, daily readings, journey targets.

**Minimum data:** Chosen journey.

## Health overview

**Method:** `wellness_overview@1`

The latest health reading from each section.

**Calculation:** Select the most recent reading in the chosen range.

**Inputs:** daily readings.

**Minimum data:** One daily reading.

## Progress overview

**Method:** `progress_overview@1`

Your fitness signs, personal bests, weekly volume and movement days.

**Calculation:** Combine the listed calculations over their own evidence windows.

**Inputs:** activities, daily readings, effort points.

**Minimum data:** One recorded activity or daily reading.

## Deeper progress

**Method:** `progress_deeper@1`

Detailed trends for your recent activities and effort.

**Calculation:** Show recorded values and calculated trend series over the selected range.

**Inputs:** activities, effort points.

**Minimum data:** One recorded activity.

## Today's suggestion

**Method:** `today_suggestion@1`

A gentle movement idea from your available signals.

**Calculation:** Classify sleep, HRV, Body Battery, resting heart rate, check-in and recent effort; choose rest, easy, go or unknown by the published rule order.

**Inputs:** daily readings, check-in, effort points.

**Minimum data:** Two signals for a go suggestion; fewer returns unknown.

## Today overview

**Method:** `today_overview@1`

Your most relevant movement and recovery information in one place.

**Calculation:** Combine the latest readings, week progress and evidence-backed insights.

**Inputs:** activities, daily readings, goals, check-ins.

**Minimum data:** A workspace; cards appear when data is available.

## Sleep history

**Method:** `wellness_sleep@1`

Your sleep history over the selected range.

**Calculation:** Show reported days; leave missing days empty.

**Inputs:** Garmin sleep duration, sleep stages, sleep need.

**Minimum data:** One day with a reading.

## Heart history

**Method:** `wellness_heart@1`

Your heart history over the selected range.

**Calculation:** Show reported days; leave missing days empty.

**Inputs:** resting heart rate, HRV.

**Minimum data:** One day with a reading.

## Energy history

**Method:** `wellness_energy@1`

Your energy history over the selected range.

**Calculation:** Show reported days; leave missing days empty.

**Inputs:** Garmin Body Battery.

**Minimum data:** One day with a reading.

## Stress history

**Method:** `wellness_stress@1`

Your stress history over the selected range.

**Calculation:** Show reported days; leave missing days empty.

**Inputs:** Garmin stress.

**Minimum data:** One day with a reading.

## Step history

**Method:** `wellness_steps@1`

Your step history over the selected range.

**Calculation:** Show reported days; leave missing days empty.

**Inputs:** Garmin steps, step goal.

**Minimum data:** One day with a reading.

## Weekly volume

**Method:** `insight_weekly_volume@1`

A pattern in your own recorded data.

**Calculation:** Show only when this insight's evidence rule is met.

**Inputs:** recorded daily or activity data.

**Minimum data:** Varies by insight; see its evidence card.

## Zone distribution

**Method:** `insight_zone_distribution@1`

A pattern in your own recorded data.

**Calculation:** Show only when this insight's evidence rule is met.

**Inputs:** recorded daily or activity data.

**Minimum data:** Varies by insight; see its evidence card.

## Sleep context

**Method:** `insight_sleep_context@1`

A pattern in your own recorded data.

**Calculation:** Show only when this insight's evidence rule is met.

**Inputs:** recorded daily or activity data.

**Minimum data:** Varies by insight; see its evidence card.

## Hrv context

**Method:** `insight_hrv_context@1`

A pattern in your own recorded data.

**Calculation:** Show only when this insight's evidence rule is met.

**Inputs:** recorded daily or activity data.

**Minimum data:** Varies by insight; see its evidence card.

## Ramp

**Method:** `insight_ramp@1`

A pattern in your own recorded data.

**Calculation:** Show only when this insight's evidence rule is met.

**Inputs:** recorded daily or activity data.

**Minimum data:** Varies by insight; see its evidence card.

## Goal streak

**Method:** `insight_goal_streak@1`

A pattern in your own recorded data.

**Calculation:** Show only when this insight's evidence rule is met.

**Inputs:** recorded daily or activity data.

**Minimum data:** Varies by insight; see its evidence card.

## New best

**Method:** `insight_new_best@1`

A pattern in your own recorded data.

**Calculation:** Show only when this insight's evidence rule is met.

**Inputs:** recorded daily or activity data.

**Minimum data:** Varies by insight; see its evidence card.

## Rhr trend

**Method:** `insight_rhr_trend@1`

A pattern in your own recorded data.

**Calculation:** Show only when this insight's evidence rule is met.

**Inputs:** recorded daily or activity data.

**Minimum data:** Varies by insight; see its evidence card.

## Efficiency

**Method:** `insight_efficiency@1`

A pattern in your own recorded data.

**Calculation:** Show only when this insight's evidence rule is met.

**Inputs:** recorded daily or activity data.

**Minimum data:** Varies by insight; see its evidence card.

## Sleep rhythm

**Method:** `insight_sleep_rhythm@1`

A pattern in your own recorded data.

**Calculation:** Show only when this insight's evidence rule is met.

**Inputs:** recorded daily or activity data.

**Minimum data:** Varies by insight; see its evidence card.

## Short sleep run

**Method:** `insight_short_sleep_run@1`

A pattern in your own recorded data.

**Calculation:** Show only when this insight's evidence rule is met.

**Inputs:** recorded daily or activity data.

**Minimum data:** Varies by insight; see its evidence card.

## Rest days

**Method:** `insight_rest_days@1`

A pattern in your own recorded data.

**Calculation:** Show only when this insight's evidence rule is met.

**Inputs:** recorded daily or activity data.

**Minimum data:** Varies by insight; see its evidence card.

## Steps goal

**Method:** `insight_steps_goal@1`

A pattern in your own recorded data.

**Calculation:** Show only when this insight's evidence rule is met.

**Inputs:** recorded daily or activity data.

**Minimum data:** Varies by insight; see its evidence card.

## Checkin energy

**Method:** `insight_checkin_energy@1`

A pattern in your own recorded data.

**Calculation:** Show only when this insight's evidence rule is met.

**Inputs:** recorded daily or activity data.

**Minimum data:** Varies by insight; see its evidence card.

## Building history

**Method:** `insight_building_history@1`

A pattern in your own recorded data.

**Calculation:** Show only when this insight's evidence rule is met.

**Inputs:** recorded daily or activity data.

**Minimum data:** Varies by insight; see its evidence card.
