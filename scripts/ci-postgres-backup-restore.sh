#!/usr/bin/env bash
# Isolated CI-only backup/restore verification. Never use production URLs.
set -euo pipefail
: "${MOLTBEER_CI_POSTGRES_URL:?CI-only database URL required}"
[[ "$MOLTBEER_CI_POSTGRES_URL" == "postgresql://moltbeer_ci:ci_only_password@127.0.0.1:5432/moltbeer_ci" ]] || {
 echo "Refusing non-CI PostgreSQL target" >&2; exit 2;
}
: "${CI_POSTGRES_CONTAINER:?GitHub Actions postgres service container required}"
case "$CI_POSTGRES_CONTAINER" in
  *[!a-zA-Z0-9_-]*|'') echo 'Invalid container identifier' >&2; exit 2;;
esac
pg() { docker exec -e PGPASSWORD=ci_only_password "$CI_POSTGRES_CONTAINER" "$@"; }
# Disposable source and target databases exist only inside the CI postgres container.
pg psql -U moltbeer_ci -d postgres -v ON_ERROR_STOP=1 -c 'CREATE DATABASE moltbeer_backup_source'
pg psql -U moltbeer_ci -d postgres -v ON_ERROR_STOP=1 -c 'CREATE DATABASE moltbeer_backup_restore'
pg psql -U moltbeer_ci -d moltbeer_backup_source -v ON_ERROR_STOP=1 -c \
 "CREATE TABLE backup_probe (id integer PRIMARY KEY, label text NOT NULL); INSERT INTO backup_probe VALUES (42, 'verified-ci-only');"
# Stream the real pg_dump output to pg_restore without ever writing a production dump.
docker exec -e PGPASSWORD=ci_only_password "$CI_POSTGRES_CONTAINER" \
 pg_dump -U moltbeer_ci -d moltbeer_backup_source --format=custom --no-owner --no-acl \
 | docker exec -i -e PGPASSWORD=ci_only_password "$CI_POSTGRES_CONTAINER" \
 pg_restore -U moltbeer_ci -d moltbeer_backup_restore --no-owner --no-acl --exit-on-error
actual="$(pg psql -U moltbeer_ci -d moltbeer_backup_restore -At -v ON_ERROR_STOP=1 \
 -c "SELECT label FROM backup_probe WHERE id=42")"
[[ "$actual" == "verified-ci-only" ]] || { echo "Isolated restore mismatch" >&2; exit 1; }
echo 'PASS isolated PostgreSQL pg_dump -> pg_restore (disposable CI databases only)'
