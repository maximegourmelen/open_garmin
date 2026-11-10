"""Neutral, deterministic sentences used by the API and analytics layer."""

from __future__ import annotations

from datetime import date

from .format import count, date_title, distance, duration_summary, percent

MESSAGES = {
    "milestone": "Your history includes a new achievement: {title}.",
    "pb": "New record for {distance}: {time}.",
    "goal_reached": "Your weekly active-minute goal is complete.",
    "gentle_checkin": "You reported soreness. An easier day may be useful.",
    "rest_day": "An easier day is suggested based on your recent readings.",
    "streak_risk": "{minutes} active minutes remain to meet this week's goal.",
    "welcome_back": "Your recent activity history has a gap. Start with a manageable activity.",
    "week_progress": "{minutes} active minutes this week, {pct} of your goal.",
    "empty_first_sync": "Your first sync is in progress. Recent activities arrive first.",
    "not_enough_data": "More readings are needed to show a useful comparison.",
    "activity_reaction_easy": "Most of this activity was at an easy effort.",
    "activity_reaction_moderate": "Most of this activity was at a moderate effort.",
    "activity_reaction_hard": "This was a harder activity. Consider an easier day next.",
    "activity_reaction_longest": "This is your longest {sport} activity so far.",
    "checkin_reply_1": "You reported feeling very low. An easier day may help.",
    "checkin_reply_2": "You reported feeling low. Keep today's plan flexible.",
    "checkin_reply_3": "You reported feeling okay today.",
    "checkin_reply_4": "You reported feeling good today.",
    "checkin_reply_5": "You reported feeling very good today.",
}

TODAY_SUGGESTIONS = {
    "rest": (
        "An easier day",
        "Recent readings suggest an easier day. A short walk or rest may be appropriate.",
    ),
    "easy": (
        "Keep it light",
        "An easy activity is suggested. Choose a pace where conversation feels comfortable.",
    ),
    "go": (
        "Usual activity",
        "Your recent readings do not suggest a change to your planned activity.",
    ),
    "unknown": (
        "Limited data",
        "There are not enough recent readings for a specific suggestion. Use how you feel today.",
    ),
}


def today_suggestion(kind: str) -> tuple[str, str]:
    return TODAY_SUGGESTIONS[kind]


def goal_suggestion(suggested: int, current_goal: int) -> str:
    direction = "above" if suggested > current_goal else "below"
    return f"A weekly goal of {count(suggested)} active minutes is {direction} your current goal."


def render_message(
    message_id: str,
    user_id: str,
    day: date | str,
    tone: str = "calm",
    *,
    data_refs: list[str] | None = None,
    **values: object,
) -> dict:
    """Retain the old call signature while using one phrasing and no tone variants."""
    del user_id, day, tone
    return {
        "id": message_id,
        "text": MESSAGES[message_id].format(**values),
        "pose": "calm",  # Legacy Today response requires this until its replacement lands.
        "data_refs": data_refs or [],
    }


def greeting(hour: int, name: str, user_id: str, day: date, tone: str = "calm") -> str:
    del hour, name, user_id, tone
    return date_title(day)


def today_observation(user_id: str, day: date, tone: str, context: dict) -> dict:
    """Use one factual message for the first applicable data event."""
    milestone = context.get("unseen_milestone")
    if milestone:
        return render_message(
            "milestone", user_id, day, tone, title=milestone["title"], data_refs=[milestone["id"]]
        )
    record = context.get("recent_pb")
    if record:
        return render_message(
            "pb", user_id, day, tone,
            distance=record["distance"], time=record["time"], data_refs=[record["activity_id"]],
        )
    if context.get("goal_reached_today"):
        return render_message("goal_reached", user_id, day, tone)
    checkin = context.get("checkin") or {}
    if checkin.get("mood") == 1 or checkin.get("soreness") == 2:
        return render_message("gentle_checkin", user_id, day, tone, data_refs=[day.isoformat()])
    if context.get("suggestion") == "rest":
        return render_message("rest_day", user_id, day, tone)
    streak = context.get("streak") or {}
    if streak.get("at_risk"):
        return render_message(
            "streak_risk", user_id, day, tone,
            minutes=count(streak.get("remaining_minutes"), ""),
        )
    last_activity = context.get("last_activity_date")
    if last_activity and (day - date.fromisoformat(last_activity)).days >= 4:
        return render_message("welcome_back", user_id, day, tone)
    week = context.get("week") or {}
    return render_message(
        "week_progress", user_id, day, tone,
        minutes=count(week.get("minutes", 0)), pct=percent(week.get("pct")),
    )


def activity_summary(
    activity: dict, intensity: str | None, is_longest: bool = False, new_best: str | None = None
) -> dict:
    if new_best:
        text, tags = f"New record for {new_best}.", ["best_effort"]
    elif is_longest:
        text, tags = f"Your longest {activity.get('sport', 'activity')} activity so far.", ["longest_session"]
    elif intensity == "easy":
        text, tags = "Mostly easy effort. This contributes to your activity base.", ["easy"]
    elif intensity == "moderate":
        text, tags = "Mostly moderate effort.", ["moderate"]
    elif intensity == "hard":
        text, tags = "Mostly hard effort. Consider an easier day next.", ["hard"]
    else:
        text, tags = "Activity recorded. Effort details are not available.", []
    return {"text": text, "tags": tags, "source": "calculated", "method": "activity_summary@1"}


def sleep_summary(day: dict) -> str:
    seconds = day.get("sleep_seconds")
    if seconds is None:
        return "No sleep reading for this night."
    duration = duration_summary(seconds)
    need = day.get("sleep_need_minutes")
    if need is None:
        need = day.get("sleep_need")
    if need is None:
        return f"{duration} of sleep. Garmin did not report a sleep need."
    difference = round(seconds / 60 - need)
    if abs(difference) <= 15:
        return f"{duration} of sleep, close to your reported need."
    comparison = "more" if difference > 0 else "less"
    return f"{duration} of sleep. {duration_summary(abs(difference) * 60)} {comparison} than you needed."


def week_progress(minutes: float, goal: float | None, activity_seconds: float | None = None) -> str:
    sentence = f"{count(minutes)} active minutes this week"
    if goal:
        sentence += f", {percent(minutes / goal * 100)} of your goal"
    if activity_seconds is not None:
        sentence += f". Recorded activity time: {duration_summary(activity_seconds)}"
    return sentence + "."


def record_distance(metres: float, units: str) -> str:
    return distance(metres, units)
