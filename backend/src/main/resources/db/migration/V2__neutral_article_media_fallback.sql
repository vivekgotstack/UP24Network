ALTER TABLE article_record ALTER COLUMN image SET DEFAULT '/brand/up24-logo.png';
UPDATE article_record SET image='/brand/up24-logo.png' WHERE image='/brand/newsroom-banner.png';
