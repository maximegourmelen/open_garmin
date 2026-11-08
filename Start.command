#!/bin/zsh
set -e
cd "$(dirname "$0")"
if [[ ! -x .venv/bin/python ]]; then
  python3 -m venv .venv
  .venv/bin/python -m pip install -e .
fi
if [[ ! -d dist ]]; then
  npm ci
  npm run build
fi
if curl --silent --fail http://127.0.0.1:8000/api/health >/dev/null; then
  open "http://127.0.0.1:8000"
  exit 0
fi
(
  for attempt in {1..40}; do
    if curl --silent --fail http://127.0.0.1:8000/api/health >/dev/null; then
      open "http://127.0.0.1:8000"
      break
    fi
    sleep 0.5
  done
) &
exec .venv/bin/uvicorn server.app:app --host 127.0.0.1 --port 8000 --no-access-log
