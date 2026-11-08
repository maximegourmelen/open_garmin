"""Rebuild a candidate bibliography and download licensed PMC full texts.

Run from the repository root: python3 research/build_corpus.py
This script never treats a discovered paper as reviewed or app-approved.
"""
from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent
PAPERS = ROOT / "papers"
QUERIES = {
    "running_training": 'TITLE_ABS:(running AND (training intensity OR periodization OR running economy)) AND PUB_TYPE:"review"',
    "running_injury": 'TITLE_ABS:(running AND (injury OR training load)) AND PUB_TYPE:"review"',
    "running_cohorts": 'TITLE_ABS:(running AND injury AND (cohort OR prospective))',
    "sleep_recovery": 'TITLE_ABS:((athlete OR endurance) AND (sleep OR recovery)) AND PUB_TYPE:"review"',
    "hrv": 'TITLE_ABS:(heart rate variability AND endurance AND training)',
    "wearable_validity": 'TITLE_ABS:(wearable AND (sleep OR heart rate) AND validity) AND PUB_TYPE:"review"',
}
SEEDS = ["38809828", "39713859", "38697289", "34749417", "38165636", "34489178", "34639599", "39080098", "32158285", "35418513", "29182410", "31246714", "33352457"]
SEED_PMCS = ["PMC11135706", "PMC11664494", "PMC11052887", "PMC8507742", "PMC11560992",
             "PMC11336318", "PMC7047972", "PMC12592170", "PMC12748164", "PMC13219871"]
DIRECT_PUBLISHER = {"34489178": "https://www.sciencedirect.com/science/article/pii/S1440244021001080"}


def get(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "OpenGarminResearch/0.1 (personal literature index)"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def search(query: str, page_size: int = 25) -> list[dict]:
    params = urllib.parse.urlencode({"query": query, "format": "json", "pageSize": page_size, "resultType": "lite"})
    payload = json.loads(get(f"https://www.ebi.ac.uk/europepmc/webservices/rest/search?{params}"))
    return payload["resultList"]["result"]


def paper(item: dict) -> dict:
    doi = item.get("doi")
    pmid = item.get("pmid")
    pmcid = item.get("pmcid")
    return {"id": f"pmid:{pmid}" if pmid else f"doi:{doi}", "title": item.get("title", ""),
            "authors": item.get("authorString", ""), "year": item.get("pubYear"),
            "journal": item.get("journalTitle", ""), "publication_type": item.get("pubType", ""),
            "doi": doi, "pmid": pmid, "pmcid": pmcid, "open_access_reported": item.get("isOpenAccess") == "Y",
            "pubmed_url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/" if pmid else None,
            "publisher_url": DIRECT_PUBLISHER.get(pmid) or (f"https://doi.org/{doi}" if doi else None),
            "full_text_status": "not_checked", "review_status": "candidate", "topics": []}


def main() -> None:
    ROOT.mkdir(exist_ok=True)
    PAPERS.mkdir(exist_ok=True)
    found: dict[str, dict] = {}
    for topic, query in QUERIES.items():
        for item in search(query):
            if not item.get("pmid") or not item.get("doi"):
                continue
            key = item["doi"].lower()
            found.setdefault(key, paper(item))
            if topic not in found[key]["topics"]:
                found[key]["topics"].append(topic)
        time.sleep(.2)
    for pmid in SEEDS:
        for item in search(f"EXT_ID:{pmid} AND SRC:MED", 1):
            if item.get("doi"):
                key = item["doi"].lower()
                found.setdefault(key, paper(item))
                if "seed" not in found[key]["topics"]:
                    found[key]["topics"].append("seed")
    for pmcid in SEED_PMCS:
        match = next((p for p in found.values() if p["pmcid"] == pmcid), None)
        if match is None:
            continue
        try:
            data = get(f"https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_xml/{pmcid}/unicode")
            root = ET.fromstring(data)
            license_text = next((x.text for x in root.iter("infon") if x.get("key") == "license"), None)
            passages = [" ".join(t.strip() for t in passage.itertext() if t and t.strip()) for passage in root.iter("passage")]
            if not license_text or len(" ".join(passages)) < 10000:
                raise ValueError("No licensed full text returned")
            (PAPERS / f"{pmcid}.xml").write_bytes(data)
            (PAPERS / f"{pmcid}.txt").write_text("\n\n".join(passages), encoding="utf-8")
            match["full_text_status"] = "downloaded"
            match["license"] = license_text
            match["local_full_text"] = f"research/papers/{pmcid}.xml"
        except (OSError, ValueError, ET.ParseError) as exc:
            match["full_text_status"] = "unavailable"
            match["download_error"] = type(exc).__name__
        time.sleep(.2)
    entries = sorted(found.values(), key=lambda p: ("seed" not in p["topics"], p["title"].lower()))
    (ROOT / "index.json").write_text(json.dumps({"schema_version": 1, "papers": entries}, indent=2, ensure_ascii=False) + "\n")
    print(f"Indexed {len(entries)} candidates; downloaded {sum(p['full_text_status']=='downloaded' for p in entries)} full texts")


if __name__ == "__main__":
    main()
