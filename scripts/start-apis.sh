#!/usr/bin/env bash
# Run the unified Godrej API (Security + Housekeeping + Auth) on port 5115.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

lsof -ti:5115 | xargs kill -9 2>/dev/null || true

cd "$ROOT/backend/SecurityOps/src/SecurityOps.Api"
echo "Godrej API: http://localhost:5115 (security + housekeeping + auth)"
dotnet run --launch-profile http
