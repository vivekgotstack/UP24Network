CREATE TABLE identity_login_attempt_bucket (
    bucket_key CHAR(64) PRIMARY KEY CHECK (bucket_key ~ '^[a-f0-9]{64}$'),
    attempts INTEGER NOT NULL CHECK (attempts>0 AND attempts<=10001),
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX identity_login_bucket_expiry_idx ON identity_login_attempt_bucket(expires_at);
