ALTER TABLE automation_job ADD COLUMN lease_token UUID;
ALTER TABLE automation_job ADD COLUMN failure_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE horoscope_settings (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    visible BOOLEAN NOT NULL DEFAULT FALSE
);
INSERT INTO horoscope_settings(id) VALUES (1);

CREATE TABLE horoscope_edition (
    edition_date DATE PRIMARY KEY,
    content JSONB NOT NULL,
    provider VARCHAR(80) NOT NULL,
    provider_request_id VARCHAR(200) NOT NULL,
    engine_version VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Retire the WordPress dependency without deleting articles or overwriting editors.
UPDATE article_record SET status = 'DRAFT', breaking = FALSE, updated_at = CURRENT_TIMESTAMP
WHERE upstream_key LIKE 'wordpress:%' AND NOT manual_override;
DELETE FROM automation_job WHERE job_key = 'news';
UPDATE automation_job SET enabled = FALSE, running = FALSE,
    last_result = 'Awaiting a vetted external provider integration.' WHERE job_key IN ('health','books','awards');
UPDATE automation_job SET enabled = FALSE, running = FALSE,
    last_result = 'Configure the server-side Hindi provider key, then enable this section.' WHERE job_key = 'rashifal';
