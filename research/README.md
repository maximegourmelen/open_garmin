# Open Garmin research library

`index.json` contains candidate bibliographic records gathered from Europe PMC. A candidate is **not** evidence for an app claim. `reviews.json` records focused full-text reviews and limits of interpretation. `claims.json` contains the narrow statements approved for display beside specific insights.

Run `python3 research/build_corpus.py` from the repository root to refresh candidate metadata and retrieve selected licensed PMC full texts. The script stores machine-readable XML and extracted text in `research/papers/`, which Git ignores. It records the license returned with each open paper. Do not redistribute local files without checking their individual licenses.

Current pass: 152 candidates, 19 locally saved full texts, seven focused reviews, three approved context claims. The other downloaded papers are awaiting review. These counts are a research queue, not a claim that every record is relevant or sound.

## Full text requests

The following seed papers have metadata but no reviewed full text in this library. If you have a lawful copy, place it in `research/papers/` and add a review before using it for an app claim.

- [HRV-guided endurance training review — ScienceDirect](https://www.sciencedirect.com/science/article/pii/S1440244021001080), DOI `10.1016/j.jsams.2021.04.012`.
- [Sleep extension in athletes — publisher DOI](https://doi.org/10.1016/j.sleep.2020.11.028).
- [Training-intensity distribution in runners — publisher DOI](https://doi.org/10.1055/a-1559-3623).
- [Periodization and intensity distribution in runners — publisher DOI](https://doi.org/10.1123/ijspp.2017-0327).

The bibliography was assembled by search, not a formal systematic review. Do not interpret the number of records or citations as a measure of evidence strength.
