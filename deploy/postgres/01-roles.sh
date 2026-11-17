#!/bin/sh
set -eu
application_password="$(cat /run/secrets/application-db-password)"
migration_password="$(cat /run/secrets/migration-db-password)"
case "$application_password$migration_password" in *[!A-Fa-f0-9]*) echo 'Database role secrets must be hexadecimal.' >&2; exit 1;; esac
[ "${#application_password}" -ge 48 ] && [ "${#migration_password}" -ge 48 ] || { echo 'Database role secrets are incomplete.' >&2; exit 1; }
# Secrets travel through stdin, never through psql arguments or application logs.
{
  printf "\\set application_password '%s'\n" "$application_password"
  printf "\\set migration_password '%s'\n" "$migration_password"
  cat <<'SQL'
SELECT 'CREATE ROLE up24_migrator NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION' WHERE NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='up24_migrator') \gexec
SELECT 'CREATE ROLE up24_app NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION' WHERE NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='up24_app') \gexec
SELECT format('ALTER ROLE up24_migrator LOGIN PASSWORD %L', :'migration_password') \gexec
SELECT format('ALTER ROLE up24_app LOGIN PASSWORD %L', :'application_password') \gexec
ALTER DATABASE up24network OWNER TO up24_migrator;
ALTER SCHEMA public OWNER TO up24_migrator;
REVOKE ALL ON DATABASE up24network FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE up24network TO up24_app;
GRANT USAGE ON SCHEMA public TO up24_app;
-- Flyway's existing afterMigrate callback grants runtime DML on application
-- tables explicitly. Default grants would also expose its history table.
SQL
} | psql -X -q -v ON_ERROR_STOP=1 --username "${POSTGRES_USER:-postgres}" --dbname "${POSTGRES_DB:-up24network}"
