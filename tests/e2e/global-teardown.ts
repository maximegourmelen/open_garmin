import { existsSync, readFileSync, rmSync } from 'node:fs';

const marker = '/private/tmp/open-garmin-e2e-marker-8001';

export default function cleanupDemoData() {
  if (!existsSync(marker)) return;
  const directory = readFileSync(marker, 'utf8');
  if (/^\/private\/tmp\/open-garmin-e2e\.[A-Za-z0-9]{6}$/.test(directory))
    rmSync(directory, { recursive: true, force: true });
  rmSync(marker, { force: true });
}
