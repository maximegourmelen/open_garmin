# Contributing

Use Python 3.12+ and Node 22.12+ (Node 24 is used in CI). Set up the app as described
in [README.md](README.md), then run `.venv/bin/python -m pytest -q`,
`.venv/bin/ruff check server tests`, `npm test`, `npm run lint`,
`npm run contrast`, `npm run check:ui`, and `npm run build`.

For interface work, follow [design language](plan.md#4-design-language),
[copy and voice](plan.md#5-copy-and-voice), and the
[consistency contract](plan.md#9-consistency-contract). Use the terms and units
defined there across pages, charts, API copy, and the Guide. Review desktop,
tablet, and mobile layouts in light and dark mode.

Keep network access out of automated tests. Use sanitized synthetic fixtures and
`httpx.MockTransport`; never run a real-account sync in CI. Include a source,
units, missing-data semantics and device/firmware evidence for new metrics.

An insight needs a reproducible calculation, a version, its comparison window,
coverage information and links to evidence. Separate app-derived results from
Garmin-reported measurements. Do not substitute zero for missing data or mix
incompatible training-load definitions.

Small improvements to a proven workflow are preferred to new frameworks. Open
an issue describing the user problem and observed source behavior before adding
a new API domain. Consult SECURITY.md before reporting authentication problems.
