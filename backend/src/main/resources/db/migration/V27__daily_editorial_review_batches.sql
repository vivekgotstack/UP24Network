ALTER TABLE article_review_request ADD COLUMN review_day date;
UPDATE article_review_request SET review_day = (submitted_at AT TIME ZONE 'Asia/Kolkata')::date;
ALTER TABLE article_review_request ALTER COLUMN review_day SET NOT NULL;

CREATE INDEX article_review_daily_queue_idx ON article_review_request (review_day DESC, submitter_id, submitted_at DESC, id DESC);
CREATE INDEX article_review_pending_day_idx ON article_review_request (submitter_id, review_day, article_id) WHERE state = 'PENDING';

CREATE TABLE article_review_batch_decision (
    submitter_id uuid NOT NULL,
    review_day date NOT NULL,
    closed_at timestamptz NOT NULL,
    closed_by uuid NOT NULL,
    rewarded_at timestamptz,
    rewarded_by uuid,
    reward_note varchar(2000),
    rewarded_count integer NOT NULL DEFAULT 0,
    PRIMARY KEY (submitter_id, review_day),
    CHECK ((rewarded_at IS NULL AND rewarded_by IS NULL AND reward_note IS NULL AND rewarded_count = 0) OR
           (rewarded_at IS NOT NULL AND rewarded_by IS NOT NULL AND reward_note IS NOT NULL
               AND rewarded_count > 0 AND char_length(btrim(reward_note)) >= 12 AND rewarded_at >= closed_at))
);

INSERT INTO article_review_batch_decision (submitter_id, review_day, closed_at, closed_by)
SELECT submitter_id, review_day, max(decided_at), (array_agg(decided_by ORDER BY decided_at DESC))[1]
FROM article_review_request
GROUP BY submitter_id, review_day
HAVING count(*) FILTER (WHERE state = 'PENDING') = 0;
