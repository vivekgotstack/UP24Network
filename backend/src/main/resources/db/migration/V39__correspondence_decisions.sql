ALTER TABLE publication_correspondence
    ADD COLUMN resolved_at timestamptz,
    ADD COLUMN resolution_note varchar(2000),
    ADD COLUMN preserved boolean NOT NULL DEFAULT false,
    ADD CONSTRAINT publication_correspondence_resolution_state
        CHECK (resolved OR (resolved_at IS NULL AND resolution_note IS NULL));

CREATE INDEX publication_correspondence_topic_idx
    ON publication_correspondence (topic, received_at DESC, id DESC);

CREATE INDEX publication_correspondence_open_grievances_idx
    ON publication_correspondence (topic, received_at, id)
    WHERE NOT resolved AND topic IN ('COMPLAINT', 'PRIVACY');
