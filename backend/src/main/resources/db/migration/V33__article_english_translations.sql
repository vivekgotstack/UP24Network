ALTER TABLE article_record ADD COLUMN english_content JSONB;

ALTER TABLE article_record ADD CONSTRAINT article_english_content_shape CHECK (
    english_content IS NULL OR (
        jsonb_typeof(english_content) = 'object'
        AND english_content ?& ARRAY['title', 'summary', 'paragraphs']
        AND jsonb_typeof(english_content->'title') = 'string'
        AND jsonb_typeof(english_content->'summary') = 'string'
        AND jsonb_typeof(english_content->'paragraphs') = 'array'
    )
);
