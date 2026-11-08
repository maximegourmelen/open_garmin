from server.garmin.normalize import normalize_activity_v2, normalize_daily_v2


def test_activity_v2_maps_reported_fields_without_owner_data():
    raw = {
        "activityId": 42,
        "activityName": "Park run",
        "activityType": {"typeKey": "running"},
        "ownerFullName": "Private Person",
        "ownerId": 9000,
        "userProfileId": 9001,
        "summaryDTO": {
            "startTimeLocal": "2026-10-01T08:00:00",
            "maxSpeed": 4.2,
            "avgGradeAdjustedSpeed": 3.1,
            "elevationLoss": 35,
            "minElevation": 40,
            "maxElevation": 100,
            "steps": 6100,
            "moderateIntensityMinutes": 25,
            "vigorousIntensityMinutes": 10,
            "averageRunningCadenceInStepsPerMinute": 171,
            "avgStrideLength": 94,
            "avgGroundContactTime": 270,
            "avgVerticalOscillation": 8.3,
            "avgVerticalRatio": 9.1,
            "maxPower": 350,
            "normPower": 210,
            "powerTimeInZone_1": 123,
            "powerTimeInZone_5": 5,
            "trainingEffectLabel": "AEROBIC_BASE",
            "aerobicTrainingEffectMessage": "BASE",
            "anaerobicTrainingEffectMessage": "NONE",
            "differenceBodyBattery": -12,
            "minTemperature": 5,
            "maxTemperature": 14,
            "locationName": "Fictional Park",
            "isPR": True,
            "lapCount": 4,
            "fastestSplit_1000": 320,
            "fastestSplit_5000": 1700,
            "totalSets": 2,
            "totalReps": 12,
        },
    }
    out = normalize_activity_v2(raw)
    assert out["normalizer_version"] == 2
    assert out["max_speed"] == 4.2 and out["gap_speed"] == 3.1
    assert (out["elevation_loss"], out["min_elevation"], out["max_elevation"]) == (35, 40, 100)
    assert (out["steps"], out["intensity_minutes_moderate"], out["intensity_minutes_vigorous"]) == (
        6100,
        25,
        10,
    )
    assert out["cadence_spm"] == 171 and out["cadence_rpm"] is None
    assert (
        out["stride_length_m"],
        out["ground_contact_ms"],
        out["vertical_oscillation_cm"],
        out["vertical_ratio_pct"],
    ) == (0.94, 270, 8.3, 9.1)
    assert (out["max_power"], out["normalized_power"], out["power_zones"]) == (
        350,
        210,
        [123, None, None, None, 5],
    )
    assert (out["te_label"], out["te_aerobic_message"], out["te_anaerobic_message"]) == (
        "AEROBIC_BASE",
        "BASE",
        "NONE",
    )
    assert (out["body_battery_impact"], out["temperature_min"], out["temperature_max"]) == (-12, 5, 14)
    assert (out["location_name"], out["is_pr"], out["lap_count"]) == ("Fictional Park", True, 4)
    assert out["garmin_fastest_splits"] == {"1000": 320, "5000": 1700}
    assert (out["total_sets"], out["total_reps"]) == (2, 12)
    assert not {"ownerFullName", "ownerDisplayName", "ownerId", "userProfileId"} & out.keys()


def test_activity_v2_missing_values_and_cycling_cadence():
    out = normalize_activity_v2(
        {"activityId": 1, "activityType": {"typeKey": "cycling"}, "averageBikingCadenceInRevPerMinute": 88}
    )
    assert out["cadence_spm"] is None and out["cadence_rpm"] == 88
    assert out["stride_length_m"] is None
    assert out["is_pr"] is None
    assert out["power_zones"] == [None] * 5
    assert out["garmin_fastest_splits"] == {}
    assert out["max_speed"] is None


