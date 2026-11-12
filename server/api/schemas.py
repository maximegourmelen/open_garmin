"""Versioned response shapes shared with the TypeScript API types."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class ResponseShape(BaseModel):
    model_config = ConfigDict(extra="allow")


class CompanionMessage(ResponseShape):
    id: str
    text: str
    pose: str
    data_refs: list[str]


class ActivitySummary(ResponseShape):
    id: str
    name: str
    sport: str
    type: str
    date: str
    start: str
    distance: float | None
    duration: float | None
    average_speed: float | None
    gap_speed: float | None
    average_hr: float | None
    elevation: float | None
    effort_points: float | None
    zone_minutes: list[float | None] | None
    has_route: bool
    detail_state: str
    location_name: str | None
    is_best: bool
    device: str
    source: str


class ActivityList(ResponseShape):
    items: list[ActivitySummary]
    next_cursor: str | None
    totals: dict[str, float]


class ActivityDetail(ActivitySummary):
    elapsed: float | None
    moving: float | None
    max_hr: float | None
    max_speed: float | None
    calories: float | None
    steps: float | None
    cadence_spm: float | None
    cadence_rpm: float | None
    power: float | None
    normalized_power: float | None
    max_power: float | None
    elevation_loss: float | None
    temperature_min: float | None
    temperature_max: float | None
    aerobic_te: float | None
    anaerobic_te: float | None
    te_label: str | None
    body_battery_impact: float | None
    vo2max: float | None
    running_form: dict | None
    zone_details: dict | None
    power_zones: list[float | None] | None
    streams: dict | None
    splits_km: list[dict]
    splits_mi: list[dict]
    laps: list[dict]
    sets: list[dict]
    best_efforts: list[dict]
    efficiency: dict | None
    summary: CompanionMessage
    milestones: list[dict]
    note: dict
    watch_feel: float | None
    watch_rpe: float | None
    session_metrics: list[dict]


class StatusResponse(ResponseShape):
    mode: str
    local_mode: bool
    user: dict[str, str]
    connection: dict
    jobs: list[dict]
    rederive: dict
    data_through: str | None
    unseen: dict


class WeekProgress(ResponseShape):
    start: str
    end: str
    minutes: float
    goal: float
    pct: float | None
    sessions: int
    sessions_goal: int
    remaining_minutes: float
    days_left: int
    by_day: list[dict]
    sentence: str
    method: str


class Suggestion(ResponseShape):
    kind: str
    title: str
    text: str
    pose: str
    signals: list[dict]
    method: str


class Insight(ResponseShape):
    id: str
    category: str
    tone: str
    title: str
    body: str
    evidence: str
    dates: list[str]
    activity_ids: list[str]
    method: str
    claims: list[dict]


class OverviewMetric(ResponseShape):
    value: float | None
    unit: str
    usual_range: dict | None
    status: str
    delta: float | None
    spark: list[float | None]


class OverviewResponse(ResponseShape):
    date: str
    summary_sentence: str
    last_night: dict[str, OverviewMetric]
    week: dict
    today: dict
    recent_activities: list[ActivitySummary]
    notes: list[dict]
    feeling_today: dict | None


class HealthSeries(ResponseShape):
    range: str
    from_date: str = Field(alias="from")
    to: str
    days: list[dict]
    summary: dict
    sentences: list[str]
    method: str


class MetricPoint(ResponseShape):
    date: str
    value: float | None


class MetricUsualRange(ResponseShape):
    low: float
    high: float
    median: float
    n: int


class MetricSummary(ResponseShape):
    id: str
    latest: MetricPoint | None
    unit: str
    usual_range: MetricUsualRange | None
    series: list[MetricPoint]
    source: str
    method_id: str | None
    value_label: str | None


class RelationshipResponse(ResponseShape):
    x: str
    y: str
    lag: int
    points: list[tuple[float, float, str]]
    rho: float | None
    n: int
    words: str
    disclaimer: str
    method: str


class ProgressResponse(ResponseShape):
    signals: list[dict]
    bests: list[dict]
    volume: list[dict]
    consistency: dict
    ramp: dict
    method: str


class DeeperResponse(ResponseShape):
    range: str
    from_date: str = Field(alias="from")
    to: str
    effort_trend: dict
    intensity_mix: dict
    benefit_mix: dict[str, int]
    pace_hr: list[dict]
    running_form: list[dict]
    five_k_estimate: dict
    vo2max: list[dict]
    method: str


class Method(ResponseShape):
    id: str
    version: int
    title: str
    plain: str
    formula: str
    inputs: list[str]
    minimum_data: str


EXPORTED_SCHEMAS = {
    "activity-detail": ActivityDetail,
    "activity-list": ActivityList,
    "deeper": DeeperResponse,
    "health-series": HealthSeries,
    "metric-summary": MetricSummary,
    "insights": list[Insight],
    "methods": list[Method],
    "overview": OverviewResponse,
    "progress": ProgressResponse,
    "relationship": RelationshipResponse,
    "status": StatusResponse,
    "today": OverviewResponse,
}
