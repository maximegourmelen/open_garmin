# Contributing

Use Python 3.12+ and Node 22.12+ (Node 24 is used in CI). Set up the app as described
in README.md, then run `pytest -q`, `npm test`, and `npm run build`.

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
