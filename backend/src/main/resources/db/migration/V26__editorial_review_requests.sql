CREATE TABLE article_review_request (
    id uuid PRIMARY KEY,
    article_id uuid NOT NULL REFERENCES article_record(id) ON DELETE CASCADE,
    article_version bigint NOT NULL CHECK (article_version >= 0),
    kind varchar(12) NOT NULL CHECK (kind IN ('PUBLISH', 'UPDATE')),
    state varchar(12) NOT NULL DEFAULT 'PENDING' CHECK (state IN ('PENDING', 'APPROVED', 'RETURNED')),
    title varchar(500) NOT NULL,
    submitter_id uuid NOT NULL,
    submitted_by varchar(100) NOT NULL,
    proposed_input jsonb NOT NULL CHECK (jsonb_typeof(proposed_input) = 'object'),
    change_summary varchar(2000) NOT NULL CHECK (char_length(btrim(change_summary)) >= 20),
    verification_notes varchar(4000) NOT NULL CHECK (char_length(btrim(verification_notes)) >= 40),
    submitted_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_by uuid,
    decided_at timestamptz,
    decision_note varchar(2000),
    CHECK (
        (state = 'PENDING' AND decided_by IS NULL AND decided_at IS NULL AND decision_note IS NULL)
        OR (state = 'APPROVED' AND decided_by IS NOT NULL AND decided_at IS NOT NULL AND decision_note IS NULL)
        OR (state = 'RETURNED' AND decided_by IS NOT NULL AND decided_at IS NOT NULL
            AND decision_note IS NOT NULL AND char_length(btrim(decision_note)) >= 12)
    )
);

ALTER TABLE article_review_request ALTER COLUMN proposed_input SET COMPRESSION lz4;
CREATE UNIQUE INDEX article_review_pending_idx ON article_review_request(article_id) WHERE state = 'PENDING';
CREATE INDEX article_review_queue_idx ON article_review_request(state, submitted_at DESC, id DESC);
CREATE INDEX article_review_staff_history_idx ON article_review_request(article_id, submitter_id, submitted_at DESC, id DESC);
