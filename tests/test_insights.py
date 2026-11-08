from datetime import date, timedelta

from fastapi.testclient import TestClient

from server.analytics.insights import claims_for_insight, insights_for
from server.db.store import Store
from server.main import create_app


def test_sleep_context_needs_fourteen_prior_nights():
    today = date(2026, 11, 8)
    days = [
        {"date": (today - timedelta(days=offset)).isoformat(), "sleep_seconds": 7 * 3600}
        for offset in range(14)
    ]
    ids = {item["id"] for item in insights_for([], days, [], today)}
    assert "sleep-context" not in ids
    days.append({"date": (today - timedelta(days=14)).isoformat(), "sleep_seconds": 7 * 3600})
    insight = next(item for item in insights_for([], days, [], today) if item["id"] == "sleep-context")
    assert "14 preceding nights" in insight["evidence"]
    assert insight["claims"] == claims_for_insight("sleep-context")
    assert insight["claims"][0]["sources"][0]["url"].startswith("https://pubmed.ncbi.nlm.nih.gov/")


def test_demo_insights_have_evidence_and_claims():
    with TestClient(create_app(Store(in_memory=True), start_worker=False)) as client:
        result = client.get("/api/demo/insights")
        assert result.status_code == 200
        insights = result.json()
        assert len(insights) >= 4
        assert {"weekly-volume", "zone-distribution", "sleep-context", "hrv-context"} <= {
            item["id"] for item in insights
        }
        assert all("cause and effect" in item["evidence"] for item in insights)
        assert all(item["method"].endswith("@1") for item in insights)
        assert client.get("/api/insights").status_code == 401
