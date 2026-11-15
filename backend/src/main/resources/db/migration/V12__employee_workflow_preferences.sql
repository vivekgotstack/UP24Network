CREATE TABLE identity_workflow (
    account_id UUID PRIMARY KEY REFERENCES identity_account(id) ON DELETE CASCADE,
    require_dateline BOOLEAN NOT NULL DEFAULT TRUE,
    require_sources BOOLEAN NOT NULL DEFAULT TRUE,
    require_media BOOLEAN NOT NULL DEFAULT TRUE,
    autofill BOOLEAN NOT NULL DEFAULT TRUE,
    default_category VARCHAR(100) NOT NULL DEFAULT 'Uttar Pradesh',
    default_city VARCHAR(100) NOT NULL DEFAULT '',
    version BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
