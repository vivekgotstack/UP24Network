CREATE TABLE publication_newsletter_limit (
    expires_at timestamptz NOT NULL,
    bucket_key varchar(64) NOT NULL,
    attempts integer NOT NULL CHECK (attempts > 0),
    PRIMARY KEY (expires_at, bucket_key)
);
