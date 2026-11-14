CREATE INDEX article_category_publication_idx ON article_record(category, published_at DESC, id DESC)
    WHERE status = 'PUBLISHED';
CREATE INDEX article_city_publication_idx ON article_record(lower(trim(city)), published_at DESC, id DESC)
    WHERE status = 'PUBLISHED';
