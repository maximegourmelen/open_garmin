import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "research"


def load(name):
    return json.loads((ROOT / name).read_text())


def test_claims_trace_to_reviewed_local_full_text():
    papers = {p["id"]: p for p in load("index.json")["papers"]}
    reviews = {r["paper_id"]: r for r in load("reviews.json")["reviews"]}
    claims = load("claims.json")["claims"]
    assert len(papers) == len({p["doi"].lower() for p in papers.values()})
    assert len(reviews) == len(load("reviews.json")["reviews"])
    assert len({c["id"] for c in claims}) == len(claims)
    for review in reviews.values():
        paper = papers[review["paper_id"]]
        assert paper["full_text_status"] == "downloaded"
        assert paper["local_full_text"].startswith("research/papers/")
        assert review["finding"] and review["limitations"] and review["approved_use"]
    for claim in claims:
        assert claim["paper_ids"] and claim["applies_to"]
        for paper_id in claim["paper_ids"]:
            assert paper_id in reviews
            assert papers[paper_id]["publisher_url"].startswith("https://")
