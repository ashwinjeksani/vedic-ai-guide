#!/usr/bin/env bash
# Stop the background vedic-guide dev server.
set -euo pipefail

cd "$(dirname "$0")"

PID_FILE=".dev-server.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "No PID file — server does not appear to be running."
  exit 0
fi

PID="$(cat "$PID_FILE")"
if kill -0 "$PID" 2>/dev/null; then
  # Kill the process group so child vite/esbuild processes go too.
  kill "$PID" 2>/dev/null || true
  pkill -P "$PID" 2>/dev/null || true
  echo "Stopped (PID $PID)."
else
  echo "Process $PID not running (stale PID file)."
fi

rm -f "$PID_FILE"
