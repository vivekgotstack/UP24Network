package com.up24.news.article.internal;

import com.up24.news.article.ArticleMediaUsage;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
class JdbcArticleMediaUsage implements ArticleMediaUsage {
    private final JdbcTemplate jdbc;
    JdbcArticleMediaUsage(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    @Override public boolean inUse(String url) {
        String imageHash=url.matches("^/media/[a-f0-9]{64}\\.webp$")?url.substring(7,71):null;
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM article_record WHERE image_hash=? OR video_url=?)
                    OR EXISTS(SELECT 1 FROM article_revision WHERE snapshot->>'image'=? OR snapshot->>'video_url'=?)
                    OR EXISTS(SELECT 1 FROM article_review_request WHERE state='PENDING'
                        AND (proposed_input->>'image'=? OR proposed_input->>'videoUrl'=?))
                """,Boolean.class,imageHash,url,url,url,url,url));
    }
}
