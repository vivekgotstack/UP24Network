CREATE TABLE identity_login_session (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES identity_account(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    verified_until TIMESTAMPTZ,
    verified_role VARCHAR(20),
    CHECK (expires_at > created_at)
);
CREATE INDEX identity_session_account_idx ON identity_login_session(account_id) WHERE revoked_at IS NULL;
CREATE INDEX identity_session_expiry_idx ON identity_login_session(expires_at);

-- Consumed digests are retained until the session expires to detect refresh replay.
CREATE TABLE identity_refresh_token (
    digest CHAR(64) PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES identity_login_session(id) ON DELETE CASCADE,
    issued_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ
);
CREATE INDEX identity_refresh_session_idx ON identity_refresh_token(session_id);
