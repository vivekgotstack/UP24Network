-- Match the public feed's deterministic publication order without indexing drafts.
CREATE INDEX article_public_feed_idx ON article_record(published_at DESC,id DESC) WHERE status='PUBLISHED';
DROP INDEX article_publication_idx;

-- Referenced-side indexes avoid scanning every report/revision when removing media.
CREATE INDEX article_image_hash_idx ON article_record(image_hash) WHERE image_hash IS NOT NULL;
CREATE INDEX article_video_reference_idx ON article_record(video_url) WHERE video_url IS NOT NULL;
CREATE INDEX article_revision_image_idx ON article_revision((snapshot->>'image'));
CREATE INDEX article_revision_video_idx ON article_revision((snapshot->>'video_url')) WHERE snapshot->>'video_url' IS NOT NULL;
CREATE INDEX identity_otp_expiry_idx ON identity_newsroom_otp(expires_at);
CREATE INDEX identity_account_created_idx ON identity_account(created_at DESC,id);

-- Reject malformed data at the storage boundary as well as at the API boundary.
ALTER TABLE identity_account ADD CONSTRAINT identity_normalized_email CHECK (email=lower(btrim(email)));
ALTER TABLE identity_account ADD CONSTRAINT identity_display_name_present CHECK (length(btrim(display_name))>0);
CREATE UNIQUE INDEX identity_single_administrator_idx ON identity_account(role) WHERE role='ADMIN';
ALTER TABLE article_record ADD CONSTRAINT article_body_array CHECK (jsonb_typeof(paragraphs)='array');
ALTER TABLE article_record ADD CONSTRAINT article_published_date_required CHECK (status<>'PUBLISHED' OR published_at IS NOT NULL);
ALTER TABLE identity_login_session ADD CONSTRAINT identity_verification_pair CHECK ((verified_until IS NULL)=(verified_role IS NULL));
ALTER TABLE identity_login_session ADD CONSTRAINT identity_verified_role CHECK (verified_role IN ('ADMIN','EDITOR','REPORTER'));
ALTER TABLE identity_refresh_token ADD CONSTRAINT identity_refresh_digest_format CHECK (digest ~ '^[a-f0-9]{64}$');
