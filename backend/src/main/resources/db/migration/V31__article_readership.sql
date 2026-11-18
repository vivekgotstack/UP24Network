-- Only article, India calendar date and aggregate count are retained. A hard
-- purge removes the story from reports but leaves historical site totals intact.
CREATE TABLE article_readership_day (
    article_id UUID NOT NULL,
    view_day DATE NOT NULL,
    view_count BIGINT NOT NULL CHECK (view_count > 0),
    PRIMARY KEY (article_id, view_day)
) WITH (fillfactor = 85);

CREATE INDEX article_readership_day_idx ON article_readership_day(view_day, article_id);
