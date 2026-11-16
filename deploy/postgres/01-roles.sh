#!/bin/sh
set -eu
application_password="$(cat /run/secrets/application-db-password)"
migration_password="$(cat /run/secrets/migration-db-password)"
case "$application_password$migration_password" in *[!A-Fa-f0-9]*) echo 'Database role secrets must be hexadecimal.' >&2; exit 1;; esac
# Secrets travel through stdin, never through psql arguments or application logs.
{
  printf "\\set application_password '%s'\n" "$application_password"
  printf "\\set migration_password '%s'\n" "$migration_password"
  cat <<'SQL'
SELECT format('CREATE ROLE up24_migrator LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION', :'migration_password') \gexec
SELECT format('CREATE ROLE up24_app LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION', :'application_password') \gexec
ALTER DATABASE up24network OWNER TO up24_migrator;
ALTER SCHEMA public OWNER TO up24_migrator;
REVOKE ALL ON DATABASE up24network FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE up24network TO up24_app;
GRANT USAGE ON SCHEMA public TO up24_app;
-- Flyway's existing afterMigrate callback grants runtime DML on application
-- tables explicitly. Default grants would also expose its history table.
SQL
} | psql -X -q -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB"
