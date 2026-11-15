CREATE TABLE publication_settings (
    id SMALLINT PRIMARY KEY CHECK (id=1),
    content JSONB NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE publication_page (
    slug VARCHAR(100) PRIMARY KEY,
    content JSONB NOT NULL,
    position SMALLINT NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL
);
