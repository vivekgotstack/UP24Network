-- Public /media/{sha256}.webp addresses survive storage-provider changes.
ALTER TABLE media_asset ADD COLUMN storage_backend VARCHAR(10) NOT NULL DEFAULT 'LOCAL'
    CHECK (storage_backend IN ('LOCAL','S3'));
ALTER TABLE media_asset ADD COLUMN storage_bucket VARCHAR(63) NOT NULL DEFAULT '';
ALTER TABLE media_asset ADD COLUMN object_key VARCHAR(500);
UPDATE media_asset SET object_key=id||'.webp';
ALTER TABLE media_asset ALTER COLUMN object_key SET NOT NULL;
ALTER TABLE media_asset ADD COLUMN archive_eligible BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE media_asset ADD COLUMN version BIGINT NOT NULL DEFAULT 0 CHECK (version>=0);
ALTER TABLE media_asset ADD COLUMN retention_applied_version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE media_asset ADD COLUMN retention_retry_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE media_asset ADD CONSTRAINT media_storage_location_valid CHECK (
    (storage_backend='LOCAL' AND storage_bucket='' AND object_key=id||'.webp')
    OR (storage_backend='S3' AND length(storage_bucket)>=3 AND length(object_key)>0)
);
CREATE UNIQUE INDEX media_object_location_idx ON media_asset(storage_backend,storage_bucket,object_key);
CREATE INDEX media_retention_pending_idx ON media_asset(retention_retry_at)
    WHERE storage_backend='S3' AND retention_applied_version<>version;

CREATE TABLE media_retention_policy (
    id SMALLINT PRIMARY KEY CHECK (id=1),
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    transition_days INTEGER NOT NULL DEFAULT 365 CHECK (transition_days BETWEEN 90 AND 3650),
    version BIGINT NOT NULL DEFAULT 0 CHECK (version>=0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    applied_version BIGINT,
    applied_at TIMESTAMPTZ,
    last_error VARCHAR(300),
    lease_token UUID,
    lease_until TIMESTAMPTZ,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK ((lease_token IS NULL)=(lease_until IS NULL))
);
INSERT INTO media_retention_policy(id) VALUES (1);

-- Durable cleanup is retried after a transient filesystem/S3 failure.
CREATE TABLE media_pending_deletion (
    asset_id CHAR(64) NOT NULL CHECK (asset_id ~ '^[a-f0-9]{64}$'),
    storage_backend VARCHAR(10) NOT NULL CHECK (storage_backend IN ('LOCAL','S3')),
    storage_bucket VARCHAR(63) NOT NULL,
    object_key VARCHAR(500) NOT NULL,
    bytes INTEGER NOT NULL CHECK (bytes>0),
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts>=0),
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(storage_backend,storage_bucket,object_key)
);
CREATE INDEX media_pending_deletion_due_idx ON media_pending_deletion(next_attempt_at);
