CREATE TABLE cricket_score_snapshot (
    match_id bigint PRIMARY KEY,
    live boolean NOT NULL,
    completed boolean NOT NULL,
    observed_at timestamptz NOT NULL,
    scorecard jsonb NOT NULL
);

INSERT INTO automation_job (job_key, name, enabled, interval_minutes, last_result)
VALUES ('cricket', 'Cricket scores', FALSE, 5, 'Enable after configuring the Sportmonks cricket feed.');
