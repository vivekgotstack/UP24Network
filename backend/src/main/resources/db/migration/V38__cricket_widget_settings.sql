DELETE FROM automation_job WHERE job_key = 'cricket';
DROP TABLE cricket_score_snapshot;

UPDATE publication_settings
SET content = jsonb_set(content, '{showCricketScores}', 'true'::jsonb)
WHERE NOT (content ? 'showCricketScores');
