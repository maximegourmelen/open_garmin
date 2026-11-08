# Open Garmin

**Your training, in focus.** An independent, open-source web workspace for Garmin
activities, training and recovery. Activities come first; insights always have
evidence. Built with React/TypeScript, FastAPI, SQLAlchemy, and the official Garmin
Personal API protocol.

This implementation runs locally and includes a fully synthetic, interactive demo
and a real, encrypted, account-isolated Garmin connection. It has not been publicly
deployed. It is not affiliated with, endorsed by or sponsored by Garmin.

## Start

Python 3.12+ and Node 22.12+ are required. Node 24 and Python 3.13 were used for the
initial validation.

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -e '.[dev]'
npm ci
npm run build
.venv/bin/uvicorn server.app:app --host 127.0.0.1 --port 8000 --no-access-log
```

Open [the app](http://127.0.0.1:8000). On macOS, after setup, `Start.command` starts
the app and opens it. In development run `npm run dev` in a second terminal and
use its local URL; Vite proxies `/api` to the Python server.

`Start.command` enables a single-user local workspace: choose **Connect Garmin**,
paste your Personal API key, and select your Garmin region. A fresh installation
creates its local workspace automatically. If this installation already has one
workspace, it opens that same workspace and preserves its data. The key is
validated against Garmin before being encrypted locally, and the first sync starts
after connection. Local mode is only for a server bound to `127.0.0.1`; hosted
deployments retain explicit account sign-in. If another server is already using
port 8000, stop it before relaunching `Start.command` to load updated code.

The local pilot created during validation has its generated sign-in details in
`.runtime/local-login.json` (owner-readable only, ignored by Git). That file is
specific to this installation and must never be published. Fresh installations
create their first workspace automatically when started with `Start.command`.
Manual server starts retain account sign-in unless local mode is explicitly enabled.

## Explore

- **Today:** training week, actual recovery signals, recent activities and
  deterministic insights with supporting evidence.
- **Activities:** search, sport/date filters, list/calendar views, two-to-four
  session comparison, private route display, original sample streams and laps.
- **Training:** weekly volume, time/distance charts, consistency history, measured
  HR-zone distribution, and a separate Garmin-reported activity-load series.
- **Recovery:** sleep totals, HRV, resting HR and Body Battery history, valid-night
  coverage and disclosed baselines.
- **Insights:** same-weekday volume, zone coverage, sleep and HRV comparisons.
  Every insight has its calculation version and dates. No invented readiness score.
- **Settings:** metric/imperial units, timezone, week start, goals, appearance,
  connection management, CSV/JSON exports, deletion and sign-out.

Session notes, perceived effort and tags are stored only in this application.
Nothing writes to the Garmin account. Demo notes are session-local; demo
preferences are stored in the browser. Demo and live data are never combined.

## Connect Garmin

Create a Personal API key in [Garmin Connect](https://connect.garmin.com/app/settings/personalApiToken),
then use the app's guided connection dialog. The server exchanges it for a
short-lived bearer token. Password/MFA scraping and undocumented Connect endpoints
are not used. Account keys are encrypted on disk and never returned to the client.

The connector implements the small documented HTTP/token exchange directly so the
reference Python client's default shared plaintext token cache is not used in a
multi-account application. API hosts are restricted to Garmin's `.com` and `.cn`
Personal API services. Tokens are cached in worker memory; secrets are never put
in browser storage or command-line arguments.

First sync imports a bounded 90-day activity/summary window, sleep and HRV, then
the three newest activity originals. Open another session and choose “Download
activity details” to load its original. Each domain and file commits independently;
jobs survive restarts. Automatic refresh checks connected accounts roughly hourly
while the server is running. This is polling after data reaches Garmin Connect,
not a live watch connection. A partial sync is visible, and original decode errors
do not discard the activity summary.

The app handles Garmin's observed V2 nested wellness responses and accepts all
documented ZIP content types for originals. Endpoint-specific date chunks are
inclusive. Retention and data availability are not guaranteed by the chosen window.

## Data, provenance and exports

Runtime files are under `.runtime/` unless configured otherwise:

```text
.runtime/
  app.db                 # account-isolated health records and encrypted keys
  encryption.key         # mode 0600, not part of the source repository
  originals/<user-hash>/  # original ZIPs, private and replayable
