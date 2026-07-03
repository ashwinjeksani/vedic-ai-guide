#!/usr/bin/env bash
# Start the vedic-guide dev server in the background.
set -euo pipefail

cd "$(dirname "$0")"

PID_FILE=".dev-server.pid"
LOG_FILE=".dev-server.log"

# Already running?
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Already running (PID $(cat "$PID_FILE")). See $LOG_FILE"
  exit 0
fi

# Install deps on first run.
if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Starting dev server..."
nohup npm run dev -- --host >"$LOG_FILE" 2>&1 &
echo $! >"$PID_FILE"

# Wait briefly and surface the URL.
sleep 2
echo "Started (PID $(cat "$PID_FILE"))."
grep -Eo "http://localhost:[0-9]+" "$LOG_FILE" | head -n1 || echo "Server is starting — check $LOG_FILE for the URL."
echo "Logs: $LOG_FILE"
