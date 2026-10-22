#!/usr/bin/env bash
# Starts PostgREST (plus a tiny /rest/v1 proxy) on top of the local test database,
# so the real supabase-js client can be pointed at it.
#   POSTGREST_BIN=/path/to/postgrest ./supabase/tests/local_api.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
export PGRST_DB_URI=${PGRST_DB_URI:-postgres://authenticator:authenticator@127.0.0.1:54322/golden_bloom_test}
export PGRST_DB_SCHEMAS=public
export PGRST_DB_ANON_ROLE=anon
export PGRST_JWT_SECRET=${PGRST_JWT_SECRET:-golden-bloom-local-test-secret-0123456789}
export PGRST_SERVER_PORT=54330
export PGRST_DB_POOL=10
"${POSTGREST_BIN:-postgrest}" &
PGRST_PID=$!
node "$HERE/rest_proxy.mjs" &
PROXY_PID=$!
trap 'kill $PGRST_PID $PROXY_PID 2>/dev/null' EXIT
wait
