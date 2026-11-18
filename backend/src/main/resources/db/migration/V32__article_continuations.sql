-- A series keeps its next edition number even if an edition is purged.
CREATE TABLE article_edition_series (
    root_id UUID PRIMARY KEY,
    root_slug VARCHAR(500) NOT NULL,
    last_edition INTEGER NOT NULL CHECK (last_edition >= 2)
);

ALTER TABLE article_record
    ADD COLUMN edition_number INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN continuation_root_id UUID REFERENCES article_edition_series(root_id),
    ADD COLUMN continuation_of_id UUID,
    ADD CONSTRAINT article_edition_shape CHECK (
        (edition_number = 1 AND continuation_root_id IS NULL AND continuation_of_id IS NULL)
        OR (edition_number >= 2 AND continuation_root_id IS NOT NULL AND continuation_of_id IS NOT NULL
            AND continuation_of_id <> id AND continuation_root_id <> id)
    );

CREATE UNIQUE INDEX article_continuation_edition_idx ON article_record(continuation_root_id, edition_number)
    WHERE continuation_root_id IS NOT NULL;
