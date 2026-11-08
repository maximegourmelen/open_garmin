"""Fetch known open publisher PDFs into the ignored local paper folder."""
from __future__ import annotations

import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent / "papers"
PDFS = {
    "PMC11135706": "https://journals.plos.org/plosone/article/file?id=10.1371/journal.pone.0303748&type=printable",
    "PMC11052887": "https://link.springer.com/content/pdf/10.1007/s40279-023-01978-y.pdf",
    "PMC11560992": "https://link.springer.com/content/pdf/10.1007/s40279-024-02077-2.pdf",
}


def main():
    ROOT.mkdir(exist_ok=True)
    for pmcid, url in PDFS.items():
        path = ROOT / f"{pmcid}.pdf"
        if path.exists() and path.read_bytes()[:5] == b"%PDF-":
            print(f"{pmcid}: already saved")
            continue
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "OpenGarminResearch/0.1"})
            with urllib.request.urlopen(request, timeout=30) as response:
                content = response.read(30 * 1024 * 1024 + 1)
            if not content.startswith(b"%PDF-") or len(content) > 30 * 1024 * 1024:
                raise ValueError("Publisher did not return a PDF within the size limit")
            path.write_bytes(content)
            print(f"{pmcid}: saved {len(content)} bytes")
        except (OSError, ValueError) as exc:
            print(f"{pmcid}: unavailable ({type(exc).__name__})")


if __name__ == "__main__":
    main()
