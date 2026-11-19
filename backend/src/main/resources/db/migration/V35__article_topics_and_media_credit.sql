ALTER TABLE article_record
    ADD COLUMN tags text[] NOT NULL DEFAULT '{}',
    ADD COLUMN media_credit varchar(240),
    ADD CONSTRAINT article_tags_bounded CHECK (
        cardinality(tags) <= 8 AND array_position(tags, NULL::text) IS NULL
    );
