#!/usr/bin/env bash
# Stop the background local stack (Vite UI + Express API).
set -euo pipefail

cd "$(dirname "$0")"

stop_one() {
  local pid_file="$1" name="$2"
  [ -f "$pid_file" ] || return 0
  local pid; pid="$(cat "$pid_file")"
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    pkill -P "$pid" 2>/dev/null || true
    echo "Stopped $name (PID $pid)."
  else
    echo "$name not running (stale PID)."
  fi
  rm -f "$pid_file"
}

stop_one ".dev-server.pid" "UI"
stop_one ".api-server.pid" "API"
