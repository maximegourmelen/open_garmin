from server.analytics.activity_goals import goal_weeks_in_a_row


def test_partial_week_does_not_break_completed_goal_run():
    weeks = [
        {"goal_met": False, "partial": False},
        {"goal_met": True, "partial": False},
        {"goal_met": True, "partial": False},
        {"goal_met": False, "partial": True},
    ]
    assert goal_weeks_in_a_row(weeks) == (2, 2)


def test_current_week_can_extend_run():
    weeks = [
        {"goal_met": True, "partial": False},
        {"goal_met": True, "partial": True},
    ]
    assert goal_weeks_in_a_row(weeks) == (2, 2)
    weeks[-1]["goal_met"] = False
    assert goal_weeks_in_a_row(weeks) == (1, 1)
