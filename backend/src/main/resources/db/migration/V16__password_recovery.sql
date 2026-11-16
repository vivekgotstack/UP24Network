-- One short-lived challenge per account; no clear-text codes or reset URLs persist.
CREATE TABLE identity_password_recovery (
    account_id UUID PRIMARY KEY REFERENCES identity_account(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL,
    account_version BIGINT NOT NULL CHECK (account_version >= 0),
    code_digest CHAR(64) CHECK (code_digest ~ '^[a-f0-9]{64}$'),
    issued_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts SMALLINT NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
    CHECK (expires_at > issued_at)
);
CREATE INDEX identity_recovery_expiry_idx ON identity_password_recovery(expires_at);
