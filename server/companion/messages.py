"""Stable, kind companion copy for Today and check-ins."""

from __future__ import annotations

import hashlib
from datetime import date

TEMPLATES: dict[str, dict[str, tuple[str, ...]]] = {
    "greet_morning": {
        "cheerful": ("Good morning, {name}!", "Morning, {name}!"),
        "calm": ("Good morning, {name}.", "Morning, {name}."),
    },
    "greet_afternoon": {
        "cheerful": ("Hey {name}, good afternoon!", "Good afternoon, {name}!"),
        "calm": ("Good afternoon, {name}.", "Hello, {name}."),
    },
    "greet_evening": {
        "cheerful": ("Good evening, {name}!", "Hey {name}, how's your evening?"),
        "calm": ("Good evening, {name}.", "Hello this evening, {name}."),
    },
    "milestone": {
        "cheerful": ("New badge: {title}! 🎉", "You earned {title}! ⭐"),
        "calm": ("You earned a new badge: {title}.", "A new badge for you: {title}."),
    },
    "pb": {
        "cheerful": ("Your fastest {distance} yet — {time}! 💪", "A new best for {distance}: {time}! 🎉"),
        "calm": ("A new best for {distance}: {time}.", "Your fastest {distance} so far: {time}."),
    },
    "goal_reached": {
        "cheerful": (
            "Weekly goal reached! Everything else is a bonus. 🎉",
            "You reached your weekly goal! 👏",
        ),
        "calm": ("You've reached your weekly goal.", "Your weekly goal is complete."),
    },
    "gentle_checkin": {
        "cheerful": (
            "Feeling sore? Let's keep today easy.",
            "Take it gently today. Your body can use a breather.",
        ),
        "calm": ("You mentioned soreness. An easy day may help.", "A gentler day may feel right."),
    },
    "rest_day": {
        "cheerful": ("Rest day vibes 🌙 — this is when you get fitter.", "Make room for recovery today. 🌱"),
        "calm": ("A rest day helps your body adapt.", "Recovery is part of getting fitter."),
    },
    "streak_risk": {
        "cheerful": (
            "{minutes} more minutes keeps your {streak}-week streak going! 🔥",
            "You have time: {minutes} minutes can keep your streak going. 🌱",
        ),
        "calm": (
            "{minutes} minutes left to keep your {streak}-week streak.",
            "There's still time for {minutes} minutes this week.",
        ),
    },
    "welcome_back": {
        "cheerful": (
            "Welcome back! Any movement today counts. 🌱",
            "Good to see you! Move in a way that feels good. 👏",
        ),
        "calm": ("Welcome back. Anything you do today counts.", "It's good to see you again."),
    },
    "week_progress": {
        "cheerful": (
            "{minutes} minutes so far this week — {pct}% of your goal.",
            "You've moved {minutes} minutes this week. That's {pct}% of your goal!",
        ),
        "calm": (
            "{minutes} minutes so far this week — {pct}% of your goal.",
            "So far this week: {minutes} minutes, or {pct}% of your goal.",
        ),
    },
    "empty_first_sync": {
        "cheerful": (
            "Your first sync is on its way — recent activities arrive first.",
            "Your activities are on their way! Recent ones arrive first.",
        ),
        "calm": (
            "Your first sync is underway. Recent activities arrive first.",
            "Recent activities will appear as your first sync finishes.",
        ),
    },
    "not_enough_data": {
        "cheerful": (
            "A bit more history will help me spot a pattern. 🌱",
            "Keep wearing your watch to see your story grow!",
        ),
        "calm": ("More history is needed for this.", "Your pattern will become clearer with more readings."),
    },
    "activity_reaction_easy": {
        "cheerful": ("You kept it easy today — lovely work. 🌱", "An easy session helps build your base. 👏"),
        "calm": ("You kept your effort easy today.", "An easy session helps build your base."),
    },
    "activity_reaction_moderate": {
        "cheerful": ("A steady session today. Nice work! 👏", "You found a steady rhythm today. 🌱"),
        "calm": ("A steady session today.", "You found a steady rhythm today."),
    },
    "activity_reaction_hard": {
        "cheerful": (
            "That was a strong effort! Make time to recharge. 💪",
            "You put in a big effort today. Rest up. 🌱",
        ),
        "calm": (
            "That was a strong effort. Make time to recharge.",
            "You put in a big effort today. Rest may help.",
        ),
    },
    "activity_reaction_longest": {
        "cheerful": ("Your longest {sport} yet! 🎉", "A new longest {sport} for you! 👏"),
        "calm": ("Your longest {sport} yet.", "A new longest {sport} for you."),
    },
    "checkin_reply_1": {
        "cheerful": (
            "Sorry today's rough. Be kind to yourself.",
            "A gentle day sounds right. Take care of yourself.",
        ),
        "calm": ("You can take today gently.", "Be kind to yourself today."),
    },
    "checkin_reply_2": {
        "cheerful": (
            "Thanks for checking in. A little ease may help.",
            "It's okay to keep things light today.",
        ),
        "calm": ("Thank you for checking in. A lighter day may help.", "Make room for some ease today."),
    },
    "checkin_reply_3": {
        "cheerful": ("Thanks for checking in! Go with what feels right.", "A steady day is a good day. 🌱"),
        "calm": ("Thank you for checking in.", "Choose what feels right today."),
    },
    "checkin_reply_4": {
        "cheerful": ("Glad you're feeling good! 👏", "Nice to hear you're feeling good. 🌱"),
        "calm": ("Glad you're feeling good.", "It's good to hear you're doing well."),
    },
    "checkin_reply_5": {
        "cheerful": ("Love that! Make it a good one. ⭐", "You sound full of energy today! 👏"),
        "calm": ("Glad you're feeling great.", "Enjoy that good feeling today."),
    },
}

