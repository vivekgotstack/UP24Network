package com.up24.news.article;

import java.time.Instant;
import java.util.List;

/** Public read contract. Other modules may use this without depending on storage. */
public record ArticleView(
        String slug,
        String title,
        String summary,
        String category,
        String city,
        String author,
        Instant publishedAt,
        int readingMinutes,
        String image,
        String imageAlt,
        String videoUrl,
        List<String> paragraphs,
        boolean demo,
        String youtubeId,
        boolean breaking,
        String sourceUrl
) {}
