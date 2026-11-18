ALTER TABLE article_record ADD COLUMN reel_url varchar(120);

ALTER TABLE article_record ADD CONSTRAINT article_instagram_reel_valid CHECK (
    reel_url IS NULL OR (
        category = 'Trending Reels'
        AND reel_url ~ '^https://www[.]instagram[.]com/reel/[A-Za-z0-9_-]{1,64}/$'
        AND video_url IS NULL
        AND youtube_id IS NULL
    )
);
