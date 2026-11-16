CREATE TABLE background_job (
    id UUID PRIMARY KEY,
    dedup_key VARCHAR(180) NOT NULL UNIQUE,
    job_type VARCHAR(80) NOT NULL,
    lane VARCHAR(10) NOT NULL CHECK (lane IN ('MAIL','MEDIA')),
    state VARCHAR(12) NOT NULL DEFAULT 'PENDING' CHECK (state IN ('PENDING','DISPATCHED','RUNNING','SUCCEEDED','FAILED')),
    payload BYTEA,
    attempts SMALLINT NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    lease_token UUID,
    lease_until TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    last_error VARCHAR(200),
    CHECK ((lease_token IS NULL)=(lease_until IS NULL)),
    CHECK (expires_at>created_at)
);
CREATE INDEX background_due_idx ON background_job(next_attempt_at,id) WHERE state IN ('PENDING','DISPATCHED');
CREATE INDEX background_running_idx ON background_job(lease_until) WHERE state='RUNNING';
CREATE INDEX background_cleanup_idx ON background_job(expires_at,id);
