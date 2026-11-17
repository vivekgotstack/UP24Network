-- Every current and previously used slug remains reserved to its report.
CREATE TABLE article_address (
    slug VARCHAR(500) PRIMARY KEY,
    article_id UUID NOT NULL REFERENCES article_record(id) ON DELETE CASCADE
);
CREATE INDEX article_address_report_idx ON article_address(article_id);
INSERT INTO article_address(slug,article_id) SELECT slug,id FROM article_record;
INSERT INTO article_address(slug,article_id)
SELECT snapshot->>'slug',min(article_id::text)::uuid FROM article_revision
WHERE length(snapshot->>'slug') BETWEEN 1 AND 500
GROUP BY snapshot->>'slug' HAVING count(DISTINCT article_id)=1
ON CONFLICT DO NOTHING;
CREATE FUNCTION article_reserve_address() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_id UUID;
BEGIN
    INSERT INTO article_address(slug,article_id) VALUES (NEW.slug,NEW.id)
    ON CONFLICT(slug) DO UPDATE SET slug=EXCLUDED.slug
        WHERE article_address.article_id=EXCLUDED.article_id
    RETURNING article_id INTO owner_id;
    IF owner_id IS NULL THEN
        RAISE unique_violation USING MESSAGE='This article address is already reserved.';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER article_address_trigger AFTER INSERT OR UPDATE OF slug ON article_record
FOR EACH ROW EXECUTE FUNCTION article_reserve_address();
