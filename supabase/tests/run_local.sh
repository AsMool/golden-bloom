#!/usr/bin/env bash
# Fresh local database + PostgREST, then the API tests. Needs a local Postgres on :54322
# (see "Tests" in the README) and a PostgREST binary.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
"$HERE/reset_local.sh" > /dev/null
"$HERE/local_api.sh" > /tmp/golden-bloom-local-api.log 2>&1 &
API_PID=$!
trap 'kill $API_PID 2>/dev/null; pkill -P $API_PID 2>/dev/null || true' EXIT
for _ in $(seq 1 50); do
  curl -sf -X POST http://127.0.0.1:54331/rest/v1/rpc/garden_stats -H 'content-type: application/json' -d '{}' > /dev/null && break
  sleep 0.2
done
node --test --test-concurrency=1 "$HERE/api.test.mjs"
