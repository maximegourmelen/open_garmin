#!/usr/bin/env bash
set -euo pipefail
E2E_DATA_DIR="$(mktemp -d /private/tmp/open-garmin-e2e.XXXXXX)"
E2E_MARKER=/private/tmp/open-garmin-e2e-marker-8001
printf '%s' "$E2E_DATA_DIR" > "$E2E_MARKER"
cleanup() { rm -rf "$E2E_DATA_DIR"; rm -f "$E2E_MARKER"; }
trap cleanup EXIT INT TERM
export OPEN_GARMIN_DATA_DIR="$E2E_DATA_DIR"
export OPEN_GARMIN_LOCAL_MODE=0
export OPEN_GARMIN_ALLOWED_ORIGINS=http://127.0.0.1:5174
.venv/bin/uvicorn server.app:app --host 127.0.0.1 --port 8001 --no-access-log
