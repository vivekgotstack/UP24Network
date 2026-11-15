CREATE TABLE media_asset (
    id VARCHAR(64) PRIMARY KEY CHECK (id ~ '^[a-f0-9]{64}$'),
    original_name VARCHAR(255) NOT NULL,
    bytes INTEGER NOT NULL CHECK (bytes BETWEEN 1 AND 2097152),
    original_bytes INTEGER NOT NULL CHECK (original_bytes BETWEEN 1 AND 12582912),
    width INTEGER NOT NULL CHECK (width BETWEEN 1 AND 1920),
    height INTEGER NOT NULL CHECK (height BETWEEN 1 AND 1920),
    uploaded_by UUID REFERENCES identity_account(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX media_created_idx ON media_asset(created_at DESC,id);
ALTER TABLE article_record ADD COLUMN image_hash VARCHAR(64) GENERATED ALWAYS AS
    (CASE WHEN image ~ '^/media/[a-f0-9]{64}\.webp$' THEN substring(image FROM 8 FOR 64) ELSE NULL END) STORED;
ALTER TABLE article_record ADD CONSTRAINT article_media_asset_fk FOREIGN KEY(image_hash) REFERENCES media_asset(id);
