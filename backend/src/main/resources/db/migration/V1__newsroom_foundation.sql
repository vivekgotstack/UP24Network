CREATE TABLE identity_account (
    id UUID PRIMARY KEY,
    email VARCHAR(254) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN','EDITOR','REPORTER','SUBSCRIBER')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE article_record (
    id UUID PRIMARY KEY,
    slug VARCHAR(500) NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    summary TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT '',
    author VARCHAR(100) NOT NULL,
    author_id UUID REFERENCES identity_account(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('DRAFT','PUBLISHED')) DEFAULT 'DRAFT',
    published_at TIMESTAMPTZ,
    image TEXT NOT NULL DEFAULT '/brand/newsroom-banner.png',
    image_alt VARCHAR(500) NOT NULL DEFAULT '',
    video_url TEXT,
    youtube_id VARCHAR(30),
    paragraphs JSONB NOT NULL DEFAULT '[]',
    breaking BOOLEAN NOT NULL DEFAULT FALSE,
    upstream_key VARCHAR(100) UNIQUE,
    source_url TEXT,
    manual_override BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX article_publication_idx ON article_record(status, published_at DESC);

CREATE TABLE automation_job (
    job_key VARCHAR(40) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    interval_minutes INTEGER NOT NULL CHECK (interval_minutes BETWEEN 5 AND 10080),
    next_run_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_run_at TIMESTAMPTZ,
    last_result TEXT NOT NULL DEFAULT 'Not run yet',
    running BOOLEAN NOT NULL DEFAULT FALSE
);
INSERT INTO automation_job(job_key,name,enabled,interval_minutes) VALUES
('news','UP24Network news import',TRUE,5),
('youtube','YouTube channel updates',TRUE,15),
('rashifal','Daily Rashifal',FALSE,1440),
('health','Health & Wellness',FALSE,1440),
('books','Books & Literature',FALSE,1440),
('awards','Awards & Publications',FALSE,1440);