POSES = {
    "milestone": "cheer",
    "pb": "proud",
    "goal_reached": "cheer",
    "gentle_checkin": "stretch",
    "rest_day": "sleepy",
    "streak_risk": "thinking",
    "welcome_back": "wave",
    "empty_first_sync": "thinking",
    "not_enough_data": "thinking",
}


def render_message(
    message_id: str,
    user_id: str,
    day: date | str,
    tone: str = "cheerful",
    *,
    data_refs: list[str] | None = None,
    **values: object,
) -> dict:
    variants = TEMPLATES[message_id][tone]
    key = f"{user_id}:{day}:{message_id}".encode()
    index = int(hashlib.sha256(key).hexdigest(), 16) % len(variants)
    return {
        "id": message_id,
        "text": variants[index].format(**values),
        "pose": POSES.get(message_id, "calm"),
        "tone": tone,
        "data_refs": data_refs or [],
    }


def greeting(hour: int, name: str, user_id: str, day: date, tone: str = "cheerful") -> str:
    period = "morning" if hour < 12 else "afternoon" if hour < 18 else "evening"
    return render_message(f"greet_{period}", user_id, day, tone, name=name)["text"]


def today_observation(user_id: str, day: date, tone: str, context: dict) -> dict:
    """Choose the first applicable observation in the plan's priority order."""
    milestone = context.get("unseen_milestone")
    if milestone:
        return render_message(
            "milestone", user_id, day, tone, title=milestone["title"], data_refs=[milestone["id"]]
        )
    pb = context.get("recent_pb")
    if pb:
        return render_message(
            "pb", user_id, day, tone, distance=pb["distance"], time=pb["time"], data_refs=[pb["activity_id"]]
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
            "streak_risk",
            user_id,
            day,
            tone,
            minutes=round(streak["remaining_minutes"]),
            streak=streak["current"],
        )
    last_activity = context.get("last_activity_date")
    if last_activity and (day - date.fromisoformat(last_activity)).days >= 4:
        return render_message("welcome_back", user_id, day, tone)
    week = context.get("week") or {}
    return render_message(
        "week_progress",
        user_id,
        day,
        tone,
        minutes=round(week.get("minutes", 0)),
        pct=round(week.get("pct") or 0),
    )
