#!/usr/bin/env bash
# Recreates the local test database and applies every migration in order.
set -euo pipefail
DB_URL_ADMIN=${DB_URL_ADMIN:-postgres://postgres@127.0.0.1:54322/postgres}
DB_NAME=${DB_NAME:-golden_bloom_test}
HERE="$(cd "$(dirname "$0")" && pwd)"
psql "$DB_URL_ADMIN" -v ON_ERROR_STOP=1 -q -c "drop database if exists $DB_NAME with (force)" -c "create database $DB_NAME"
DB_URL="${DB_URL_ADMIN%/*}/$DB_NAME"
psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "$HERE/local_bootstrap.sql"
for f in "$HERE"/../migrations/*.sql; do
  echo "→ $(basename "$f")"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "$f"
done
psql "$DB_URL" -v ON_ERROR_STOP=1 -q -c "select private.set_moderator_passcode('local-test-code')"
echo "ready: $DB_URL"