```

Original FIT/TCX streams are decoded with fitdecode / the standard XML parser.
Archives are processed in memory with size limits, without extracting paths.
Views use at most about 6,000 samples per activity; exact original files are
preserved. The main activity list receives small route previews instead of full
streams. Maps are drawn locally without sending coordinates to a map provider.
Fonts are bundled locally under their included OFL licenses.

JSON exports include normalized records, raw source JSON, notes and stored sample
streams. CSV is a summary export with spreadsheet-formula escaping. An original
ZIP is available after import at `/api/activities/{activity_id}/original` to the
authenticated owner. Full-resolution analysis should use those originals.

Missing measurements remain null. A reported zero remains zero. Zone summaries
state coverage, multisport children are not counted again, and app estimates do
not replace Garmin values. Garmin activity load is not relabeled as acute/chronic
load. Advanced running/swimming/strength details depend on what the original file
contains. There is no assumption that every watch supports every metric.

## Configuration and hosting

Copy `.env.example` as a reference. Export environment variables in your shell,
or start Uvicorn with `--env-file .env`. Important options:

| Variable | Purpose |
| --- | --- |
| `OPEN_GARMIN_DATA_DIR` | Private runtime directory; default `.runtime` |
| `OPEN_GARMIN_DATABASE_URL` | SQLAlchemy URL; SQLite default, PostgreSQL optional |
| `OPEN_GARMIN_SECURE_COOKIES` | Set `1` for HTTPS hosting |
| `OPEN_GARMIN_ALLOWED_ORIGINS` | Comma-separated authorized frontend origins |
| `OPEN_GARMIN_ALLOW_REGISTRATION` | Set `1` only when intentionally opening registration |

For PostgreSQL, install `.[postgres]` and set a
`postgresql+psycopg://…` URL. PostgreSQL is supported by the storage layer but was
not exercised against a real PostgreSQL server in the local validation.

`docker compose up --build` provides a local container with a persistent named
volume. Do not use multiple Uvicorn processes: this release has a single durable
worker loop. A public deployment needs HTTPS, verified Garmin program permission,
managed secrets, identity recovery/verification, distributed rate limits and a
backup/retention policy. See SECURITY.md.

Garmin's Personal API is intended for individual access; its public FAQ excludes
commercial applications serving multiple end users. A shared hosted service must
confirm its permitted access model or use the business program before launch.
The business adapter, managed object storage, email-link authentication and
multi-worker scheduling are future deployment work, not implemented features.

## Validation

```sh
.venv/bin/pytest -q
npm test
npm run build
```

Tests use synthetic data and mocked HTTP, never production credentials. They
cover isolation, CSRF, encrypted keys, secret-safe errors, exports/deletion,
real-response normalization, inclusive date windows, original archive handling,
same-weekday comparisons, zone coverage and missing baselines.

The final local run passed 26 backend checks, 9 training-calculation checks and
the production frontend build. Docker Compose configuration validates; an image
build and a real PostgreSQL deployment were not exercised.

Live validation was performed against the supplied account on October 31, 2026:
authentication, profile, activity list/detail, daily summaries, sleep, HRV and
original FIT download/decoding succeeded. This proves that account's path, not
every Garmin device or region. See the local research documents for feature gaps.

`scripts/validate_live.py` is an explicit interactive validation helper for a fresh
local installation only. It accepts a key through a hidden prompt, saves only
encrypted Garmin credentials, and prints structure/counts instead of private
measurements. It is never run in CI.

## Scope and next work

The product plan is in WEB_APP_PLAN.md. This is a working first release of its
core training experience. App-owned training-plan scheduling, advanced segment
selection, time/distance-aligned comparison plots, AI explanations and a business
API connector remain later milestones. Current comparison is summary-based;
sleep visualization shows supplied stage totals rather than inventing intervals.

The repository uses MIT for original application code. Bundled fonts retain their
OFL licenses. Garmin API terms and device attribution requirements remain separate.
