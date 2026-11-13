-- Label existing hashes without changing passwords or requiring a reset.
ALTER TABLE identity_account ALTER COLUMN password_hash TYPE VARCHAR(255);
UPDATE identity_account SET password_hash = '{bcrypt}' || password_hash
WHERE password_hash ~ '^\$2[aby]\$[0-9]{2}\$';

ALTER TABLE article_record ADD COLUMN version BIGINT NOT NULL DEFAULT 0 CHECK (version >= 0);

-- The article module keeps the identity API reference and a historical byline.
ALTER TABLE article_record DROP CONSTRAINT article_record_author_id_fkey;
