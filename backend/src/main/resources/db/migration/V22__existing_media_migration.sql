ALTER TABLE media_retention_policy ADD COLUMN migration_run_id UUID;
ALTER TABLE media_retention_policy ADD COLUMN migration_job_id UUID REFERENCES background_job(id) ON DELETE SET NULL;
ALTER TABLE media_retention_policy ADD COLUMN migration_started_at TIMESTAMPTZ;
ALTER TABLE media_retention_policy ADD COLUMN migration_completed_at TIMESTAMPTZ;
ALTER TABLE media_retention_policy ADD COLUMN migration_moved BIGINT NOT NULL DEFAULT 0 CHECK (migration_moved>=0);
ALTER TABLE media_retention_policy ADD COLUMN migration_error VARCHAR(300);
ALTER TABLE media_retention_policy ADD COLUMN migration_bucket VARCHAR(63);
ALTER TABLE media_retention_policy ADD COLUMN migration_prefix VARCHAR(200);

-- A bounded copy lease protects the destination while network I/O happens
-- outside database transactions. Its bytes reserve temporary storage capacity.
CREATE TABLE media_copy_reservation (
    asset_id VARCHAR(64) PRIMARY KEY REFERENCES media_asset(id),
    token UUID NOT NULL,
    storage_backend VARCHAR(10) NOT NULL CHECK (storage_backend='S3'),
    storage_bucket VARCHAR(63) NOT NULL,
    object_key VARCHAR(500) NOT NULL,
    bytes INTEGER NOT NULL CHECK (bytes BETWEEN 1 AND 2097152),
    expires_at TIMESTAMPTZ NOT NULL,
    UNIQUE(storage_backend,storage_bucket,object_key)
);
CREATE INDEX media_copy_expiry_idx ON media_copy_reservation(expires_at);
