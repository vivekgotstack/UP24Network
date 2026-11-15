ALTER TABLE article_record DROP CONSTRAINT article_record_status_check;
ALTER TABLE article_record ADD CONSTRAINT article_record_status_check
    CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED','TRASH'));
ALTER TABLE article_record ADD COLUMN edited_by UUID;
ALTER TABLE article_record ADD COLUMN reading_minutes INTEGER NOT NULL DEFAULT 1 CHECK (reading_minutes > 0);
UPDATE article_record a SET reading_minutes=GREATEST(1,(
    SELECT COALESCE(sum(cardinality(regexp_split_to_array(p,'\s+'))),0)::integer / 180
    FROM jsonb_array_elements_text(a.paragraphs) p
));

CREATE TABLE article_revision (
    article_id UUID NOT NULL REFERENCES article_record(id) ON DELETE CASCADE,
    version BIGINT NOT NULL,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actor_id UUID,
    snapshot JSONB NOT NULL,
    PRIMARY KEY(article_id,version)
);
ALTER TABLE article_record ALTER COLUMN paragraphs SET COMPRESSION lz4;
ALTER TABLE article_revision ALTER COLUMN snapshot SET COMPRESSION lz4;

CREATE TABLE article_suppressed_source (
    upstream_key VARCHAR(100) PRIMARY KEY,
    suppressed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actor_id UUID NOT NULL
);
CREATE TABLE article_activity (
    id UUID PRIMARY KEY,
    article_id UUID NOT NULL,
    action VARCHAR(30) NOT NULL,
    actor_id UUID,
    version BIGINT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX article_activity_article_idx ON article_activity(article_id,occurred_at DESC);
CREATE INDEX article_editorial_desk_idx ON article_record(status,updated_at DESC,id DESC);
CREATE INDEX article_assigned_desk_idx ON article_record(author_id,status,updated_at DESC,id DESC);

CREATE FUNCTION article_capture_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP='UPDATE' AND NEW.version<>OLD.version THEN
        INSERT INTO article_revision(article_id,version,actor_id,snapshot)
        VALUES (OLD.id,OLD.version,NEW.edited_by,to_jsonb(OLD)) ON CONFLICT DO NOTHING;
        -- A bounded history prevents frequently refreshed feeds from growing without limit.
        DELETE FROM article_revision WHERE article_id=OLD.id AND version NOT IN (
            SELECT version FROM article_revision WHERE article_id=OLD.id ORDER BY version DESC LIMIT 20
        );
    END IF;
    IF TG_OP='INSERT' OR NEW.paragraphs IS DISTINCT FROM OLD.paragraphs THEN
        SELECT GREATEST(1,COALESCE(sum(cardinality(regexp_split_to_array(p,'\s+'))),0)::integer / 180)
        INTO NEW.reading_minutes FROM jsonb_array_elements_text(NEW.paragraphs) p;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER article_revision_trigger BEFORE INSERT OR UPDATE ON article_record
FOR EACH ROW EXECUTE FUNCTION article_capture_revision();
