CREATE TABLE video_asset (
    id UUID PRIMARY KEY,
    uploaded_by UUID REFERENCES identity_account(id) ON DELETE SET NULL,
    original_name VARCHAR(255) NOT NULL,
    original_bytes BIGINT NOT NULL CHECK (original_bytes BETWEEN 1 AND 262144000),
    stored_bytes BIGINT NOT NULL DEFAULT 0 CHECK (stored_bytes>=0),
    reserved_bytes BIGINT NOT NULL CHECK (reserved_bytes>=original_bytes),
    storage_backend VARCHAR(10) NOT NULL CHECK (storage_backend IN ('LOCAL','S3')),
    storage_bucket VARCHAR(63) NOT NULL DEFAULT '',
    source_key VARCHAR(500) NOT NULL,
    output_key VARCHAR(500),
    state VARCHAR(12) NOT NULL DEFAULT 'UPLOADING' CHECK (state IN ('UPLOADING','QUEUED','PROCESSING','READY','FAILED','DELETING')),
    width INTEGER CHECK (width BETWEEN 1 AND 1920),
    height INTEGER CHECK (height BETWEEN 1 AND 1080),
    duration_seconds DOUBLE PRECISION CHECK (duration_seconds>0 AND duration_seconds<=901),
    checksum CHAR(64) CHECK (checksum ~ '^[a-f0-9]{64}$'),
    job_id UUID,
    processing_token UUID,
    upload_token UUID,
    upload_lease_until TIMESTAMPTZ,
    upload_expires_at TIMESTAMPTZ NOT NULL,
    version BIGINT NOT NULL DEFAULT 0 CHECK (version>=0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_error VARCHAR(300),
    CHECK ((upload_token IS NULL)=(upload_lease_until IS NULL)),
    CHECK (state<>'READY' OR (output_key IS NOT NULL AND checksum IS NOT NULL AND stored_bytes>0 AND duration_seconds IS NOT NULL))
);
CREATE INDEX video_asset_created_idx ON video_asset(created_at DESC,id);
CREATE INDEX video_asset_owner_idx ON video_asset(uploaded_by,created_at DESC,id);
CREATE INDEX video_upload_expiry_idx ON video_asset(upload_expires_at) WHERE state='UPLOADING';

ALTER TABLE article_record ADD COLUMN video_asset_id UUID GENERATED ALWAYS AS
    (CASE WHEN video_url ~ '^/media/videos/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.mp4$'
      THEN substring(video_url FROM 15 FOR 36)::UUID ELSE NULL END) STORED;
ALTER TABLE article_record ADD CONSTRAINT article_video_asset_fk FOREIGN KEY(video_asset_id) REFERENCES video_asset(id);
CREATE INDEX article_video_asset_idx ON article_record(video_asset_id) WHERE video_asset_id IS NOT NULL;
CREATE FUNCTION article_ready_video_required() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.video_asset_id IS NOT NULL THEN
        PERFORM id FROM video_asset WHERE id=NEW.video_asset_id AND state='READY' FOR SHARE;
        IF NOT FOUND THEN RAISE EXCEPTION 'A report can reference only a ready video.' USING ERRCODE='23514'; END IF;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER article_ready_video_guard AFTER INSERT OR UPDATE OF video_url ON article_record
FOR EACH ROW EXECUTE FUNCTION article_ready_video_required();
