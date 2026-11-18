CREATE TABLE article_review_notice (
    submitter_id UUID NOT NULL,
    notice_day DATE NOT NULL,
    queued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (submitter_id, notice_day)
);

INSERT INTO automation_job(job_key,name,enabled,interval_minutes,last_result)
VALUES ('review-notices','Daily editorial review notices',TRUE,10,'Waiting for the next scheduled check.');
