#!/usr/bin/env bash
# Start the full local stack in the background:
#   - the Express API server (auth, guest limits, guardrails, model proxy) on :8787
#   - the Vite dev server (UI + HMR) on :5173, proxying /api to the API server
#
# Passkeys need a real backend and a matching ORIGIN, so both run together and
# ORIGIN is pinned to the browser origin (http://localhost:5173).
set -euo pipefail

cd "$(dirname "$0")"           # frontend/
ROOT="$(cd .. && pwd)"
SERVER_DIR="$ROOT/server"

API_PORT="${API_PORT:-8787}"
UI_PORT=5173

API_PID_FILE=".api-server.pid"
API_LOG_FILE=".api-server.log"
UI_PID_FILE=".dev-server.pid"
UI_LOG_FILE=".dev-server.log"

running() { [ -f "$1" ] && kill -0 "$(cat "$1")" 2>/dev/null; }

if running "$UI_PID_FILE"; then
  echo "Already running (UI PID $(cat "$UI_PID_FILE"))."
  exit 0
fi

# Install deps on first run.
[ -d node_modules ] || { echo "Installing frontend deps..."; npm install; }
[ -d "$SERVER_DIR/node_modules" ] || { echo "Installing server deps..."; npm --prefix "$SERVER_DIR" install; }

# Load API keys from frontend/.env (ANTHROPIC_API_KEY / OPENAI_API_KEY).
if [ -f .env ]; then
  set -a; . ./.env; set +a
fi

echo "Starting API server on :$API_PORT ..."
( cd "$SERVER_DIR" && \
  PORT="$API_PORT" \
  RP_ID="localhost" \
  ORIGIN="http://localhost:$UI_PORT" \
  RP_NAME="Sanatana" \
  GUEST_DAILY_LIMIT="${GUEST_DAILY_LIMIT:-10}" \
  ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}" \
  OPENAI_API_KEY="${OPENAI_API_KEY:-}" \
  nohup node index.js >"$SERVER_DIR/.api-server.log" 2>&1 & echo $! )  >"$API_PID_FILE"
cp "$SERVER_DIR/.api-server.log" "$API_LOG_FILE" 2>/dev/null || true

echo "Starting Vite dev server on :$UI_PORT ..."
API_PORT="$API_PORT" nohup npm run dev >"$UI_LOG_FILE" 2>&1 &
echo $! >"$UI_PID_FILE"

sleep 2
echo "Started — API PID $(cat "$API_PID_FILE"), UI PID $(cat "$UI_PID_FILE")."
echo "Open: http://localhost:$UI_PORT   |   API logs: $SERVER_DIR/.api-server.log   |   UI logs: $UI_LOG_FILE"
