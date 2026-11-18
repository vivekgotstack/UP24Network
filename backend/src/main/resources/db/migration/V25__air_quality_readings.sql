CREATE TABLE air_quality_reading (
    location_key varchar(64) PRIMARY KEY,
    aqi smallint NOT NULL CHECK (aqi BETWEEN 0 AND 10000),
    observed_at timestamptz NOT NULL,
    provider varchar(32) NOT NULL
);

INSERT INTO automation_job (job_key, name, enabled, interval_minutes, last_result)
VALUES ('aqi', 'Air Quality Index', FALSE, 60, 'Enable after configuring the commercial backend feed.');
