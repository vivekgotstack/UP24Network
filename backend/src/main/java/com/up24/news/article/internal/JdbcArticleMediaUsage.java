package com.up24.news.article.internal;

import com.up24.news.article.ArticleMediaUsage;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
class JdbcArticleMediaUsage implements ArticleMediaUsage {
    private final JdbcTemplate jdbc;
    JdbcArticleMediaUsage(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    @Override public boolean inUse(String url) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM article_record WHERE image=? OR video_url=?)
                    OR EXISTS(SELECT 1 FROM article_revision WHERE snapshot->>'image'=? OR snapshot->>'video_url'=?)
                """,Boolean.class,url,url,url,url));
    }
}
