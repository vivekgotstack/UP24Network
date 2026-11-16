package com.up24.news.article.internal;

import com.up24.news.article.ArticleIndex;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
class JdbcArticleIndex implements ArticleIndex {
    private static final int PAGE_SIZE=1000;
    private final JdbcTemplate jdbc;
    JdbcArticleIndex(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    @Cacheable(cacheNames="article-discovery",key="'sitemap-manifest'",condition="@articleCacheInvalidation.readable()")
    @Override public Manifest manifest() {
        long count=jdbc.queryForObject("SELECT count(*) FROM article_record WHERE status='PUBLISHED' AND published_at<=CURRENT_TIMESTAMP",Long.class);
        return new Manifest(count,(int)Math.min(Integer.MAX_VALUE,(count+PAGE_SIZE-1)/PAGE_SIZE));
    }
    @Cacheable(cacheNames="article-discovery",key="'sitemap-page-' + #page",condition="@articleCacheInvalidation.readable()")
    @Override public List<Entry> page(int page) {
        if(page<1 || page>1_000_000) throw new IllegalArgumentException("Invalid sitemap page.");
        return jdbc.query("""
                SELECT slug,updated_at FROM article_record WHERE status='PUBLISHED' AND published_at<=CURRENT_TIMESTAMP
                ORDER BY published_at,id LIMIT ? OFFSET ?
                """,(row,index)->new Entry(row.getString("slug"),row.getTimestamp("updated_at").toInstant()),PAGE_SIZE,(long)(page-1)*PAGE_SIZE);
    }
}
