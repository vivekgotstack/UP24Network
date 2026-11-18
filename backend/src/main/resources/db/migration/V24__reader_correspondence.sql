CREATE TABLE publication_correspondence (
    id uuid PRIMARY KEY,
    topic varchar(16) NOT NULL CHECK (topic IN ('GENERAL', 'TIP', 'CORRECTION', 'COMPLAINT', 'PRIVACY', 'ADVERTISING')),
    sender_name varchar(100) NOT NULL,
    reply_email varchar(254) NOT NULL,
    subject varchar(160) NOT NULL,
    message varchar(4000) NOT NULL,
    resolved boolean NOT NULL DEFAULT false,
    version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
    received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX publication_correspondence_received_idx ON publication_correspondence (received_at DESC, id DESC);
CREATE INDEX publication_correspondence_open_idx ON publication_correspondence (received_at DESC, id DESC) WHERE NOT resolved;

CREATE TABLE publication_correspondence_limit (
    expires_at timestamptz NOT NULL,
    bucket_key varchar(64) NOT NULL,
    submissions integer NOT NULL CHECK (submissions > 0),
    PRIMARY KEY (expires_at, bucket_key)
);
