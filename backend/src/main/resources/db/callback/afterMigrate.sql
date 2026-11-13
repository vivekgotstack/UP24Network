-- Provision local runtime DML permissions after new tables are migrated.
-- The application cannot alter schemas or read/write Flyway's history.
DO $$
DECLARE relation RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'up24_app') THEN
        FOR relation IN SELECT tablename FROM pg_tables
            WHERE schemaname = 'public' AND tablename <> 'flyway_schema_history'
        LOOP
            EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO up24_app', relation.tablename);
        END LOOP;
    END IF;
END $$;
