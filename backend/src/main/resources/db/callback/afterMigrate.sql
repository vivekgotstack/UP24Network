-- Provision local runtime DML permissions after new tables are migrated.
-- The application cannot alter schemas or read/write Flyway's history.
DO $$
DECLARE relation RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'up24_app') THEN
        EXECUTE format('GRANT USAGE ON SCHEMA %I TO up24_app',current_schema());
        FOR relation IN SELECT tablename FROM pg_tables
            WHERE schemaname = current_schema() AND tablename <> 'flyway_schema_history'
        LOOP
            EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I.%I TO up24_app',current_schema(),relation.tablename);
        END LOOP;
    END IF;
END $$;
