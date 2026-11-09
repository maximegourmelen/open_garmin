# Open Garmin

Open Garmin is a local, independent companion for people starting to understand their Garmin activity and health data. **Today** offers a gentle daily overview; Activities, Journey, Health, and Progress let you explore the details. Every app-calculated insight has a named method and an explanation. The demo uses synthetic data and works without an account.

![Today in dark mode](docs/screenshots/after/desktop-dark/today.png)

[More screenshots](docs/screenshots/after/) · [Calculation methods](docs/METHODS.md) · [Security details](SECURITY.md)

## Start locally

Requires Python 3.12+ and Node 22.12+.

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -e '.[dev]'
npm ci
npm run build
.venv/bin/uvicorn server.app:app --host 127.0.0.1 --port 8000 --no-access-log
```

Open <http://127.0.0.1:8000>. On macOS, `Start.command` starts the local workspace and opens the app after setup. Stop any other server using port 8000 before relaunching it. For frontend development, run `npm run dev` in a second terminal; Vite proxies `/api` to the Python server.

Choose **Explore sample data** to use the interactive demo. For your own workspace, use **Connect Garmin** and enter a Garmin Personal API key and region. A fresh local installation creates its workspace automatically. A hosted installation uses account sign-in.

## What you can explore

- **Today:** your week, a daily check-in, a helpful suggestion, and recent signals.
- **Activities:** search and filter sessions, open route and sample details, add private notes, and compare activities.
- **Journey:** weekly progress, milestones, streaks, and recap stories.
- **Health:** sleep, heart rate, energy, stress, and steps with missing data shown honestly.
- **Progress:** volume and effort trends, goals, and deeper relationships with evidence.
- **How it works:** calculation methods, provenance, and research context.
- **Settings:** appearance, goals, Garmin connection, exports, and data controls.

## Privacy and data sources

The app reads the documented Garmin Personal API. It does not write to your Garmin account. The key is encrypted on disk; tokens stay in worker memory. Notes and check-ins stay in Open Garmin. Demo data is synthetic and isolated from your workspace. Routes are drawn locally without a map tile provider.

Runtime data defaults to `.runtime/`, which is ignored by Git. You can change the location with `OPEN_GARMIN_DATA_DIR`. JSON and CSV export are available from Settings; original activity ZIPs remain available to the workspace owner. See [SECURITY.md](SECURITY.md) for hosting and data protection details.

Garmin reported values remain distinct from app calculations. Missing readings are not replaced with zero. The formulas and their minimum data requirements are documented in [docs/METHODS.md](docs/METHODS.md), generated from the `/api/methods` registry. Research references are listed in the in-app How it works page and the `research/` directory.

Open Garmin is not affiliated with, endorsed by, or sponsored by Garmin. Garmin and Garmin Connect are trademarks of Garmin Ltd. or its subsidiaries.

## Verify the project

```sh
.venv/bin/pytest -q
npm test
npm run lint
npm run contrast
npx playwright test
```

Playwright starts a disposable server and uses only synthetic demo data. Its screenshots are in `docs/screenshots/after/`.
