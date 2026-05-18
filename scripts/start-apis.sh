#!/usr/bin/env bash
# Run Security API (5115) and Housekeeping API (5116) together.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cleanup() {
  kill "$SEC_PID" "$HK_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

lsof -ti:5115 | xargs kill -9 2>/dev/null || true
lsof -ti:5116 | xargs kill -9 2>/dev/null || true

cd "$ROOT/backend/SecurityOps/src/SecurityOps.Api"
dotnet run --launch-profile http &
SEC_PID=$!

cd "$ROOT/backend/HousekeepingOps/src/HousekeepingOps.Api"
dotnet run --launch-profile http &
HK_PID=$!

echo "Security API:     http://localhost:5115"
echo "Housekeeping API: http://localhost:5116"
wait
