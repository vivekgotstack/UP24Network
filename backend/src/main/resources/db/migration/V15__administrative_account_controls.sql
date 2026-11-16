ALTER TABLE identity_account ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE identity_account ADD COLUMN version BIGINT NOT NULL DEFAULT 0 CHECK (version>=0);
CREATE INDEX identity_email_prefix_idx ON identity_account(lower(email) text_pattern_ops);
CREATE INDEX identity_name_prefix_idx ON identity_account(lower(display_name) text_pattern_ops);
CREATE INDEX identity_role_created_idx ON identity_account(role,created_at DESC,id);
