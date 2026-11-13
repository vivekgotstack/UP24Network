CREATE TABLE identity_newsroom_otp (
    email VARCHAR(254) PRIMARY KEY REFERENCES identity_account(email),
    challenge_id UUID NOT NULL,
    session_digest CHAR(64) NOT NULL,
    code_digest CHAR(64),
    requested_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts SMALLINT NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
    window_started_at TIMESTAMPTZ NOT NULL,
    requests SMALLINT NOT NULL DEFAULT 0 CHECK (requests BETWEEN 0 AND 5)
);