def test_daily_v2_merges_domains_and_converts_milliseconds():
    out = normalize_daily_v2(
        {
            "summary": {
                "calendarDate": "2026-10-01",
                "heartRate": {"minValue": 48, "maxValue": 171},
                "bodyBattery": {
                    "chargedValue": 61,
                    "drainedValue": 45,
                    "minValue": 20,
                    "maxValue": 80,
                    "latestValue": 52,
                    "activityEvents": [
                        {
                            "eventType": "ACTIVITY",
                            "eventStartTimeLocal": "08:00",
                            "durationInMillis": 60000,
                            "bodyBatteryImpact": -5,
                            "deviceId": "private",
                        },
                        {"unexpected": "shape"},
                    ],
                },
                "stress": {
                    "restDurationInMillis": 3600000,
                    "lowStressDurationInMillis": 120000,
                    "mediumStressDurationInMillis": 60000,
                    "highStressDurationInMillis": 30000,
                    "qualifier": "LOW",
                    "maxLevel": 76,
                },
                "intensityMinutes": {"moderate": 30, "vigorous": 12, "goal": 150},
                "movement": {"steps": 8000, "floorsAscended": 5, "floorsDescended": 4},
                "pulseOx": {"avgValue": 97, "minValue": 94},
                "respiration": {"minValue": 10, "maxValue": 20},
                "calories": {"burnedActive": 600},
            },
            "sleep": {
                "sleepTimeSeconds": 27000,
                "awakeCount": 2,
                "avgHeartRate": 52,
                "avgSleepStress": 11,
                "averageSpO2Value": 97,
                "lowestSpO2Value": 93,
                "napTimeSeconds": 900,
                "sleepNeed": {"actual": 510, "baseline": 480},
                "sleepScoreFeedback": "GOOD",
                "sleepScores": {
                    "deepPercentage": {
                        "value": 18,
                        "qualifierKey": "GOOD",
                        "optimalStart": 15,
                        "optimalEnd": 25,
                    }
                },
            },
            "hrv": {
                "lastNightAvg": 55,
                "lastNight5MinHigh": 72,
                "baseline": {"balancedLow": 45, "balancedUpper": 65, "lowUpper": 40},
                "feedbackPhrase": "BALANCED",
            },
            "summary_legacy": {
                "bodyBatteryAtWakeTime": 77,
                "dailyStepGoal": 7500,
                "lastSevenDaysAvgRestingHeartRate": 58,
            },
        }
    )
    assert out["normalizer_version"] == 2
    assert (out["hr_min"], out["hr_max"]) == (48, 171)
    assert (
        out["bb_charged"],
        out["bb_drained"],
        out["bb_min"],
        out["bb_max"],
        out["bb_latest"],
        out["bb_at_wake"],
    ) == (61, 45, 20, 80, 52, 77)
    assert out["bb_events"] == [{"type": "ACTIVITY", "start_local": "08:00", "duration_s": 60, "impact": -5}]
    assert (out["stress_rest_s"], out["stress_low_s"], out["stress_medium_s"], out["stress_high_s"]) == (
        3600,
        120,
        60,
        30,
    )
    assert (out["stress_qualifier"], out["stress_max"]) == ("LOW", 76)
    assert (out["intensity_moderate"], out["intensity_vigorous"], out["intensity_goal"]) == (30, 12, 150)
    assert (out["floors_up"], out["floors_down"], out["steps_goal"]) == (5, 4, 7500)
    assert (
        out["spo2_avg"],
        out["spo2_min"],
        out["respiration_min"],
        out["respiration_max"],
        out["active_calories"],
    ) == (97, 94, 10, 20, 600)
    assert (
        out["sleep_awake_count"],
        out["sleep_avg_hr"],
        out["sleep_avg_stress"],
        out["sleep_spo2_avg"],
        out["sleep_spo2_min"],
        out["nap_seconds"],
    ) == (2, 52, 11, 97, 93, 900)
    assert (out["sleep_need_minutes"], out["sleep_need_baseline"], out["sleep_feedback"]) == (
        510,
        480,
        "GOOD",
    )
    assert out["sleep_subscores"]["deepPercentage"] == {
        "value": 18,
        "qualifier": "GOOD",
        "optimal_start": 15,
        "optimal_end": 25,
    }
    assert (
        out["hrv_5min_high"],
        out["hrv_balanced_low"],
        out["hrv_balanced_high"],
        out["hrv_low_upper"],
        out["hrv_feedback"],
        out["rhr_7d_avg"],
    ) == (72, 45, 65, 40, "BALANCED", 58)
    assert out["hrv"] == 55 and out["steps"] == 8000


def test_daily_v2_missing_domains_stay_missing():
    out = normalize_daily_v2({"summary": {"calendarDate": "2026-10-02"}})
    assert out["hr_min"] is None and out["sleep_need_minutes"] is None
    assert out["bb_events"] == [] and out["sleep_subscores"] == {}
    assert out["stress_rest_s"] is None
